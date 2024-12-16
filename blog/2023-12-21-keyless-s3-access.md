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

## The Problem with Traditional S3 Access

Let's be real – managing AWS access keys is a pain. We've all been there:
- Creating IAM users
- Managing secret keys
- Worrying about key rotation
- Setting up leak detection
- Monitoring for suspicious access
- The constant anxiety about credentials showing up on GitHub 😅

But here's the thing: **you don't need any of that**. Enter IAM Roles for Service Accounts (IRSA) – your ticket to credential-free S3 access from EKS.

## What We're Building

We'll set up a secure, credential-free connection between your NodeJS app running on EKS and an S3 bucket. The best part? It uses temporary credentials that rotate automatically. No more key management headaches!

### Prerequisites
- An EKS cluster (provisioned with Terraform)
- Basic understanding of Kubernetes and AWS
- Your favorite beverage ☕

So Let's jump into it;

## Setting Up EKS IRSA for your NodeJs Pods

### 👉 1. Create Your S3 Access Policy

First up, we need to define what your app can actually do with S3. Here's a Terraform configuration that sets up the necessary permissions:

```hcl
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
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
EOF
}
```

Pro tip: In production, you might want to narrow down those S3 permissions. The `s3:*` wildcard is great for testing but maybe a bit too permissive for prod!

### 👉 2. Set Up IRSA

Now for the magic part – connecting EKS to IAM:

```hcl title="keylessnodes3.tf"
module "s3eksnodejs_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name = "s3eksnodejs"

  role_policy_arns = {
    policy = aws_iam_policy.s3eksnodejs.arn
  }

  oidc_providers = {
    ex = {
      provider_arn               = module.eks.oidc_provider_arn //YOUR EKS OIDC ARN
      namespace_service_accounts = ["your-namespace:s3eksnodejs"]
    }
  }
}
```

### 👉 3. Create the Kubernetes Service Account

This is where we link everything together:

```hcl title="keylessnodes3.tf"
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

## The Fun Part: Your NodeJS Code

Here's where you'll see the real beauty of this setup. Remember your old S3 client code with all those credentials? Let's compare:

### Before (The Old Way) 🙈
```javascript title="app.js"
const s3Client = new S3Client({
  region: 'AWSREGION',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
```

### After (The Better Way) 🚀
```javascript title="nocredsapp.js"
const s3Client = new S3Client({
  region: 'AWSREGION',
  // That's it. Really.
});
```

Yep, that's all you need! The AWS SDK will automatically pick up the credentials from the pod's IAM role. Pretty neat, right?

Here's a complete example that lists objects in your bucket:

```javascript title="nocredsapp.js"
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: 'AWSREGION',
});

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

const bucketName = 'your-bucket-name';
listObjectsInBucket(bucketName);
```

## The Final Touch: Update Your Deployment

Don't forget to tell your pods to use the new service account! Add this ```serviceAccountName: s3eksnodejs``` to your deployment spec YAML:

```yaml title="deploy.yaml"
spec:
  serviceAccountName: s3eksnodejs
  containers:
  - name: your-app
    image: your-image
```

## Wrapping Up

And there you have it! A secure, maintainable way to access S3 from your EKS pods without managing a single access key. Your DevOps team will thank you, your security team will love you, and you'll sleep better at night knowing there are no credentials to leak.

Well, that's it, folks! I hope you find this piece insightful and helpful.

Till next time 🤞🏽

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