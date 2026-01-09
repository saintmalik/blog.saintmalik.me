---
slug: opentofu-ephemeral-resources
title: "Ephemeral Resources and the End of Secrets in State Files"
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/opentofu.webp
tags: [opentofu, IaC, security, terraform, devops, devsecops]
description: OpenTofu 1.11 introduces ephemeral resources that keep secrets out of state files forever. Learn about this game-changing feature.
---

import Giscus from "@giscus/react";

If you've been following my content, you know I'm big on IaC security. I've written about <a href="https://blog.saintmalik.me/iac-security-with-state-file-encryption/" target="_blank">encrypting your OpenTofu state files</a> before - because let's be honest, downloading unencrypted terraform state files dangling around has been a goldmine for attackers.

<!--truncate-->

Well, OpenTofu 1.11 just dropped and it's addressing this problem from a completely different angle - what if secrets never made it to state files in the first place?

## The Problem with Secrets in State Files

Here's a tweet I made a while back:

> ["I love downloading unencrypted terraform state dangling around, helps me understand your infra and if i get lucky, i might find a key or token, please just enable state encryption, this is bare minimum"](https://x.com/saintmalik_/status/1979786351785734327?s=20)

State file encryption is great, but it's still a safety net. The secrets are still there, just encrypted. If someone gets access to your KMS key or your encryption passphrase, game over.

OpenTofu 1.11 takes a completely different approach with **Ephemeral Resources**.

## Ephemeral Resources - The Game Changer

This is the headline feature. Ephemeral values allow OpenTofu to work with data and resources that exist **only in memory** during a single OpenTofu phase. They're guaranteed to never be persisted in state snapshots or plan files.

### Before (The Old Way)

```hcl
# Traditional approach - secret STORED in state
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
  # Password is now in your state file forever!
}
```

### After (The OpenTofu 1.11 Way)

```hcl
# NEW: Ephemeral resource - secret NEVER stored in state
ephemeral "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}

resource "aws_db_instance" "main" {
  password = ephemeral.aws_secretsmanager_secret_version.db_password.secret_string
  # Password used during apply but NEVER saved in state file!
}
```

See that? Same functionality, but the secret exists only during the `tofu apply` execution. Once it's done, poof - gone from memory, never persisted.

### Why This Matters

1. **Zero-exposure secrets** - Even if someone gets your state file, there are no secrets to steal
2. **Compliance made easier** - SOC2, HIPAA, PCI-DSS auditors love hearing "secrets never touch disk"
3. **Defense in depth** - Combined with state encryption, you've got multiple layers now

### Write-Only Attributes

There's also a related feature called **write-only attributes**. Some managed resource types now support attributes that can be set but never stored. Perfect for passwords, API keys, and other sensitive configs.

```hcl
resource "some_provider_database" "example" {
  name = "production-db"

  # This is a write-only attribute
  admin_password = var.db_admin_password
  # ↑ Password is sent to the provider but not saved in state
}
```

### Ephemeral Variables and Outputs

You can also declare input variables and output values as ephemeral:

```hcl
variable "api_secret" {
  type      = string
  ephemeral = true  # Won't be stored in state
}

output "generated_token" {
  value     = some_resource.token
  ephemeral = true  # Won't persist in state snapshots
}
```

## My Take

Ephemeral resources are genuinely exciting. Combined with <a href="https://blog.saintmalik.me/iac-security-with-state-file-encryption/" target="_blank">state file encryption</a>, this puts OpenTofu leagues ahead of Terraform in the security department.

If you're still on Terraform and haven't made the switch to OpenTofu yet, this feature alone might be the nudge you need.

Till next time, Peace be on you 🤞🏽

#### References
- [OpenTofu 1.11 Release Notes](https://opentofu.org/docs/intro/whats-new/)
- [Ephemerality Documentation](https://opentofu.org/docs/language/resources/ephemeral/)

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
