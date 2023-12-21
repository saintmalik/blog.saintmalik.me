---
slug: s3-eks-nodejs-app
title: Securing the Connection from NodeJS App on EKS to S3
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/vamos.jpeg
tags: [aws, eks, containers]
---

import Giscus from "@giscus/react";

You have your app deployed on an EC2 instance via nodes on EKS and this app needs to access/interact with files stored in an Amazon S3 bucket.

<!--truncate-->

Originally, you would want to create an s3 iam users with minimal policies to acess the S3, now you have more responsibilities, having to worry about the secret keys, making sure it doesnt leak, making sure even if someone have access, there is a log or monitoring process to see if the key has been compromised.

But why bear all this responsibilities when your app can still do all it needs without the credential keys and just fallback to using IAM Role Access.

If you are working with EKS, it's pretty easy to setup IRSA (IAM Roles for Service Accounts), this way you can provision and rotate the IAM temporary credentials (called a Web Identity) which the Kubernetes ServiceAccount you've mounted into your node pods can use to call AWS APIs.

## Prerequisite

- Terraform provisioned EKS Cluster

So Lets jump into it;

## Setting Up EKS IRSA for your NodeJs Pods

### 👉 Step 1: You want to setup your S3 Access Policy

You can declare how you streamline your policy here,

```yaml title="keylessnodes3.tf"
resource "aws_iam_policy" "s3eksnodejs-access" {
  name   = "s3eksnodejs"
  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3NodeJSEKS",
            "Effect": "Allow",
            "Action": [
                "s3:*"
            ],
            "Resource": [
                "arn:aws:s3:::YOURS3BUCKETNAME",
                "arn:aws:s3:::YOURS3BUCKETNAME/*"
            ]
        }
    ]
}
EOF
}
```

### 👉 Step 2: Creating EKS IRSA,

here, you will create the EKS IRSA by attaching the policy you created above alongside your EKS Open ID Connect, your nodejs app namespace and the ServiceAccount you want to attach to your app pod.

```yaml title="keylessnodes3.tf"
module "s3eksnodejs_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name = "s3eksnodejs"

  role_policy_arns = {
    policy = aws_iam_policy.s3eksnodejs.arn
  }

  oidc_providers = {
    ex = {
      provider_arn               = module.eks.oidc_provider_arn //YOUR EKS OIDC ARN
      namespace_service_accounts = ["YOURAPPNAMESPACENAME:s3eksnodejs"]
    }
  }
}
```

### 👉 Step 3: Creating your ServiceAccount

You create your ServiceAccount with an annotation of the IAM Role you created above

```yaml title="keylessnodes3.tf"
resource "kubernetes_service_account_v1" "s3eksnodejs" {
  metadata {
    name      = "s3eksnodejs"
    namespace = "default"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.s3eksnodejs_role.iam_role_arn
    }
  }
}
```

## Prepping your app and deploying to EKS


### 👉 Step 4: Prep your code and remove the credentials

You can start by removing your codes that calls for AWS credential keys.

Here is a sample of the usage with the aws-sdk/client-s3 v3. listing objects in your s3 using crendentials keys.

```js title="app.js"
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: 'AWSREGION',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// Function to list objects (images) in an S3 bucket
const listObjectsInBucket = async (bucketName) => {
  const params = {
    Bucket: bucketName
  };

  try {
    const data = await s3Client.send(new ListObjectsV2Command(params));
    if (data.Contents.length > 0) {
      console.log("Objects in the bucket:");
      data.Contents.forEach(obj => {
        console.log(obj.Key);
      });
    } else {
      console.log("The bucket is empty.");
    }
  } catch (error) {
    console.error("Error listing objects:", error);
  }
};

// Define your S3 bucket name
const bucketName = 'YOURS3BUCKETNAME';

listObjectsInBucket(bucketName);
```

so what will your code looks like when you removethe credentials you are calling from env?

```js title="nocredsapp.js"
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: 'AWSREGION',
});

// Function to list objects (images) in an S3 bucket
const listObjectsInBucket = async (bucketName) => {
  const params = {
    Bucket: bucketName
  };

  try {
    const data = await s3Client.send(new ListObjectsV2Command(params));
    if (data.Contents.length > 0) {
      console.log("Objects in the bucket:");
      data.Contents.forEach(obj => {
        console.log(obj.Key);
      });
    } else {
      console.log("The bucket is empty.");
    }
  } catch (error) {
    console.error("Error listing objects:", error);
  }
};

// Define your S3 bucket name
const bucketName = 'YOURS3BUCKETNAME';

listObjectsInBucket(bucketName);
```

Thats it, now you are left with the responsibility of making sure your running pod for the app has the ServiceAccount with the iam role mounted.

Doing that isnt hard, in your existing YAML file, just add ```serviceAccountName: s3eksnodejs``` to the spec, just like the below example

```yaml title="deploy.yaml"
    spec:
      serviceAccountName: s3eksnodejs
      containers:
      - image: busybox
```

Well, that's it, folks! I hope you find this piece insightful and helpful.

Till next time ✌️

#### References
- https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-node-credentials-iam.html

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