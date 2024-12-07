---
slug: cloudflare-zero-trust-security-ec2
title:  "Zero Trust Security: Securing Web App on EC2 with Cloudflare Tunnel"
authors: Abdulmalik
image: /bgimg/toni.webp
tags: [devops, devsecops, appsec]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Having worked across some startups over time, i have seen how many of them handle apps meant to be internal, best guess? its mostly deployed to the public.

<!--truncate-->

I believe most of them believe that their web apps are so secure and aren't prone to attacks? Or they've written the most secure code against access or authorization attacks etc., not sure why thought but it always amazes me.

## The Challenge with Internal Applications

If you say we should have our internal apps not deployed to the public internet, how do we then handle it? You deploy to private subnets/networks.
But the cons of deploying to private subnets or private network? Accessing the apps, which then brings us to various solutions:

- Site-to-Site VPNs (OpenVPN, AWS VPN, WireGuard)
- Setting up bastion Host
- Direct Connect with AWS Direct Connect
- Private Link with AWS PrivateLink
- Tunneling

Following the mantra that I have also stuck with, **"simplicity is preferable"** so why not go for something simpler that works the same way - Cloudflare Tunneling. AWS VPN is great too, but it comes at a cost, likewise OpenVPN is great too, but the setup can be complex, depends on the org too. Cloudflare Tunnel just works great, simple and free**

Lets get into it

## Prerequisite

- Experience with OpenTofu/Terraform
- Cloudflare Account with Your Domain Added Already
- Your Dockerfile for the container image
- Access to Google Workspace for SSO

## Implementation Overview

Our implementation consists of several key components, also the full OpenTofu code for this guide is aviable on <a href="https://github.com/saintmalik/cloudflare-zero-trust-ec2/" targe="_blank">GitHub</a>

1. VPC and Network Setup
2. EC2 Instance Configuration
3. Cloudflare Zero Trust Configuration
4. Tunnel Setup
5. Access Policies

Let's break down each component:


### 1. VPC and Network Infrastructure

First, we'll set up our VPC with public and private subnets:

```hcl title="vpc.tf"
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = var.vpc_enable_dns_hostnames
  tags = merge(
    var.tags,
    {
      Name = "${var.prefix}_vpc"
    }
  )
}

# Public and Private Subnets
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = "us-west-2a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr
  availability_zone = "us-west-2a"
}
```

NAT Gateway Alternative
Instead of using the expensive AWS NAT Gateway, we implement a cost-effective alternative using fck-nat

```hcl title="fck-nats.tf"
module "fck-nat" {
  source        = "RaJiska/fck-nat/aws"
  version       = "1.3.0"
  name          = "fck-nat-${var.env}"
  vpc_id        = aws_vpc.main.id
  subnet_id     = aws_subnet.public.id
  instance_type = "t4g.nano"
  ha_mode       = true
}
```

3. EC2 Instance Setup
Our EC2 instance runs in the private subnet:

```hcl title="instance.tf"
resource "aws_instance" "ec2" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.private.id
  vpc_security_group_ids = [aws_security_group.private_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.instance_profile.name
  user_data             = local.instance_values

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }
}
```

## Conclusion
By leveraging Cloudflare Zero Trust and Tunnels, we've created a secure, cost-effective way to deploy internal applications. The solution provides enterprise-grade security without the complexity of traditional VPN setups.

Till next time, Peace be on you ✌️
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