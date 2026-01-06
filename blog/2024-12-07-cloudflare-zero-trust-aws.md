---
slug: cloudflare-zero-trust-security-ec2
title:  "Zero Trust Security: Securing Web App on EC2 with Cloudflare Tunnel"
authors: Abdulmalik
image: /bgimg/toni.webp
tags: [devops, devsecops, appsec]
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Having worked across some startups over time, i have seen how many of them handle apps meant to be internal, best guess? its mostly deployed to the public.

<!--truncate-->

I believe most of them believe that their web apps are so secure and aren't prone to attacks? Or they've written the most secure code against access or authorization attacks etc., not sure why though but it always amazes me.

## The Challenge with Deploying Internal Applications

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflare-zero-trust-ec2.webp`} alt="Cloudflare Zero Trust"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflare-zero-trust-ec2.png`} alt="Cloudflare Zero Trust"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflare-zero-trust-ec2.png`} alt="Cloudflare Zero Trust"/>
</picture>
<p style={{ color: 'green' }}>Cloudflare Zero Trust</p>
</Figure>

If you say we should have our internal apps not deployed to the public internet, how do we then handle it? You deploy to private subnets/networks.
But the cons of deploying to private subnets or private network? Accessing the apps, which then brings us to various solutions:

- Site-to-Site VPNs (OpenVPN, AWS VPN, WireGuard)
- Setting up bastion Host
- Direct Connect with AWS Direct Connect
- Private Link with AWS PrivateLink
- Tunneling

Following the mantra that I have also stuck with, **"simplicity is preferable"** so why not go for something simpler that works the same way - Cloudflare Tunneling.

AWS VPN is great too, but it comes at a cost, likewise OpenVPN is great too, but the setup can be complex, depends on the org too, but Cloudflare Tunnel just works great, simple and free

Lets get into it

## Prerequisite

- Experience with OpenTofu/Terraform
- Cloudflare Account with Your Domain Added Already
- Your Container Repository to push your the container image built from the Dockerfile
- Access to Google Workspace for SSO

## Implementation Overview

Our implementation consists of several key components, also the full OpenTofu code for this guide is aviable on <a href="https://github.com/saintmalik/cloudflare-zero-trust-ec2/" targe="_blank">GitHub</a>

1. Building our cloudflared container image
2. VPC and Network Infrastructure
3. EC2 Instance Configuration
4. Identity and Access Management
5. Cloudflare Tunnel Setup

Let's break down each component:

### 1. Building our cloudflared container image

First, we'll build the cloudflared container image, here is the Dockerfile and entrypoint.sh file for that.

So you have to build the container using the below command, depending on the container image, your build syntax might change, but ensure you build for platform **linux/arm64** because the instance we are dealing with is linux/arm64 architecture.

```sh
docker buildx build --platform linux/arm64 -t $YOUR_CONTAINER_REGISTRY/$YOUR_CONTAINER_REPOSITORY:$IMAGE_TAG  -f Dockerfile . --push
```

Here is the Dockerfile file configurations

```Dockerfile title="Dockerfile"
# ==============================================================================
# Download cloudflared
# ==============================================================================
FROM debian:bookworm-slim as build

# Install dependencies
RUN apt-get update                       && \
    apt-get install -y curl

# Download cloudflared
RUN curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared  && \
    chmod +x cloudflared                && \
    mv cloudflared /usr/local/bin/

# ==============================================================================
# Run from alpine
# ==============================================================================
FROM alpine:3.20

# Install dependencies
RUN apk update && apk add --no-cache aws-cli

# Get cloudflared from build
COPY --from=build /usr/local/bin/cloudflared /usr/local/bin/cloudflared

# Copy script
WORKDIR /etc/cloudflared
COPY ./entrypoint.sh /etc/cloudflared/entrypoint.sh
RUN chmod +x /etc/cloudflared/entrypoint.sh

# Run script
ENTRYPOINT ["/etc/cloudflared/entrypoint.sh"]
```

```sh title="entrypoint.sh"
#! /bin/sh

set -ueo pipefail

# ==============================================================================
# CONFIG
# ==============================================================================
#
# STATIC
#
PATH_CLOUDFLARED="/etc/cloudflared"
PATH_CREDENTIALS="${PATH_CLOUDFLARED}/credentials.json"
PATH_CONFIG="${PATH_CLOUDFLARED}/config.yml"

#
# ENV VARS
#
VAR_ORIGIN_URL=${ORIGIN_URL}
VAR_TUNNEL_UUID=${TUNNEL_UUID}

#
# SECRETS
#
VAR_TUNNEL_CREDENTIALS=${TUNNEL_CREDENTIALS}


# ==============================================================================
# PREPARE CLOUDFLARED CONFIG
# ==============================================================================
#
# Create folder
#
mkdir -p ${PATH_CLOUDFLARED}

#
# Fetch secrets
#
echo "[*] Fetching Cloudflared Tunnel: credentials JSON..."
echo "$VAR_TUNNEL_CREDENTIALS" > $PATH_CREDENTIALS

#
# Create config file
#
echo -e "tunnel: ${VAR_TUNNEL_UUID}
credentials-file: ${PATH_CREDENTIALS}
url: ${VAR_ORIGIN_URL}
no-autoupdate: true" > $PATH_CONFIG


# ==============================================================================
# RUN TUNNEL
# ==============================================================================

# Run tunnel
echo "[*] Starting tunnel..."
cloudflared tunnel --config ${PATH_CONFIG} run ${VAR_TUNNEL_UUID}
```

### 2. VPC and Network Infrastructure

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
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr
  availability_zone = "us-east-1a"
}
```

Then we implement the **fck-nats** the alternative to AWS NAT Gateway, instead of using the expensive AWS NAT Gateway, we implement a cost-effective alternative using fck-nat

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

### 3. EC2 Instance Configuration
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

### 4. Identity and Access Management

Here is where we define how to access the app beyound whatever AuthZ and Auth you might have defined or designed for your application, i see this as an additional security leverage.

You get the chance to use IdP, SAML, OpenID Connect or One-time PIN, but in this guide, we would be using Google Workspace as out IdP, here is a <a href="https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/gsuite/" target="_blank">guide</a> to help you set it up on the cloudflare zero trust console.

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/access-options.webp`} alt="Cloudflare Zero Trust Access"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/access-options.png`} alt="Cloudflare Zero Trust Access"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/access-options.png`} alt="Cloudflare Zero Trust Access"/>
</picture>
<p style={{ color: 'green' }}>Setting Warp Client Posture Check</p>
</Figure>

If you are done with the setup, you will be left with ``google_oauth_client_id`` and ``google_oauth_client_secret`` credentials.

And as you know, you can't hardcode those values in your IaC code, hence the need to store it as a SecureString in AWS Parameter store or whatever alternative of AWS Parameter Store that you have on the Cloud Infra you are using.

Wrote a piece on <a href="https://blog.saintmalik.me/secrets-in-iac-terraform/" target="_blank">how to handle secrets in IaC</a>, you can check it out too.

#### Google Workspace Integration

```hcl title="cloudflared.tf"
data "aws_ssm_parameter" "google_oauth_client_id" {
  name = "/internalwebapp/google_oauth_client_id"
}

data "aws_ssm_parameter" "google_oauth_client_secret" {
  name = "/internalwebapp/google_oauth_client_secret"
}

resource "cloudflare_zero_trust_access_identity_provider" "google_workspace" {
  account_id = var.cloudflare_account_id
  name       = "Google Workspace IdP"
  type       = "google"
  config {
    client_id     = data.aws_ssm_parameter.google_oauth_client_id.value
    client_secret = data.aws_ssm_parameter.google_oauth_client_secret.value
    apps_domain   = var.google_workspace_domain
  }
}
```

#### Trust Access App and Policy Configuration

Here is where we create the trust access application and the policy for it

```hcl title="cloudflared.tf"
resource "cloudflare_zero_trust_access_application" "app" {
  account_id = var.cloudflare_account_id
  name       = "internalwebapp"
  domain     = local.environment.domain

  allowed_idps = [cloudflare_zero_trust_access_identity_provider.google_workspace.id]

  type                  = "self_hosted"
  session_duration      = "24h"
  app_launcher_visible  = true
  app_launcher_logo_url = var.cloudflare_app_logo
}

resource "cloudflare_zero_trust_access_policy" "policy" {
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_zero_trust_access_application.app.id

  name                           = "internalwebapp-filter"
  precedence                     = "1"
  decision                       = "allow"
  purpose_justification_required = true

  include {
    login_method = [cloudflare_zero_trust_access_identity_provider.google_workspace.id]
  }

  require {
    gsuite {
      identity_provider_id = cloudflare_zero_trust_access_identity_provider.google_workspace.id
    }
    group = local.environment.cloudflare_config.allowed_groups
  }
}
```

The group ``local.environment.cloudflare_config.allowed_groups`` here is where we are adding the warp client requirement, i couldnt find the OpenTofu config for the cloudflare provider that allowed adding warp client as a requirement, so i had to create the access group via the console and add it as a group here.

To do the same thing, you need to enable the warp client manually via the console, on your Cloudflare One console,

Lets enable warp client first, head over to the settings section from the sidebar and click on Warp Client

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflare-zero-settings.webp`} alt="Cloudflare One Warp Client"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflare-zero-settings.png`} alt="Cloudflare One Warp Client"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflare-zero-settings.png`} alt="Cloudflare One Warp Client"/>
</picture>
<p style={{ color: 'green' }}>Cloudflare One Warp Client</p>
</Figure>

Scroll down to the Device posture section, you will see warp client check settings, click on the ``Add new`` button

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enable-warp.webp`} alt="Cloudflare One Warp Client Settings"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enable-warp.png`} alt="Cloudflare One Warp Client Settings"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enable-warp.png`} alt="Cloudflare One Warp Client Settings"/>
</picture>
<p style={{ color: 'green' }}>Cloudflare One Warp Client Settings</p>
</Figure>

Select Warp from all the options and save it

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enable-warp-client.webp`} alt="Setting Warp Client Posture Check"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enable-warp-client.png`} alt="Setting Warp Client Posture Check"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enable-warp-client.png`} alt="Setting Warp Client Posture Check"/>
</picture>
<p style={{ color: 'green' }}>Setting Warp Client Posture Check</p>
</Figure>

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enabling-warp.webp`} alt="Setting Warp Client Posture Check"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enabling-warp.png`} alt="Setting Warp Client Posture Check"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/enabling-warp.png`} alt="Setting Warp Client Posture Check"/>
</picture>
<p style={{ color: 'green' }}>Setting Warp Client Posture Check</p>
</Figure>

After that, you can head over to the Access section on the sidebar and dropdown its option you will see Access groups, click on it and create a group

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/creating-warp-group.webp`} alt="Creating Access Groups on Cloudflare One"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/creating-warp-group.png`} alt="Creating Access Groups on Cloudflare One"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/creating-warp-group.png`} alt="Creating Access Groups on Cloudflare One"/>
</picture>
<p style={{ color: 'green' }}>Creating Access Groups on Cloudflare One</p>
</Figure>

Add the group name and define the group criteria as inclusion of warp client, after the creation, copy the group ID and replace it as a group ID value in the IaC code.

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/creating-warp-group.webp`} alt="Copy Access Groups ID on Cloudflare One"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/creating-warp-group.png`} alt="Copy Access Groups ID on Cloudflare One"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/creating-warp-group.png`} alt="Copy Access Groups ID on Cloudflare One"/>
</picture>
<p style={{ color: 'green' }}>Creating Access Groups on Cloudflare One</p>
</Figure>


### 5. Cloudflare Tunnel Setup
Configure the tunnel and DNS Setup

```hcl title="cloudflared.tf"
resource "cloudflare_zero_trust_tunnel_cloudflared" "tunnel" {
  account_id = var.cloudflare_account_id
  name       = "tunnel"
  secret     = random_password.tunnel_secret.result
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "config" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.tunnel.id

  config {
    warp_routing {
      enabled = true
    }
    ingress_rule {
      service = local.environment.origin_url
    }
  }
}
```

here is how your cloudflare tunnel should look if health

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflared-tunnel.webp`} alt="Cloudflare Tunnel"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflared-tunnel.png`} alt="Cloudflare Tunnel"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflared-tunnel.png`} alt="Cloudflare Tunnel"/>
</picture>
<p style={{ color: 'green' }}>Cloudflare Tunnel</p>
</Figure>

```hcl title="cloudflared.tf"
resource "cloudflare_record" "dns" {
  zone_id = var.cloudflare_zone_id
  name    = local.environment.domain
  value   = cloudflare_zero_trust_tunnel_cloudflared.tunnel.cname
  type    = "CNAME"
  proxied = true
  ttl     = 1
}
```

And lastly before you run ``tofu plan && tofu apply --auto-approve`` you need to create cloudflare api token for the cloudflared provider in your provider.tf

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflare-api-token.webp`} alt="Cloudflare API Token Creation"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflare-api-token.png`} alt="Cloudflare API Token Creation"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflare-api-token.png`} alt="Cloudflare API Token Creation"/>
</picture>
<p style={{ color: 'green' }}>Cloudflare API Token Creation</p>
</Figure>

```hcl title="provider.tf"
provider "cloudflare" {
  api_token = "YOUR_CLOUDFLARE_TOKEN"
}
```

You can streamline your permission based on your usecase also, this is just a snippet to help you see what it looks like

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflared-permissions.webp`} alt="Cloudflare API Token Permission"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflared-permissions.png`} alt="Cloudflare API Token Permission"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cloudflared-permissions.png`} alt="Cloudflare API Token Permission"/>
</picture>
<p style={{ color: 'green' }}>Cloudflare API Token Permission</p>
</Figure>


At the end of the day, here is what your final webapp should look like if you have warp turned on your devices.

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/warp-client.webp`} alt="Enabled Warp Client on Your Devices"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/warp-client.png`} alt="Enabled Warp Client on Your Devices"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/warp-client.png`} alt="Enabled Warp Client on Your Devices"/>
</picture>
<p style={{ color: 'green' }}>Enabled Warp Client on Your Devices</p>
</Figure>

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/final-internalwebapp.webp`} alt="Final Look of the Internal Web App with Cloudflare Zero Trust"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/final-internalwebapp.png`} alt="Final Look of the Internal Web App with Cloudflare Zero Trust"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/final-internalwebapp.png`} alt="Final Look of the Internal Web App with Cloudflare Zero Trust"/>
</picture>
<p style={{ color: 'green' }}>Final Look of the Internal Web App with Cloudflare Zero Trust</p>
</Figure>

And since the use of warp client is made a requirement, if you dont have it turned on or there is other required policy that isnt being met, you will encounter a screen like this


<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/not-meeting-requirement-look.webp`} alt="Final Look of the Internal Web App with Cloudflare Zero Trust Without Meeting The Policy Requirements"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/not-meeting-requirement-look.png`} alt="Final Look of the Internal Web App with Cloudflare Zero Trust Without Meeting The Policy Requirements"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/not-meeting-requirement-look.png`} alt="Final Look of the Internal Web App with Cloudflare Zero Trust Without Meeting The Policy Requirements"/>
</picture>
<p style={{ color: 'green' }}>Final Look of the Internal Web App with Cloudflare Zero Trust Without Meeting The Policy Requirements</p>
</Figure>

## Conclusion
By leveraging Cloudflare Zero Trust and Tunnels, we've created a secure, cost-effective way to deploy internal applications. The solution provides enterprise-grade security without the complexity of traditional VPN setups.

Till next time, Peace be on you 🤞🏽

#### References
- https://noise.getoto.net/2022/02/10/adding-a-casb-to-cloudflare-zero-trust/
- https://blog.marcolancini.it/2024/blog-building-apprunner-ec2-cloudflare-zero-trust-access/
- https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/deploy-tunnels/deployment-guides/aws/
- https://zenn.dev/hiroe_orz17/articles/b028fdb5444ee0

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