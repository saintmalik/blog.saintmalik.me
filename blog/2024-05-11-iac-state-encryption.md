---
slug: iac-security-with-state-file-encryption
title: Enhanced IaC Security with State File Encryption Using OpenTofu
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/encryption.webp
tags: [IaC, opentofu, encryption]
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

I must say you shouldn't bet against open-source software, even when Terraform was still open-source, the ability to have state encryption was not available but was available on their Terraform cloud.

<!--truncate-->

The community requested it, but it never came, but thanks to OpenTofu, the open-source fork of Terraform, you can now encrypt your IaC state and plan.

This is so great for security, especially when you have sensitive data in your state file, like secrets, passwords, and other sensitive data.

Wondering how we were handling secrets, API keys, and other sensitive data in our state file before now? haha, I wrote a guide on <a href="https://blog.saintmalik.me/secrets-in-iac-terraform/" target="_blank">Managing Secrets in Infrastructure As Code with Terraform</a>, you can check it out.

But now, we can encrypt our state file and plan using OpenTofu. Let's see how we can do that.

For you to use the state and plan encryption, your IaC project must be using OpenTofu, if you are still using Terraform, then follow the <a href="https://opentofu.org/docs/intro/migration/" target="_blank">Opentofu migration guide</a> to migrate.

If you are using OpenTofu, then you are good to go. Let's see how we can enable state and plan encryption.

## Enabling State and Plan Encryption For Existing Project

I want to believe you have an existing project, and you want to enable state and plan encryption, your project state is unencrypted but now you are about to encrypt it

1. First, you need to create a new key, which will be used to encrypt your state and plan, at the moment OpenTofu supports just four key providers, AWS KMS, GCP KMS, PBKDF2 and OpenBao (a fork of Hashicorp Vault).

I will be using AWS KMS here, so if you are using AWS KMS too, head over to your console and create a new key, if you are using GCP KMS, do the same, and if you are using PBKDF2 or OpenBao, you can skip this step.

2. Once you have created your KMS Key, you need to get the key ID, it looks something like this `0xxxxxx0-xxxx-xxxxx-xxxx-xexxxxxx`, if you have the KMS key ID, add the following syntax to your OpenTofu provider block, just like this.

```hcl
terraform {
  encryption {
    method "unencrypted" "migrate" {}

    key_provider "aws_kms" "basic" {
      kms_key_id = "0xxxxxx0-xxxx-xxxxx-xxxx-xexxxxxx"
      region     = "KMS KEY REGION"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "method" {
      keys = key_provider.aws_kms.basic
    }

    state {
      method = method.aes_gcm.method
      fallback {
        method = method.unencrypted.migrate
      }
    }
    plan {
      method = method.aes_gcm.method
      fallback {
        method = method.unencrypted.migrate
      }
    }
  }
    required_version = ">= 1.7.0"
}
```

The first line after the encryption block is the unencrypted method, telling Opentofu that this project is yet to be encrypted but is about to.

The second line is the key provider, which is the key provider you are using, in my case, it's AWS KMS, so I added `key_provider "aws_kms" "basic"`, if you are using GCP KMS, you will have `key_provider "gcp_kms" "basic"`, if you are using PBKDF2, you will have `key_provider "pbkdf2" "basic"`, and if you are using OpenBao, you will have `key_provider "openbao" "basic"`.

You can see the `kms_key_id` and `region` in the code, replace the `kms_key_id` with your KMS key ID, and replace the `region` with your KMS key region.

The next line is where you then declare the encryption method, at the time of writing, Opentofu supports just <a href="https://opentofu.org/docs/language/state/encryption/#methods" targget="_blank">two methods</a>, **AES-GCM** for encryption and the **Unencrypted** method.

The following line is where you then declare the state encryption and the method to be used for the encryption, then the fallback method which is crucial for the first time of enabling encryption.

The same thing goes for the plan encryption, you declare the method to be used for the encryption, and the fallback method.

Once you have added this to your provider block, you can then run `tofu init` to initialize your project, and then run `tofu plan && tofu apply -auto-approve` to see if everything is working fine.

Once you have confirmed that everything is working fine, you have to modify the provider syntax to look like this.

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "basic" {
      kms_key_id = "0xxxxxx0-xxxx-xxxxx-xxxx-xexxxxxx"
      region     = "KMS KEY REGION"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "method" {
      keys = key_provider.aws_kms.basic
    }

    state {
      method = method.aes_gcm.method
      enforced - true
    }
    plan {
      method = method.aes_gcm.method
      enforced - true
    }
  }
    required_version = ">= 1.7.0"
}
```

In the syntax above, you can see that I have removed the `method "unencrypted" "migrate" {}` and the `fallback { method = method.unencrypted.migrate }`line, and I have added `enforced = true` to the state and plan block.

This will enforce the encryption on your state and plan, so the next time you try to run `tofu plan` or `tofu apply` without the encryption key, it will fail.

You have to be careful and manage your KMS key properly, if you lose your key, you will lose your state and plan, and you will have to start all over again. So be careful.

Now that you are done how do you confirm if your state is truly encrypted? You can run `tofu state show -state=YOURSTATEFILE` to see the state file.

But if you are using AWS S3 as your state backend, you can just go view your state file in the S3 bucket, and you will see that it's encrypted.

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/encrypt.webp`} alt="Opentofu Encrypted State File"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/encrypt.png`} alt="Opentofu Encrypted State File"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/encrypt.png`} alt="OpenTofu Encrypted State File"/>
</picture>
<p style={{ color: 'green' }}>OpenTofu Encrypted State File</p>
</Figure>

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/nonencrypt.webp`} alt="Opentofu Non Encrypted State File"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/nonencrypt.png`} alt="Opentofu Non Encrypted State File"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/nonencrypt.png`} alt="OpenTofu Non Encrypted State File"/>
</picture>
<p style={{ color: 'green' }}>OpenTofu Non Encrypted State File</p>
</Figure>

## Enabling State and Plan Encryption For New Project

If you are starting a new project, you can just add the encryption syntax to your provider block, and you are good to go. nothing much to do here.

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "basic" {
      kms_key_id = "0xxxxxx0-xxxx-xxxxx-xxxx-xexxxxxx"
      region     = "KMS KEY REGION"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "method" {
      keys = key_provider.aws_kms.basic
    }

    state {
      method = method.aes_gcm.method
      enforced - true
    }
    plan {
      method = method.aes_gcm.method
      enforced - true
    }
  }
    required_version = ">= 1.7.0"
}
```

Well, that's it, folks! I hope you find this piece insightful and helpful.

Till next time, Peace be on you ✌️

#### References
- https://opentofu.org/docs/language/state/encryption/

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