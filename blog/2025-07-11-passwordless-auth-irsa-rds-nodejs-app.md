---
slug: rds-db-passwordless-auth-eks
title: RDS DB Passwordless Authentication on AWS EKS using IAM Role Service Account
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/passwordless-rds.png
tags: [aws, eks, containers]
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

In 2025, are you still embedding RDS database passwords in your app? If your software supports stable passwordless authentication, switch to it. It’s more secure and simplifies credential management.

<!--truncate-->
<picture>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/think-pawpaw.gif`} alt="passwordles rds iam"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/think-pawpaw.gif`} alt="passwordles rds iam"/>
</picture>

Static passwords on servers are risky. Instead, use IAM roles for passwordless authentication to connect your AWS EKS-hosted app to your RDS cluster, reducing security burdens.

## Prerequisites:

- A Running AWS EKS Cluster provisioned using Opentofu
- Your Typescript app using RDS DB

## Step 1: Grant RDS IAM Permissions to the DB User

At first you need to connect to your RDS PostgreSQL instance as with the db user and password and execute the following SQL commands to either grant rds iam permission to the existing create the `invoicingdbuser` user and grant necessary permissions.

```sql title="rds-iam-permissions.sql"
-- Grant RDS IAM Authentication to the existing user
GRANT rds_iam TO invoicingdbuser;

-- Create the invoicingdbuser user and grant necessary permissions
CREATE USER "invoicingdbuser";

-- Grant IAM authentication role to invoicingdbuser
GRANT rds_iam TO "invoicingdbuser";

-- Grant all privileges on the invoicingdb database to invoicingdbuser
GRANT ALL ON DATABASE invoicingdb TO "invoicingdbuser";
```

## Step 2: Create an IAM Role for Service Account (IRSA)

You need to first create the IAM Role for Service Account (IRSA) that will be used by your application to connect to our RDS DB cluster. This role will be used to grant permissions to our application to access our RDS DB cluster.

```hcl title="main.tf"
module "rds_db_irsa_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  role_name = "passwordless-rds-db"
  oidc_providers = {
    ex = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["YOUR APP NAMESPACE:YOUR APP SERVICE ACCOUNT NAME"] // e.g. ["default:invoicingapp"]
    }
  }
}
```

Now attach the IAM Role to the policy to allow the service account to communicate with the RDS DB cluster.

```hcl title="main.tf"
resource "aws_iam_role_policy" "connect_rds_invoicingapp" {
  role = module.rds_db_irsa_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "rds-db:connect"
        Resource = [
          "arn:aws:rds-db:${var.region}:${var.account_id}:dbuser:${var.rds_cluster_id}/invoicingdbuser"
        ]
      }
    ]
  })
}
```
Once this is done, the next thing is to create a Kubernetes service account, which we have associated with the IAM Role created above.

```hcl title="main.tf"
resource "kubernetes_service_account_v1" "invoicing-app" {
  metadata {
    name      = "invoicingapp"
    namespace = "default"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.rds_db_irsa_role.iam_role_arn
    }
  }
}
```

## Step 3: Setting up RDS DB connection using passwordless authentication in your app

### Typescript App

You will need to install the following dependencies `@types/pg @aws-sdk/rds-signer dotenv async-retry`

```js title="src/config.ts"
import dotenv from 'dotenv';

dotenv.config();

interface Config {
  PORT: string;
  RDS_HOST: string;
  RDS_PORT: string;
  RDS_DATABASE: string;
  RDS_USER: string;
  AWS_REGION: string;
}

const requiredEnv: (keyof Config)[] = ['PORT', 'RDS_HOST', 'RDS_PORT', 'RDS_DATABASE', 'RDS_USER', 'AWS_REGION'];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`${key} must be defined`);
  }
});

const config: Config = {
  PORT: process.env.PORT!,
  RDS_HOST: process.env.RDS_HOST!,
  RDS_PORT: process.env.RDS_PORT!,
  RDS_DATABASE: process.env.RDS_DATABASE!,
  RDS_USER: process.env.RDS_USER!,
  AWS_REGION: process.env.AWS_REGION!,
};

export default config;
```

Then create the signer.ts file in the src folder that handles the token and token refresh logic.

```js title="src/signer.ts
import { Signer } from '@aws-sdk/rds-signer';
import config from './config';

const intervalSeconds = 600; // Refresh token every 10 minutes

interface Token {
  value: string;
  issuedAt: number;
}

let token: Token | null = null;

const signer = new Signer({
  hostname: config.RDS_HOST,
  port: Number(config.RDS_PORT),
  username: config.RDS_USER,
  region: config.AWS_REGION,
});

async function getAuthToken(): Promise<string> {
  console.log('Issuing new token...');
  const newToken = await signer.getAuthToken();
  console.log('New token issued');
  return newToken;
}

async function getToken(): Promise<string> {
  const now = Date.now();
  if (!token || now - token.issuedAt > 14 * 60 * 1000) { // Refresh if token older than 14 minutes
    const value = await getAuthToken();
    token = { value, issuedAt: now };
  }
  return token.value;
}

function refreshToken(): void {
  setInterval(async () => {
    try {
      const value = await getAuthToken();
      token = { value, issuedAt: Date.now() };
    } catch (error) {
      console.error('Error issuing token:', error);
    }
  }, intervalSeconds * 1000);
}

refreshToken();

export { getToken };
```


```js title="src/index.ts
import express, { Express, Request, Response } from 'express';
import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import retry from 'async-retry';
import config from './config';
import { getToken } from './signer';

let pool: Pool;

async function initializePool(): Promise<void> {
  console.log('Initializing pool...');
  pool = new Pool({
    host: config.RDS_HOST,
    port: Number(config.RDS_PORT),
    database: config.RDS_DATABASE,
    user: config.RDS_USER,
    password: await getToken(),
    ssl: {
      rejectUnauthorized: true,
      ca: fs.readFileSync('rds-ca-root.pem'),
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  console.log('Pool initialized');
}

async function startApp(): Promise<void> {
  await retry(
    async () => {
      await initializePool();
    },
    { retries: 3, minTimeout: 1000 }
  );

  const app: Express = express();

  app.get('/', (req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  app.get('/passwordlessdump', async (req: Request, res: Response) => {
    console.log('/passwordlessdump');
    try {
      await retry(
        async () => {
          const client: PoolClient = await pool.connect();
          try {
            const tableQuery = `
              SELECT table_name
              FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE';
            `;
            const tableResult = await client.query(tableQuery);
            const tables = tableResult.rows.map(row => row.table_name);

            if (tables.length === 0) {
              res.status(404).json({ message: 'No tables found in the invoicing database (public schema)' });
              return;
            }

            const dump: { [tableName: string]: any[] } = {};
            for (const table of tables) {
              const result = await client.query(`SELECT * FROM ${table}`);
              dump[table] = result.rows;

              await fs.promises.writeFile(`${table}_dump.json`, JSON.stringify(result.rows, null, 2));
              console.log(`Dumped table ${table} to ${table}_dump.json (${result.rowCount} rows)`);
            }

            res.json({
              message: 'Dumped all tables',
              tables: tables,
              data: dump,
            });
          } finally {
            client.release();
          }
        },
        { retries: 3, minTimeout: 1000 }
      );
    } catch (error) {
      console.error('Error dumping tables:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  const server = app.listen(Number(config.PORT), () => {
    console.log(`Server running on port ${config.PORT}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      pool.end().then(() => {
        console.log('Server and pool shut down gracefully');
        process.exit(0);
      });
    });
  });
}

startApp().catch((error) => {
  console.error('Error starting app:', error);
  process.exit(1);
});
```

That's it, you have successfully connected your app to your RDS DB cluster using passwordless authentication. You can redeploy your app to your EKS cluster and test it out.

To establish the connection to your RDS DB cluster using passwordless authentication, you need to set and add the service account that you created earlier to your typescript app deployment yaml file in the EKS

### Deployment Yaml in EKS

```yaml title="rds-eks-deployment.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: invoicing
  name: invoicing
spec:
  selector:
    matchLabels:
      app: invoicing
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: invoicing
    spec:
      serviceAccountName: invoicingapp
      containers:
      - image: invoicingapp:latest
        name: invoicing
        command:
          ['node', 'dist/index.js']
        ports:
        - containerPort: 7070
        env:
            - name: PORT
              value: "3000"
            - name: RDS_HOST
              value: Put your RDS DB cluster endpoint here
            - name: RDS_PORT
              value: Put your RDS DB cluster port
            - name: RDS_DATABASE
              value: invoicingdb
            - name: RDS_USER
              value: invoicingdbuser
---
apiVersion: v1
kind: Service
metadata:
  name: invoicing-service
spec:
  type: NodePort
  selector:
    app: invoicing
  ports:
    protocol: TCP
    port: 8080
    targetPort: 7070
```

Till next time, Peace be on you 🤞🏽

#### References
- https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.AWSCLI.PostgreSQL.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.IAMPolicy.html

<br/>
<h2>Comments</h2>
<Giscus
id="comments"
repo="saintmalik/blog.saintmalik.me"
repoId="MDEwOlJlcG9zaXRvcnkzOTE0MzQyOTI="
category="General"
categoryId="DIC_kwDOF1TQNM4CQ8lN"
mapping="title"
term="Comments"
reactionsEnabled="1"
emitMetadata="0"
inputPosition="top"
theme="preferred_color_scheme"
lang="en"
loading="lazy"
crossorigin="anonymous"
    />