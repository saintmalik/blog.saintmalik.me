---
slug: iac-security-with-state-file-encryption
title: Enhanced IaC Security with State File Encryption Using OpenTofu
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/encryption.webp
tags: [IaC, opentofu, encryption, security, terraform, devops]
description: Learn how to encrypt your OpenTofu state files using AWS KMS, GCP KMS, or PBKDF2. A practical guide for DevOps engineers looking to secure their infrastructure code.
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

I must say you shouldn't bet against open-source software, even when Terraform was still open-source, the ability to have state encryption was not available but was available on their Terraform cloud.

<!--truncate-->

Well, guess what? OpenTofu just changed the game.

You know those state files sitting in your S3 bucket with all your sensitive configs, API keys, and God knows what else is in plain text? Yeah, we can finally encrypt those bad boys.

(If you're wondering how we've been handling secrets up until now, check out my guide on <a href="https://blog.saintmalik.me/secrets-in-iac-terraform/" target="_blank">Managing Secrets in Infrastructure As Code with Terraform</a>.

## Getting Started with State Encryption

First things first - you need to be using OpenTofu for this. Still on Terraform? No worries - just follow the <a href="https://opentofu.org/docs/intro/migration/" target="_blank">Opentofu migration guide</a>. It's pretty straightforward, I promise.

## For Existing Projects: The Migration Path

Let's say you've got an existing project in OpenTofu with unencrypted state files. Here's how we fix that:

1. First, you'll need an encryption key. OpenTofu supports four providers:
   - AWS KMS (what I'm using)
   - GCP KMS
   - PBKDF2
   - OpenBao (the open-source fork of Vault)

If you're using AWS like me, head over to KMS and create a key. You'll need that key ID that looks something like `0xxxxxx0-xxxx-xxxxx-xxxx-xexxxxxx`.

2. Here's the tricky part - we need to tell OpenTofu to gradually migrate from unencrypted to encrypted state. Add this to your provider block:

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

That `method "unencrypted" "migrate"` bit is crucial - it tells OpenTofu "hey, we're transitioning from unencrypted state here."

You can see the `kms_key_id` and `region` in the code, replace the `kms_key_id` with your KMS key ID, and replace the `region` with your KMS key region.

3. Run `tofu init` followed by `tofu plan && tofu apply -auto-approve`. Cross your fingers, and...

4. If everything worked, we can now lock it down. Update your config to:

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
      enforced = true
    }
    plan {
      method = method.aes_gcm.method
      enforced = true
    }
  }
    required_version = ">= 1.7.0"
}
```

Notice we removed the migration stuff and added `enforced = true`. Now OpenTofu won't even touch your state without proper encryption.

## Starting Fresh? Even Easier!

If you're starting a new project, just use that second config block from the start. No migration needed!

## Did It Actually Work?

Want to check if your state is really encrypted? If you're using S3 as your backend, just peek at the state file:

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/encrypt.webp`} alt="Encrypted state file in S3"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/encrypt.png`} alt="Encrypted state file in S3"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/encrypt.png`} alt="Encrypted state file in S3"/>
</picture>
<p style={{ color: 'green' }}>Sweet, sweet encryption</p>
</Figure>

Compare that to an unencrypted state file:

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/nonencrypt.webp`} alt="Unencrypted state file - yikes"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/nonencrypt.png`} alt="Unencrypted state file - yikes"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/nonencrypt.png`} alt="Unencrypted state file - yikes"/>
</picture>
<p style={{ color: 'green' }}>Plain text state file - not great for security!</p>
</Figure>

## One Last Thing

Seriously - don't lose that KMS key. Back it up, document it, tattoo it on your arm if you have to. If you lose it, you're going to have a really bad day rebuilding your entire infrastructure from scratch.

That's it! Shout out to the OpenTofu team for finally making this happen. Drop a comment if you run into any issues - I'm curious to hear how this works for different setups.

Well, that's it, folks! I hope you find this piece insightful and helpful.

Till next time, Peace be on you 🤞🏽

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