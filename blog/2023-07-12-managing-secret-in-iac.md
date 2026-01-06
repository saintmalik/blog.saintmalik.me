---
slug: secrets-in-iac-terraform
title: Managing Secrets in Infrastructure As Code with Terraform
authors: Saintmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/iac-terraform-secrets.webp
tags: [secrets, terraform, iac]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Okay, you've moved your infrastructure provisioning from visiting the console page and now adopted IaC ( Infrastructure as Code) for provisioning your infrastructure using Terraform.

So along the way, you discovered that you will need some sensitive credentials like GitHub token to use with aws amplify, datadog API and key deployments?

<!--truncate-->

well, there are various approaches to getting the secrets to our IaC, and the first approach I believe you would want to use is putting the API keys in your codes as variables which is a bad approach.

the next approach I believe you want to use is setting an empty variable and passing the values via CLI just like this.

```yaml title="variables.tf"
variable "githubtoken" {
   description = "github token"
   type = string
}
```

And then pass the value using **export TF_VAR_githubtoken=xxxxxxxx**

As time goes on, you will notice this process isn't so healthy because you are burdened to always keep the secret somewhere on your work laptop and also the need to always reexport those variables, having them in your shell history too.

But you can always solve this issue using AWS SSM Parameter Store, and it makes more sense if your Infrastructure is on AWS already.

So let's jump into it;

### 👉 Create Secrets in the Parameter Store

First, you would need to create the secret value on the Secret Parameter Store via your aws console or aws cli

```bash
aws ssm put-parameter --name /staging/terraform/githubtoken --value ghp_xxxxxxx --type SecureString --region AWS_REGION_VALUE
```

The above command would create your secrets in the parameter store, likewise, you can create it via the was console too.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/parameterstore.webp`} alt="parameter store aws console"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/parameterstore.jpg`} alt="parameter store aws console"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/parameterstore.jpg`} alt="parameter store aws console"/>
</picture>

Once you are done with adding your secrets, you need to get it back to use where you need it, which is in our terraform code.

### 👉 Use secrets in Terraform

Now, you have to retrieve the secret you created earlier in the parameter store using the following terraform code.

```yaml title="main.tf"
data "aws_ssm_parameter" "github_token" {
  name = "/staging/terraform/githubtoken"
}
```

You will now have to pass the value from the secret data source for parameter store recreation, instead of passing the value straight to the service needing the secret.

The reason for this is to try and separate how the service accesses the secrets, so a recreation of that parameter store value will serve as a procedural process, so if the secrets are not available, an error will be thrown.

```yaml title="main.tf"
resource "aws_ssm_parameter" "staging_github_token" {
  name = "/staging/terraform/github_token"
  value = data.aws_ssm_parameter.github_token.value // depending on value of data source from above code
  type = "SecureString"
}
```

Now let's put the secret we've recreated to use by calling it via data source and passing it into the resource that needs it.

```yaml title="main.tf"
data "aws_ssm_parameter" "staging_github_token" {
  name = "/staging/terraform/github_token"
}

resource "resource_that_need_secret" "secret_needed_here" {
  access_token = data.aws_ssm_parameter.staging_github_token.value
}
```
### 👉 Using the secrets with terraform provider

Bet you want to pass the secret to the provider too just like you did with resources, but definately it won't work, because dependencies in Terraform don't work with providers in Terraform yet.

```yaml title="provider.tf"
data "aws_ssm_parameter" "staging_github_token" {
  name = "/staging/terraform/github_token"
}

provider "github" {
  token = data.aws_ssm_parameter.staging_github_token.value
}
```

So how would you go about it? you will have to create a separate terraform deployment and make the value from the parameter store data source as an output value alongside using the sensitive value as ```true```, because that's a secret we don't want to make public.

```yaml title="another_deployment.tf"
data "aws_ssm_parameter" "staging_github_token" {
  name = "/staging/terraform/github_token"
}

output "staging_github_token" {
  value = data.aws_ssm_parameter.staging_github_token.value
  sensitive = true
}
```

Now it's time to pass the value to the provider that needs it, which is your deployment that has a provider that needs GitHub token value.

```yaml title="deployment_provider.tf"
data "terraform_remote_state" "another_deployment" {
  // put your terraform state backend config here
}

provider "github" {
  token = data.terraform_remote_state.another_deployment.staging_github_token.value
}
```

That's all for now, I hope you've learned something useful from this blog about secret management in IaC with Terraform.

Till next time 🤞🏽

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
