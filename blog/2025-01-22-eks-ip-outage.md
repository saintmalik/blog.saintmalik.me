---
slug: eks-ip-outage
title:  "How to Prevent EKS Outages: Solving Insufficient IP Address Issues in AWS EKS"
authors: Abdulmalik
image: /bgimg/ip-runout.webp
tags: [devops, devsecops, appsec]
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Sooner or later, your Elastic Kubernetes Service (EKS) Cluster will run out of IP allocation for your workloads, pods and all.

<!--truncate-->

So how do you resolve this? there are really many ways like moving to IPv6, yeah, you will get more IP address to go round for your workloads, you will never run out, but for me, i dont think i am ready to tear down my existing EKS Cluster to move to IPv6.

Moreover not all technology have support for IPv6 yet, i really cherish my peace of mind also, so this isnt an option for me.

But you can always consider this when creating new EKS cluster though.

So what other option do we have? that does work and easy to, that is using of **Multi-CIDR and Prefix Delegation**

## But Why Does This Happen In The First Place?

In AWS EKS, each pod is assigned an IP address from the VPC’s subnet. If your VPC subnets are small or your cluster is running a large number of pods, you’ll eventually exhaust the available IP addresses. This can lead to pod scheduling failures and cluster outages.

But most of the time, this does happen when when you try to assign more pods to your nodes beyond the default max pods.

So Let's get into the solution;

## Prerequisite

- Experience with OpenTofu/Terraform
- Your Exiting EKS created with Terraform/OpenTofu

### 👉 Step 1: Define Secondary CIDR Blocks

Add a secondary CIDR block to your VPC. This block will provide additional IP addresses for your subnets.

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 3.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  # Add a secondary CIDR block
  secondary_cidr_blocks = ["100.64.0.0/16"]

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = concat(
    [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 8, k + 1)],
    [for k, v in local.azs : cidrsubnet(element(local.secondary_cidr_blocks, 1), 2, k)],
  )
}
```

### 👉 Step 2: Modifying Your VPC CNI Plugin To Use Prefix Delegation

The AWS VPC CNI plugin manages pod networking in EKS. To use the secondary subnets, enable prefix delegation and configure the CNI plugin to use the new subnets.

```hcl
vpc-cni = {
  most_recent       = true
  resolve_conflicts = "PRESERVE"
  configuration_values = jsonencode({
    env = {
      ENABLE_PREFIX_DELEGATION           = "true"
      WARM_PREFIX_TARGET                 = "1"
      AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG = "true"
      ENI_CONFIG_LABEL_DEF               = "topology.kubernetes.io/zone"
    }
  })
}
```

### 👉 Step 3: Create ENI Configs for Secondary Subnets

Create ENIConfig resources for the secondary subnets. These configurations tell the VPC CNI plugin which subnets to use for pod networking.

The secondary subnets will be the last three while the primary subent is the first three [0,1,2], so lets create the eni configs.

```hcl
locals {
  eni_configs = {
    "a" = module.vpc.private_subnets[3]
    "b" = module.vpc.private_subnets[4]
    "c" = module.vpc.private_subnets[5]
  }
}

resource "kubectl_manifest" "eni_configs" {
  for_each = local.eni_configs

  yaml_body = <<-EOF
apiVersion: crd.k8s.amazonaws.com/v1alpha1
kind: ENIConfig
metadata:
  name: "${var.region}${each.key}"
spec:
  securityGroups:
    - "${module.preprod_cluster.node_security_group_id}"
  subnet: "${each.value}"
EOF
}
```

### 👉 Step 4: Apply the Configuration

Run ``terraform apply`` or ``tofu apply`` to create the secondary subnets and configure the VPC CNI plugin. Once applied, your EKS cluster will start using the additional IP addresses from the secondary subnets.

## Final Thoughts

Running out of IP addresses in your EKS cluster can be a frustrating experience, but it’s a solvable problem.

By adding secondary subnets to your VPC and configuring the VPC CNI plugin, you can ensure your cluster has enough IP addresses to handle your workloads.

While IPv6 is a great long-term solution, it’s not always practical for existing clusters.

Adding secondary subnets is a quick and effective way to prevent IP address exhaustion without disrupting your operations.

Take care, and happy scaling! 🤞🏽

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