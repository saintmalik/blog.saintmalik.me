---
title: Terragrunt Note
---
import Giscus from "@giscus/react";

Terra grunt config file name, terragrunt.hcl

Blocks:

Terraform Block: to find terraform config files, communicate with resource on target provider —— Arguments: source, include_in_copy, extra_arguments,
hooks before, error, after,
init-from-module and init, terragrunt-read-config

Include block, inherit parent terraform configuration file to child config file, process data from parent to child in current config file
Can only process one include block, path = find_in_parent_folders(“region.hcl”)

Local blocks allows you to define alias within the configuration file

Remote_state block:

iam_role

Store remote state for multiple env
```
Generate
		Path = “s3-backend.tf”
		If_exists = “overwrite_terragrunt”
		Contents = <<EOF
Terraform {
 Backend “s3” {
    Bucket = “terraform-statefiles-aws-vpc”
    Key = “${path_relative_to_include())/terraform.tfstate”
```

Call them in your terrgrunt file and use block name include

```
Include “root” {
Path =
}
```
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