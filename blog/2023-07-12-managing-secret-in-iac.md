---
slug: secrets-in-iac-terraform
title: Managing Secrets in infrastructure As Code with Terraform
author: Abdulmalik
author_title: AppSec Engineer
author_url: https://twitter.com/saintmalik_
author_image_url: https://saintmalikme.mo.cloudinary.net/img/saintmalik.jpg
image: https://saintmalikme.mo.cloudinary.net/bgimg/iac-terraform-secrets.webp
tags: [secrets, terraform, iac]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Okay you've moved your infrastructure provisioning from visiting the console page and now adopted IaC ( Infrastructure as Code) for provisioning your infrastructure using terraform.

So along the way you discovered that you will be needing some sensitive credentials like github token to use with aws amplify, datadog api and key deployments?

<!--truncate-->

well there are various approach to getting the secrets to our IaC, and the first approach i believe you would want to use, is putting the api keys in your codes as variables which is actually a bad approach.

the next approach i believe you want to use is setting an empty variable and passing the values via cli just like this.

```yaml title="variables.tf"
variable "githubtoken" {
   description = "github token"
   type = string
}
```

And then pass the value using **export TF_VAR_githubtoken=xxxxxxxx**

As times goes on, you will notices this process isnt so healthy because you are burdened to always keep the secret some where on your work laptop and also the need to always reexport those variables, having them in your shell history too.

But you can always solve this issue using AWS SSM Parameter Store, and it makes more sense if your Infrastructure is on AWS already.

So lets jump into it;

### 👉 Create Secrets in Parameter Store

First you would need to create the secret value on the Secret Parameter Store via your aws console or aws cli

```bash
aws ssm put-parameter --name /staging/terraform/githubtoken --value ghp_xxxxxxx --type SecureString --region AWS_REGION_VALUE
```

The above command would create your secrets in the parameter store, likewise you can create it via the was console too.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/parameterstore.webp`} alt="parameter store aws console"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/parameterstore.jpg`} alt="parameter store aws console"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/parameterstore.jpg`} alt="parameter store aws console"/>
</picture>

Once you are done with the adding your secrets, you need to get it back to use wherewe need it, which is in our terraform code.

### 👉 Use secrets in terraform

Now, you have to retrieve the secret we've created earlier in the parameter store using the following terraform code.

```yaml title="main.tf"
data "aws_ssm_parameter" "github_token" {
  name = "/staging/terraform/githubtoken"
}
```

You will now have to pass the value from the secret data source for parameter store recreation, instead of passing the value straight to the service needing the secret.

The reason for this is to try and seperate how the service access the secrets, so a recreation of that parameter store value will serve as a procedural process, so if the secrets were not available, an error will be thrown.

```yaml title="main.tf"
resource "aws_ssm_parameter" "staging_github_token" {
  name = "/staging/terraform/github_token"
  value = data.aws_ssm_parameter.github_token.value // depending on value of data source from above code
  type = "SecureString"
}
```

Now let's put the secret to we've recreated to use by calling it via data source and pass it into the resource that needs it.

```yaml title="main.tf"
data "aws_ssm_parameter" "staging_github_token" {
  name = "/staging/terraform/github_token"
}

resource "resource_that_need_secret" "secret_needed_here" {
  access_token = data.aws_ssm_parameter.staging_github_token.value
}
```
### 👉 Using the secrets with terraform provider

Bet you want to pass the secret to the provider too just like you did with resources, but definately it won't work, because dependencies in terraform doesnt work with providers in terraform yet.

```yaml title="provider.tf"
data "aws_ssm_parameter" "staging_github_token" {
  name = "/staging/terraform/github_token"
}

provider "github" {
  token = data.aws_ssm_parameter.staging_github_token.value
}
```

So how would you go about it? you will have to create a seperate terraform deployment and make the value from the parameter store data source as an output value alongside using the sensitive value as ```true```, because thats a secret we dont want to make public.

```yaml title="another_deployment.tf"
data "aws_ssm_parameter" "staging_github_token" {
  name = "/staging/terraform/github_token"
}

output "staging_github_token" {
  value = data.aws_ssm_parameter.staging_github_token.value
  sensitive = true
}
```

Now it's time to pass the value to the provider that needs it, which is your deployment that has a provider that needs github token value.

```yaml title="deployment_provider.tf"
data "terraform_remote_state" "another_deployment" {
  // put your terraform state backend config here
}

provider "github" {
  token = data.terraform_remote_state.another_deployment.staging_github_token.value
}
```

That's all for now, I hope you've learned something useful from this blog about secret management in IaC with terraform.

Till next time ✌️

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
