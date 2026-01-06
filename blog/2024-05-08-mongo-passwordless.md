---
slug: mongodb-passwordless-auth-eks
title: MongoDB Passwordless Authentication on AWS EKS using IAM Role
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/vamos.jpeg
tags: [aws, eks, containers]
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

best bet, you are not rotating your password and tokens across your infrastructure and deployment but if the software you use has the passwordless authentication option and it's stable why not go for it?

<!--truncate-->

The burden of a long-lasting password sitting on your server is a thing, you never can say, a static password to the DB isn't a good option at all.

So let's escape the burden by going passwordless and using the Identity Authority Management (IAM) Role to connect to our MongoDB cluster on our application that is sitting on AWS EKS.

## Prerequisites:

- A Running AWS EKS Cluster provisioned using terraform
- Either Go or NodeJS app using MongoDB

## Step 1: Create an IAM Role for Service Account (IRSA)

You need to first create the IAM Role for Service Account (IRSA) that will be used by your application to connect to our MongoDB cluster. This role will be used to grant permissions to our application to access our MongoDB cluster.

```hcl title="main.tf"
module "mongodb_irsa_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  role_name = "passwordless-mongo"
  oidc_providers = {
    ex = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["YOUR APP NAMESPACE:YOUR APP SERVICE ACCOUNT NAME"] // e.g. ["default:invoicing-app"]
    }
  }
}
```
Once this is done, the next thing is to create a Kubernetes service account, which we have associated with the IAM Role created above.

```hcl title="main.tf"
resource "kubernetes_service_account_v1" "invoicing-app" {
  metadata {
    name      = "invoicing-app"
    namespace = "default"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.mongodb_irsa_role.iam_role_arn
    }
  }
}
```

## Step 2: Adding the IAM Role to the MongoDB Project

The next step is to add the IAM Role to the MongoDB Database Authorized users. This will allow the IAM Role to access the MongoDB cluster.

To do this, you need to navigate to the MongoDB project and click on the `Security` tab, go to <a href="https://cloud.mongodb.com/v2/security/database/users" target="_blank">Database Access</a>.

Then click on the `Add New Database User` button.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/mongodbadd.webp`} alt="passwordless mongodb"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/mongodbadd.png`} alt="passwordless mongodb"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/mongodbadd.png`} alt="passwordless mongodb"/>
</picture>

In the `Add New Database User` modal, select the Authentication Method, `AWS IAM` and drop down the `AWS IAM Type` option and select `IAM Role`, fill in the `IAM Role ARN` field with the IAM Role ARN that was created earlier. Then click on the `Add User` button.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/mongodbiam.webp`} alt="passwordless mongodb add iam role"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/mongodbiam.png`} alt="passwordless mongodb add iam role"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/mongodbiam.png`} alt="passwordless mongodb add iam role"/>
</picture>

Once this is done, it's set up your app to connect to the MongoDB cluster using passwordless authentication.

## Step 3: Setting up MongoDB connection using passwordless authentication in your app

### Golang App

To establish the connection to your MongoDB cluster using passwordless authentication, you need to set and add the service account that you created earlier to your golang deployment yaml file in the EKS

```yaml title="go-eks-deployment.yaml"
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
      serviceAccountName: invoicing-app
      containers:
      - image: docker.io/library/busybox:1.22
        name: invoicing
        command:
          ['go', 'run', 'main.go']
        ports:
        - containerPort: 7070
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

Adding the service account `serviceAccountName: invoicing-app` to the golang deployment yaml file will grant the application pod access to env variables like AWS_WEB_IDENTITY_TOKEN_FILE, AWS_ROLE_ARN and AWS_REGION. These variables are needed to establish a connection to the MongoDB cluster.

So now inside your Golang app, you can use the `AWS_WEB_IDENTITY_TOKEN_FILE` env variable to connect to your MongoDB cluster.

```go title="main.go"
func init() {

   // safe check for the AWS_WEB_IDENTITY_TOKEN_FILE since it's a required env
    tokenFile, ok := os.LookupEnv("AWS_WEB_IDENTITY_TOKEN_FILE")
    if !ok || tokenFile == "" {
        fmt.Println("AWS_WEB_IDENTITY_TOKEN_FILE must be defined")
        os.Exit(1)
    }

    envVariablesCredential := options.Credential{
        AuthMechanism: "MONGODB-AWS",
    }
    envVariablesClient, err := mongo.Connect(
        context.TODO(),
        options.Client().SetAuth(envVariablesCredential))
    if err != nil {
        panic(err)
    }
    _ = envVariablesClient
    fmt.Println("Connected to MongoDB!")
}

```

### NodeJS App

For NodeJS Apps, there are actually many ways of getting this done, but you might just be having downtimes due to 403 errors like ["MongoError: bad auth: aws sts call has response 403"](https://blog.saintmalik.me/docs/mongo/)

This error occurs because the credentials MongoDB is using to re-establish the connection are wrong or have expired, digging deep into the error fix might get this article to be longer than expected, the fix works but is not so clean.

So I will just share the method I tried that works well, and it's using the `@aws-sdk/credential-providers` package.

you need to install both `@aws-sdk/credential-providers`,  `aws4` and `mongodb` packages using `yarn add @aws-sdk/credential-providers aws4 mongodb`

```js title="index.js"
import dotEnv from 'dotenv';
import { fromTokenFile } from "@aws-sdk/credential-providers";
import { MongoClient } from 'mongodb';

dotEnv.config();
mongodbConnection();

async function mongodbConnection() {
  if (!process.env.AWS_WEB_IDENTITY_TOKEN_FILE) {
    throw new Error('AWS_WEB_IDENTITY_TOKEN_FILE must be defined');
  }

  if (!process.env.AWS_ROLE_ARN) {
    throw new Error('AWS_ROLE_ARN must be defined');
  }

  if (!process.env.MONGODB_SESSION_NAME) {
    throw new Error('ROLE_SESSION_NAME must be defined');
  }

  if (!process.env.AWS_REGION) {
    throw new Error('AWS_DEFAULT_REGION must be defined');
  }

  const { webIdentityTokenFile, roleArn, SessionName, mongoClusterUrl, clientConfig } = {
    webIdentityTokenFile: process.env.AWS_WEB_IDENTITY_TOKEN_FILE,
    roleArn: process.env.AWS_ROLE_ARN,
    mongodbSessionName: process.env.MONGODB_SESSION_NAME,
    mongodbClusterUrl: process.env.MONGODB_CLUSTER_URL,
    clientConfig: {
      region: process.env.AWS_REGION,
    },
  };

  const credentials = fromTokenFile({
    webIdentityTokenFile,
    roleArn,
    mongodbSessionName,
    mongodbClusterUrl,
    clientConfig,
  });


  let uri =
  `mongodb+srv://${mongodbClusterUrl}/?authSource=%24external&authMechanism=MONGODB-AWS`;

 const client = new MongoClient(uri);
}
```

The `mongodbSessionName` value we used here is optional, but it's better to use it, so you can easily identify the session that belongs to your app from the mongodb logs.

That's it, you have successfully connected your app to your MongoDB cluster using passwordless authentication. You can redeploy your app to your EKS cluster and test it out.

also note in the nodejs example we used **aws-sdk/credential-providers**, which by default allows the driver to use any shared AWS credentials file or a config file in your environment, the driver will use those credentials by default.

So it's better not to see any new aws variable in your env, to avoid conflicts of credentials.

Till next time, Peace be on you 🤞🏽

#### References
- https://www.mongodb.com/docs/drivers/go/current/
- https://www.mongodb.com/docs/atlas/security/passwordless-authentication/#aws-eks
- https://www.mongodb.com/docs/drivers/go/current/fundamentals/auth/#std-label-golang-mongodb-aws
- https://www.mongodb.com/docs/drivers/node/current/fundamentals/authentication/mechanisms/#mongodb-aws
- https://www.npmjs.com/package/@aws-sdk/credential-providers?activeTab=readme#fromtokenfile

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