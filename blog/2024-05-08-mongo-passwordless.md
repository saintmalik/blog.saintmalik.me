---
slug: mongodb-passwordless-auth-eks
title: MongoDB Passwordless Authentication on AWS EKS using IAM Role
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/vamos.jpeg
tags: [aws, eks, containers]
---

import Giscus from "@giscus/react";

Best bet, you are not rotating your password and tokens across your infra's and deployment so when the softwares you use has the passwordless authentication option and its stable why not go for it?

<!--truncate-->

The burden of a long lasting password sitting on your server is a thing, you never can say, a static password to the DB isnt a good option at all.

So let's escape the burden by going passwordless and using IAM Role to connect to our MongoDB cluster on our applications thats sitting on AWS EKS.

## Prerequisites:

- A Running AWS EKS Cluster provisioned using terraform
- Either Go or NodeJS app using MongoDB

## Step 1: Create an IAM Role for Service Account (IRSA)

You need to first create the IAM Role for Service Account (IRSA) that will be used by your application to connect to our MongoDB cluster. This role will be used to grant permissions to our application to access our MongoDB cluster.

```hcl title="main.tf"
module "s3_irsa_role" {
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


```go title="main.go"
export AWS_WEB_IDENTITY_TOKEN_FILE=<absolute path to file containing your OIDC token> # e.g. /var/run/secrets/eks.amazonaws.com/serviceaccount/token
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
```


Well, that's it, folks! I hope you find this piece insightful and helpful.

Till next time ✌️

#### References
- https://www.mongodb.com/docs/drivers/go/current/
- https://www.mongodb.com/docs/atlas/security/passwordless-authentication/#aws-eks


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