---
slug: vpn-vs-ztna-art-of-the-rabona
title: "Zero Trust Network Access vs VPN: The Art of the Rabona"
authors: Abdulmalik
image: /bgimg/vpn-vs-ztna-access-control.webp
tags: [devops, devsecops, appsec, security, cloudflare, vpn, wireguard, zero-trust]
description: WireGuard and OpenVPN get you inside the network. Zero Trust keeps you at the door of each app. Here is how I pick between them, and why teams under 50 often just reach for cloudflared.
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

A rabona is not the obvious pass. You wrap your leg behind the standing one, hit the ball at an awkward angle, and somehow the play opens up anyway. VPN vs Zero Trust feels like that at first, same pitch, different move entirely.

<!--truncate-->

Hand me a VPN and I will ask for Zero Trust Network Access (ZTNA) to be deployed or bought alongside it, *if* that stack has the option. WireGuard with an identity layer. OpenVPN with a ZTNA add-on. Some orgs already run the tunnel, they just need the philosophy bolted on top.

If the VPN has no ZTNA path, skip the negotiation. Hand me a proper ZTNA instead.

And if you are a startup with fewer than fifty staff? I am picking **cloudflared**. Full stop.

Cloudflare Zero Trust gives you fifty authenticated seats free.

## Not the Same Game

Comparing WireGuard or OpenVPN for internal infrastructure access to Zero Trust is not an apples to apples vendor bake-off. WireGuard and OpenVPN are secure connection tools, encrypted tunnels. Zero Trust is a security philosophy: *never trust, always verify.*

WireGuard is fast and lightweight. OpenVPN is familiar and everywhere. Neither one, on its own, solves the access control problem. They get you connected. ZTNA decides what you are allowed to reach once you are.

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/vpn-vs-ztna-access-control.webp`} alt="VPN flat access vs ZTNA app-level access"/>
  <source type="image/png" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/vpn-vs-ztna-access-control.png`} alt="VPN flat access vs ZTNA app-level access"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/vpn-vs-ztna-access-control.png`} alt="VPN flat access vs ZTNA app-level access"/>
</picture>
<p style={{ color: 'green' }}>Booking app yes. Call password app and unprotected Power BI no.</p>
</Figure>

Once you log into a traditional VPN, you are *inside* the network. Broad access. Implicit trust. A compromised laptop becomes a free pass to wander.

### The VPC Time Bomb

This is where WireGuard and OpenVPN hurt the most on any cloud VPC.

You spin up a VPN, maybe on a bastion, maybe AWS Client VPN, maybe a WireGuard peer in the VPC, and the moment someone connects, they inherit routing into the whole private network. Not just the app their team owns. *Everything* in that VPC.

Say you are on customer support. You need the **booking app**. You do not need the **call password app**. You definitely do not need the **data team Power BI server** that nobody bothered to put a password on. With a flat VPN route table, you can reach all three anyway. That should not be allowed, but it is.

Someone runs `nmap` on a quiet Tuesday and maps services that have nothing to do with their job. That is a time bomb sitting in your network:

- **Over-permission by default**: access is network-wide, not role-based
- **No app boundary**: you are trusted everywhere once the tunnel is up
- **Discovery is trivial**: ping, port scan, hit internal DNS names you were never meant to know about
- **Blast radius on compromise**: one stolen laptop, one malware infection, and the attacker is already past the front door with keys to the whole floor

ZTNA flips that. You authenticate continuously. You reach only the applications your policy allows. Lateral movement gets choked by micro segmentation. Your attack surface shrinks because nothing listens on the public internet, traffic goes *out* through a tunnel, not *in* through open ports.

| | WireGuard / OpenVPN (Traditional VPN) | Zero Trust (ZTNA) |
|---|---|---|
| **Trust model** | Trust but verify: authenticate once, roam wide | Never trust, always verify: identity and context, constantly |
| **Access scope** | Entire local network | Specific applications only |
| **Lateral movement** | High: one breach, many targets | Restricted: segmentation limits the blast radius |
| **Attack surface** | Larger: inbound ports often exposed | Smaller: apps hidden behind outbound-only tunnels |
| **Traceability / audit** | Connection logs at best: who joined the network, not what they touched | Per-app access logs, identity-bound audit trail |
| **Identity / offboarding** | Separate VPN credentials: another account to provision, rotate, and revoke | Existing IdP (Google, GitHub, Okta) is the source of truth |
| **Implementation** | Familiar, fast to stand up | Heavier: IdP, posture checks, policy design |

They are not mutually exclusive. Many shops run both: WireGuard or OpenVPN as the encrypted pipe, Zero Trust as the gatekeeper at every door.

## WireGuard + ZTNA: Speed Without the Sprawl

Combining the lightweight speed of WireGuard with ZTNA replaces legacy, all-or-nothing VPNs with identity-driven, application-level access. You verify users and devices continuously while routing traffic efficiently through a secure, encrypted overlay network.

This is the sweet spot a lot of teams miss. They deploy raw WireGuard because it is fast, then hand out static keys and route everyone into the same subnet. Fast tunnel, same time bomb.

Traditional VPNs give broad network access once a user is authenticated. WireGuard + ZTNA changes the model:

- **Micro-segmentation**: instead of dropping a user onto the local network, you are securely bridged only to the specific applications and resources you are authorized to use
- **No default trust**: trust is never assumed. Access control is continuous and based on real-time identity, context, and device security
- **Enhanced WireGuard**: base WireGuard relies on static keys and has no built-in access controls. ZTNA solutions wrap WireGuard with dynamic key exchange, single sign-on (SSO), and multi-factor authentication (MFA) to make it enterprise-ready

Raw WireGuard on a VPS is fine for a homelab. For a team accessing production infrastructure, you want the protocol plus the policy layer.

### Popular WireGuard-Based ZTNA Platforms

**Tailscale** is the one I see most in the wild. It is a peer-to-peer mesh built on WireGuard that integrates with identity providers like Google, GitHub, and Okta to manage granular access policies. You get WireGuard performance without manually swapping keys every time someone joins or leaves. ACLs define who reaches what. Offboarding ties back to your IdP.

**Twingate** takes a similar approach: WireGuard under the hood, identity and policy on top, outbound-only connectors in your VPC so nothing listens on the public internet.

Both replace "here is your `.conf` file, you can reach the whole subnet" with "you are this user, you can reach these resources, everything else is invisible."

For web-facing internal apps specifically, cloudflared and Cloudflare Access still win on simplicity. For teams that need TCP/UDP access to private hosts, databases, or SSH into boxes across a VPC, WireGuard-based ZTNA is often the right rabona.

### Your IdP Is the Source of Truth

This is one of the benefits I care about most, and it rarely gets talked about next to the tunnel diagrams.

With a traditional VPN, you usually create *another* access layer on top of everything else: VPN usernames, WireGuard static keys, client certificates, shared `.ovpn` profiles, a separate admin console to disable someone when they leave. Your source of truth for *who works here* lives in Google Workspace or GitHub. Your source of truth for *who can reach internal infrastructure* lives somewhere else entirely. Two systems. Two offboarding checklists. Plenty of room to forget one.

ZTNA ties access directly to the identity your team already has. Staff authenticate with their work Google account, their GitHub org membership, or whatever IdP you already run. No new parallel credentials. No "here is your VPN password" onboarding step. The people who can reach internal apps are exactly the people you have in those systems, nothing more.

When someone leaves, you revoke their work Google or GitHub access and you are done. Internal dashboards, admin panels, private APIs behind Cloudflare Access, all of it drops away with that single action. You are not chasing down a WireGuard key or VPN cert that still works because nobody remembered to rotate it.

That is what *never trust, always verify* looks like in practice. Not a slogan on a slide. One identity. One revocation path. No ghost access sitting in a VPN config file.

## My Picking Order

**1. VPN with a ZTNA upgrade path**

Legacy network access, site-to-site between offices, quick remote access for a team that already runs WireGuard or OpenVPN, fine. But if the platform offers ZTNA on top (Tailscale ACLs, Twingate policies, a managed ZTNA layer), turn it on. You keep the tunnel and lose the implicit trust.

**2. Proper ZTNA when the VPN cannot grow up**

Distributed workforce, sensitive data, cloud-heavy stack, compliance asking *who accessed what and when*, you want application-level access, not network-level roaming. ZTNA wins on visibility alone: authentication logs, gateway inspection, tunnel audit trails, admin activity stamped with actor and timestamp.

**3. Pick by access type**

- **Web apps and dashboards**: cloudflared + Cloudflare Access. Outbound tunnel, IdP in front, fifty free seats.
- **Private hosts, SSH, databases, TCP/UDP across a VPC**: WireGuard-based ZTNA like Tailscale or Twingate. Fast overlay, identity-driven ACLs, no flat subnet access.
- **Enterprise AWS with existing Cisco estate**: Resource Connectors and Secure Client ZTA.

This is the rabona for startups on web apps: no inbound firewall rules, a lightweight daemon on your server dials *out* to Cloudflare's edge, Cloudflare Access sits in front with Google, GitHub, or whatever IdP you already use. Fifty seats free. When you outgrow that, it is seven dollars per user per month.

I have written about this stack before: securing apps on <a href="https://blog.saintmalik.me/cloudflare-zero-trust-security-ec2/" target="_blank">EC2 with Cloudflare Tunnel</a> and protecting <a href="https://blog.saintmalik.me/cloudflare-access-workers-for-internal-apps/" target="_blank">internal apps on Cloudflare Workers with Access</a>. Same principle, different landing zone.

## When a Plain VPN Still Makes Sense

Not every org needs Zero Trust on day one.

- Branch offices that need site-to-site connectivity
- Teams that must reach legacy file servers and intranets on the LAN

Choose VPN when the job is *get me onto the network*. Choose ZTNA when the job is *get me to this app, verify me again tomorrow, and log every attempt*.

## The Free-Tier Reality Check

If you are weighing managed ZTNA on a budget for web apps, Cloudflare Zero Trust gives you fifty authenticated users free. That is the number that matters for most early-stage teams shipping internal dashboards and admin panels.

For WireGuard-based ZTNA, Tailscale and Twingate both have free tiers worth evaluating depending on user count and whether you need mesh networking or connector-based access. The exact seat limits change, but the pattern holds: identity-bound access without standing up your own VPN server.

## Why ZTNA Wins on Visibility

One thing traditional VPNs struggle with: telling you *who* did *what* after someone connects.

With OpenVPN or WireGuard into a VPC, you usually get a connection log: user X connected at 09:14, disconnected at 17:02. Maybe source IP. That is it. You know someone entered the building. You do not know which doors they opened, which internal endpoints they pinged, or whether they touched an app outside their team.

Good luck building an audit trail from that when compliance asks *who accessed this internal service on this date*. VPN logs rarely tie identity to individual application requests. Security groups and VPC Flow Logs help, but stitching *this VPN session* to *this specific internal call* is painful, if you even have flow logs enabled and retained.

What about traceability, audits, and the rest? ZTNA was built for that question.

Cloudflare Zero Trust breaks this down cleanly:

- **Access authentication logs**: who logged in, when, which device posture checks they passed, which apps they tried to reach
- **Gateway logs**: HTTP, network, and DNS requests inspected and logged with allow/block context
- **Tunnel audit logs**: when a cloudflared connection starts, stops, or registers a new DNS record
- **Admin activity logs**: every dashboard change stamped with the actor and a timestamp

On the free plan, admin logs stick around for eighteen months. Detailed request logs (HTTP, network, Access) are kept for twenty-four hours. Need longer retention for SOC2 or ISO 27001? Stream them out via Logpush to S3, GCS, Splunk, or Datadog.

That traceability is the whole point. A VPN puts you inside the walls. ZTNA records every knock on every door.

## Beyond cloudflared: Enterprise Options for AWS

cloudflared is the rabona for startups. But if you are on AWS with budget, existing Cisco estate, or a security team that wants a vendor-backed SSE stack, there are proper ZTNA paths that do not require handing everyone the keys to the whole VPC.

**Cisco Secure Access + Resource Connector**

Cisco Secure Access (their Security Service Edge platform) replaces the old "VPN first, ask questions later" model with client-based Zero Trust Access. You deploy **Resource Connectors**, VMs in your AWS environment (available on AWS Marketplace), that forward user traffic to private apps *without* opening inbound firewall ports. Users connect through **Cisco Secure Client** (formerly AnyConnect) with the ZTA module: micro-tunnels per application, authentication and posture checks per session, not just at connect time.

The connector sits inside your VPC the way cloudflared sits on your server, but the policy engine, identity integration, and audit story live in Cisco's cloud. Good fit when you already run Cisco networking, need TCP/UDP beyond HTTP, or want to migrate off VPNaaS without ripping out a client your org already trusts.

**AWS-native options**

- **AWS Client VPN**: managed OpenVPN endpoint into your VPC. Easy to stand up, same fundamental problem: you are on the network, not at the app. Pair it with strict security groups and hope your team does not need to ping half the VPC.
- **AWS Verified Access**: AWS's own ZTNA play for application-level access without a traditional VPN. Worth evaluating if you want everything inside the AWS console and IAM/OIDC-native policies.

**Other ZTNA vendors on AWS**

Tailscale and Twingate lead on the WireGuard side. Palo Alto Prisma Access and Zscaler Private Access cover the enterprise SSE stack. All solve the same core problem: identity-bound access to specific resources, outbound-only connectors, audit logs tied to users and apps. Pick based on IdP fit, protocol support, and whether your team already pays for an SSE bundle.

The pattern is the same across all of them. Stop routing humans into the VPC. Route humans to the apps they need, log every attempt, and keep everything else invisible.

## Use Them Together

You can build a modern Zero Trust architecture that uses WireGuard or OpenVPN as the underlying encrypted tunnel, enhanced with identity-based segmentation and continuous authentication on top.

VPN for the pipe. ZTNA for the policy. Not either/or unless your team size and app surface make the choice obvious.

## Conclusion

Hand me a VPN, I will ask for ZTNA on top if it supports it. No ZTNA option? Skip to proper Zero Trust. Under fifty staff on web apps? Just deploy cloudflared. Need WireGuard speed with identity policy? Look at Tailscale or Twingate.

The rabona is not showboating. It is picking the move that opens the play when the straight pass is blocked. For most early-stage teams, that move is not another VPN server. It is an outbound tunnel, an identity gate, and fifty free seats.

Till next time, Peace be on you 🤞🏽

#### References

- [Cloudflare Zero Trust Documentation](https://developers.cloudflare.com/cloudflare-one/)
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [Tailscale Documentation](https://tailscale.com/kb/101/what-is-tailscale)
- [Twingate Documentation](https://www.twingate.com/docs/)
- [Cisco Secure Access Resource Connector (AWS Marketplace)](https://aws.amazon.com/marketplace/pp/prodview-oonzvpdnti7jm)
- [Cisco Secure Access: Client-Based Zero Trust Access](https://securitydocs.cisco.com/docs/csa/olh/119971.dita)
- [AWS Verified Access](https://docs.aws.amazon.com/verified-access/latest/ug/what-is-verified-access.html)

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
