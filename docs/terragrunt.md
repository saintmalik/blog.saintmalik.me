---
title: Terragrunt Note
---

import Giscus from "@giscus/react";

Terragrunt wraps Terraform to keep configurations DRY across environments. The config file is named `terragrunt.hcl`.

## Core blocks

| Block | Purpose |
|---|---|
| `terraform` | Points to the Terraform source module and adds extra CLI arguments or hooks. |
| `include` | Inherits a parent `terragrunt.hcl` so environment configs reuse shared settings. |
| `locals` | Defines aliases and computed values inside the current file. |
| `remote_state` | Configures the backend (S3, GCS, Azure, etc.) once for all child configs. |
| `generate` | Creates additional Terraform files, such as a backend configuration, at runtime. |

## Example: backend generation

```hcl
# terragrunt.hcl
remote_state {
  backend = "s3"

  config = {
    bucket         = "terraform-statefiles-aws-vpc"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }

  generate = {
    path      = "s3-backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}
```

This generates `s3-backend.tf` in each child directory with the S3 backend configuration.

## Example: include a parent config

```hcl
# dev/terragrunt.hcl
include "root" {
  path = find_in_parent_folders("root.hcl")
}
```

`find_in_parent_folders()` walks up the directory tree until it finds `root.hcl`. Each child can include only one block with the same label, but different labels are allowed if you need more than one inclusion.

## Example: terraform source and hooks

```hcl
# terragrunt.hcl
terraform {
  source = "git::https://github.com/org/terraform-modules.git//vpc?ref=v1.2.0"

  extra_arguments "common_vars" {
    commands = [
      "apply",
      "plan",
    ]

    arguments = [
      "-var-file=../common.tfvars",
    ]
  }

  before_hook "before_hook" {
    commands = ["apply"]
    execute  = ["echo", "Running apply"]
  }
}
```

## Completion criterion

After reading this, you should be able to:

1. Name the config file and place it correctly in a Terragrunt project.
2. Use `include` to inherit a parent configuration.
3. Use `remote_state` with `generate` to create a backend file automatically.
4. Add extra arguments and hooks to Terraform commands.

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
