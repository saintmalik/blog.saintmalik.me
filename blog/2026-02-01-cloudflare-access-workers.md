---
slug: cloudflare-access-workers-for-internal-apps
title: "Protecting Your Internal Apps on Cloudflare Workers with Cloudflare Access"
authors: Abdulmalik
image: /bgimg/cloudflare-access-workers.webp
tags: [devops, devsecops, appsec, cloudflare, security]
description: Internal dashboards should never be publicly accessible. Learn how to secure your Cloudflare Workers applications with Cloudflare Access - a simpler alternative to VPNs.
---

import Giscus from "@giscus/react";

Cloudflare Workers has become the go-to platform for deploying edge applications. It's easy to deploy, wrangler deploy and you are up.

<!--truncate-->

You get the benefits of Cloudflare's CDN and edge network, there's a generous free tier, and you can even deploy Next.js applications on it. But with great power comes great responsibility - particularly when it comes to securing internal interfaces.

## The Problem with Publicly Accessible Internal Interfaces

If you're deploying a Next.js or any web application on Cloudflare Workers, chances are you have an admin dashboard somewhere. The problem? Most of these dashboards are publicly accessible on the internet.

Some developers think they're being clever by using "security through obscurity" - instead of `admin.example.com`, they use something like `secret-admin-panel.example.com`. But let's be real: **this doesn't protect your application**. It's just a matter of time before that dashboard is discovered through subdomain enumeration.

> [!CAUTION]
> **No admin or internal dashboard should ever be publicly accessible.** Period. The attack surface is just too large.

## Why Not Just Use a VPN?

In enterprise environments, the traditional solution is setting up a VPN. But VPNs come with their own challenges:

- **Cost**: Enterprise VPN solutions can be expensive, especially for smaller teams
- **Complexity**: Setting up and maintaining OpenVPN, WireGuard, or AWS VPN requires significant effort
- **User Experience**: Team members need to connect to a VPN client before accessing internal tools

For big corporations with dedicated IT teams and budget, VPNs work great. But for startups and smaller teams? There's a better way.

## Enter Cloudflare Access

Cloudflare Access is a Zero Trust security solution that sits in front of your applications. It acts as a gatekeeper, verifying identity before allowing access to your resources. The best part? **It's free for teams under 50 members**.

Since we're already using Cloudflare Workers, the integration is seamless - no tunnels, no complex infrastructure, no cloudflared containers to manage. The entire stack is on Cloudflare.

## Prerequisite

- Cloudflare Account with your domain configured
- Cloudflare Workers application deployed
- An Identity Provider (GitHub, Google Workspace, Okta, Azure AD, etc.)

## Implementation Overview

Here's what we'll set up:

1. Configure an Identity Provider (IdP) in Cloudflare Zero Trust
2. Create an Access Application to protect your admin routes
3. Define Access Policies to control who can access what

Let's dive in!

## Step 1: Setting Up Your Identity Provider

First, we need to tell Cloudflare how to authenticate users. In this example, we'll use GitHub as our IdP since most developers already have GitHub accounts and it's straightforward to set up.

> [!NOTE]
> Cloudflare Access supports multiple providers including Google Workspace, Okta, Azure AD, and even simple one-time PINs. If your organization uses Google Workspace, you can restrict access to only users within your workspace domain - same principle applies.

```hcl title="cloudflare-access.tf"
resource "cloudflare_zero_trust_access_identity_provider" "github" {
  account_id = var.cloudflare_account_id
  name       = "GitHub"
  type       = "github"
  config {
    client_id     = var.github_oauth_client_id
    client_secret = var.github_oauth_client_secret
  }
}
```

To get your GitHub OAuth credentials:

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Set the Authorization callback URL to `https://<your-team-name>.cloudflareaccess.com/cdn-cgi/access/callback`
3. Copy the Client ID and generate a Client Secret

> [!TIP]
> You can find your team name in the Cloudflare Zero Trust dashboard under Settings → Custom Pages.

## Step 2: Creating the Access Application

Now, let's create an Access Application that protects your admin dashboard. This tells Cloudflare which URLs should be protected.

```hcl title="cloudflare-access.tf"
resource "cloudflare_zero_trust_access_application" "admin_dashboard" {
  account_id = var.cloudflare_account_id
  name       = "Admin Dashboard"
  domain     = "admin.example.com"

  allowed_idps = [cloudflare_zero_trust_access_identity_provider.github.id]

  type                  = "self_hosted"
  session_duration      = "24h"
  app_launcher_visible  = true
}
```

If your admin routes are under a path like `/admin` rather than a subdomain, you can use a wildcard:

```hcl title="cloudflare-access.tf"
resource "cloudflare_zero_trust_access_application" "admin_routes" {
  account_id = var.cloudflare_account_id
  name       = "Admin Routes"
  domain     = "example.com/admin/*"

  allowed_idps = [cloudflare_zero_trust_access_identity_provider.github.id]

  type                  = "self_hosted"
  session_duration      = "24h"
  app_launcher_visible  = true
}
```

## Step 3: Defining Access Policies

Policies determine who can access your application. You can restrict access based on:

- GitHub organization membership
- Specific email addresses
- Identity provider groups
- Device posture (WARP client required)
- Geographic location

Here's a policy that only allows users from your GitHub organization:

```hcl title="cloudflare-access.tf"
resource "cloudflare_zero_trust_access_policy" "admin_policy" {
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_zero_trust_access_application.admin_dashboard.id

  name       = "Admin Access Policy"
  precedence = 1
  decision   = "allow"

  include {
    login_method = [cloudflare_zero_trust_access_identity_provider.github.id]
  }

  require {
    github {
      identity_provider_id = cloudflare_zero_trust_access_identity_provider.github.id
      name                 = "your-github-org"
    }
  }
}
```

This ensures only members of your GitHub organization can access the admin dashboard. You can also restrict to specific teams within the organization.

## Adding an Extra Layer: WARP Client Requirement

For even tighter security, you can require that users have the Cloudflare WARP client connected. This essentially creates a VPN-like experience but with zero infrastructure overhead.

**Infrastructure as Code vs. "ClickOps"**

In my [previous guide regarding AWS](/cloudflare-zero-trust-securing-web-app-on-ec2-with-cloudflare-tunnel), I mentioned that I couldn't find a way to configure the WARP client requirement via Terraform at the time, forcing us to resort to "ClickOps" in the Cloudflare console to create the access group.

Well, good news: we can now define the device posture checks and access groups entirely in code. No more manual console work needed.

First, create an Access Group that requires WARP:

```hcl title="cloudflare-access.tf"
resource "cloudflare_zero_trust_access_group" "warp_required" {
  account_id = var.cloudflare_account_id
  name       = "WARP Client Required"

  include {
    device_posture = [cloudflare_zero_trust_device_posture_rule.warp.id]
  }
}

resource "cloudflare_zero_trust_device_posture_rule" "warp" {
  account_id  = var.cloudflare_account_id
  name        = "WARP Client Check"
  type        = "warp"
  description = "Ensure WARP client is connected"
}
```

Then, update your policy to require WARP:

```hcl title="cloudflare-access.tf"
resource "cloudflare_zero_trust_access_policy" "admin_policy_with_warp" {
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_zero_trust_access_application.admin_dashboard.id

  name       = "Admin Access Policy - WARP Required"
  precedence = 1
  decision   = "allow"

  include {
    login_method = [cloudflare_zero_trust_access_identity_provider.github.id]
  }

  require {
    group = [cloudflare_zero_trust_access_group.warp_required.id]
    github {
      identity_provider_id = cloudflare_zero_trust_access_identity_provider.github.id
      name                 = "your-github-org"
    }
  }
}
```

Now users must:

1. Be a member of your GitHub organization
2. Have the WARP client connected

Without meeting both requirements, they can't even see the login page.

## The Provider Configuration

Don't forget to configure the Cloudflare provider:

```hcl title="providers.tf"
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
```

> [!IMPORTANT]
> Store your API token securely. Never commit it to version control. Use environment variables or a secrets manager.

## What Users Will See

Once everything is configured, here's the experience:

1. User navigates to your admin dashboard
2. Cloudflare Access intercepts the request
3. User is redirected to GitHub for authentication
4. After successful authentication, they're granted access

If they don't meet the policy requirements (wrong domain, WARP not connected, etc.), they'll see an access denied page - they won't even get to your application.

## Why Cloudflare Access for Workers?

The beauty of this approach is the **simplicity of integration**. Compare this to my [previous write-up on securing apps on AWS](/cloudflare-zero-trust-security-ec2) where we needed:

- VPC with private subnets
- NAT Gateway (or fck-nat for cost savings)
- Cloudflared containers
- EC2 instances in private subnets
- Tunnel configuration

With Workers, all of that complexity disappears. Your application is already on Cloudflare's edge - adding Access is just a few Terraform resources away.

## Conclusion

Stop exposing your admin dashboards to the public internet. Whether you're running a simple Next.js app or a complex microservices architecture on Cloudflare Workers, Cloudflare Access provides enterprise-grade security without the enterprise-grade complexity (or price tag).

For teams under 50 members, this is essentially free. That's security as a no-brainer.

Till next time, Peace be on you 🤞🏽

#### References

- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [Cloudflare Zero Trust Terraform Provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)
- [GitHub IdP Integration](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/github/)

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
