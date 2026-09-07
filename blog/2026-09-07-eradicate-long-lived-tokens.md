---
slug: eradicate-long-lived-tokens
title: "Eradicate long-lived tokens before they eradicate you"
authors: Abdulmalik
date: 2026-09-07
image: /bgimg/eradicate-long-lived-tokens-cover.webp
tags: [devsecops, github, github-apps, cicd, security, credentials, pats]
description: Long-lived GitHub PATs are a culture failure, not a tooling miss. What a multi-environment PAT campaign illustrated, and the short-lived App token patterns I use in CI so classic PATs stop living in environment secrets.
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

If you are still using classic GitHub PATs in your environments "just for pulling, read or packaging," you are not being pragmatic. You are accepting forever access as normal. That is a culture problem. Tooling only follows.

<!--truncate-->

I keep landing the same conversation, someone wants a token that "just works" for CI, a deploy bot, or a SaaS that pulls private code. The default answer is still a long-lived PAT in a secret store. It works until it shows up in a log, a laptop dump, a leaked env file, or a campaign that clones your private repos in bulk while the token is still valid.

Short-lived credentials are not a niche hardening trick. They are how you stop one leak from becoming permanent access.

## Why this is culture, not tooling

A PAT in an environment secret is convenient. Mint once, paste, forget. That convenience trains the team:

- Nobody asks whether the job needs repo-scoped access for ten minutes or environment-wide access forever
- Fallback PATs stay "temporary" for years
- External systems get a personal token because "the App setup looked hard"
- Rotation becomes a quarterly project instead of a non-event

You can buy scanners and still lose. The failure is treating durable bearer tokens as the default identity model for machines.

Machines should get credentials that expire when the job ends. Humans should not mint forever keys for automation.

## What a PAT compromise actually looks like

[Wiz CIRT published a playbook](https://www.wiz.io/blog/investigating-github-pat-compromise) from investigating a coordinated campaign that abused compromised GitHub PATs across multiple organizations (mid-May through early June 2026). I am not restating their IOCs here. Read their post if you are in IR mode. The shape that matters for prevention is simple:

1. Valid employee PATs showed up in attacker hands
2. Quiet recon against accessible repos came first
3. Low-volume clone checks validated the tokens still worked
4. Then mass `git.clone` traffic pulled private repositories in parallel from cloud IPs

Containment was ugly for the usual reasons. Classic PATs are often hard for environment owners to see and revoke cleanly. Fine-grained tokens are better, but still long-lived if nobody expires them. GitHub's short retention for some git events means if you were not streaming audit logs, reconstructing blast radius gets worse with time. Exfiltrated repos are not "just source." They are often full of cloud keys, SaaS tokens, and internal docs that extend the incident sideways.

Wiz could not pin the initial leak path for that campaign. Endpoint theft is a plausible guess. The lesson I take is not "find the perfect leak vector." It is: **if a long-lived token exists, theft is enough.** You do not need a fancy exploit if the bearer credential never dies.

If your incident response plan assumes you can always find and kill every PAT in minutes, you are planning for hope. Prefer identities where the stolen thing expires on its own.

## Prefer GitHub Apps and installation tokens

A GitHub App installation access token is short-lived (on the order of an hour) and scoped to the App's permissions and the repos you allow. That is the model I want for automation.

What I store as a secret:

- App **client ID** (or App ID, depending on the minting action)
- App **private key** PEM

What I do **not** want stored as the primary clone/push credential:

- Classic PATs
- Fine-grained PATs with no expiry that sit in environment secrets "for CI"
- A human's PAT reused by five workflows and one laptop

At runtime, the workflow signs a JWT with the App key, exchanges it for an installation token, uses that token for the job, and lets it die. Leak the installation token from a log and the window is small. Leak the App private key and you still have a problem, but you rotated one machine identity instead of hunting every PAT an engineer ever created. Scope the App to Contents: Read (or whatever the job needs), not admin-by-default.

Same idea for humans: fine-grained PATs with short expiry beat classic forever tokens. Apps still win for bots and CI.

## Mint in the pipeline, do not warehouse classic PATs

In shared reusable workflows and composite actions, I push this pattern explicitly.

A small composite action whose only job is: **mint a GitHub App installation token, mask it, and only fall back to a long-lived token with a warning.** Callers pass `client-id` + `private-key` (plus owner / optional repo list). If App creds are missing, it can use a fallback PAT so old callers do not break overnight. The workflow log says when you are on the bad path. That warning is intentional. Soft migration beats silent forever PATs.

Concrete places that use it:

- **Cross-repo clone in CI.** Security scans or shared tooling often need private helper repos. Instead of a dedicated clone PAT in environment secrets, a clone helper resolves auth through the App token mint, then `actions/checkout` with that short-lived token. Cache keys are tip SHAs; the credential is not the interesting part of the cache.
- **Private package / VCS deps at image build.** The image-build job mints an App token and builds a temporary package-manager auth blob (Composer `github-oauth`, npm `_authToken`, etc.) for the Docker build. The old long-lived package-auth secret remains as a documented fallback and emits a warning when used. Preferred path is App client ID + private key with Contents: Read.
- **Reusable workflow secrets.** Shared build and frontend workflows take App client ID + private key as the preferred secrets. Older PAT-style secrets are marked deprecated in the workflow interface so adopters migrate without a flag day.

The migration rule I care about: **do not delete the fallback on day one if half the callers still need it. Do make the fallback loud, and stop issuing new PATs for clone/push jobs that an App can do.**

Also stop putting classic PATs in environment secrets "because Amplify / vendor X needs GitHub." Prefer App-based access or vendor OIDC where it exists. If a product only accepts a PAT today, put an expiry on the calendar and treat it as debt, not architecture.

## External systems that pull your code

Anything outside GitHub Actions that needs to clone or fetch private repos gets the same rule:

| Bad default | Better default |
| --- | --- |
| PAT on a laptop, bastion, or forever server env | GitHub App installed for the environment, mint installation tokens in that service |
| Shared "deploy" user PAT in five tools | One App per tool or tightly scoped installation, least permissions |
| "We'll rotate quarterly" | Token TTL measured in minutes/hours; rotation is automatic |

Deploy bots, security scanners, internal portals that mirror repos, codegen services: if they need git access, give them an App (or OIDC federation into your cloud, then short-lived cloud creds). Do not give them a human PAT copied from someone's settings page.

OIDC into AWS / GCP / Azure for cloud access is the sibling habit. Same thesis, different control plane: [keyless image signing](/keyless-signing-container-images-github-oidc/), IRSA / Workload Identity style DB auth against a managed database, no static cloud keys in Actions when federation works. This post stays GitHub-focused, but if you kill GitHub PATs and still leave `AKIA...` in secrets, you only finished half the job.

Light touch on the rest of the zoo: chat-bot tokens, npm tokens, container-registry PATs. Same smell. Prefer expiring or rotatable machine identities. Do not expand scope here; just do not pretend GitHub is the only place forever tokens hide.

## Start here checklist

If you want a culture shift instead of a slide deck:

1. **Inventory** Actions secrets at every scope (shared, repository, and environment) for `PAT`, `GITHUB_TOKEN`-shaped custom secrets, package-auth blobs, clone tokens, deploy tokens. Name the owners.
2. **Classify** each one: human break-glass, CI clone/push, external SaaS, leftover unknown. Unknown gets a kill date.
3. **Stand up a GitHub App** (or reuse one) with least privileges for CI. Contents: Read is enough for many clone-only jobs. Separate Apps if blast radius matters.
4. **Wire minting in reusable workflows** so app teams inherit short-lived tokens without inventing their own secret scheme. Prefer one composite "mint token" action everyone calls.
5. **Deprecate PAT secrets in the workflow interface** with warnings when fallback is used. Keep fallbacks temporarily; stop documenting them as the happy path.
6. **Move external clone consumers** to Apps or OIDC. No new forever PATs for servers.
7. **Expire remaining human PATs.** Fine-grained + short TTL. Ban classic PATs for automation in policy even if GitHub still allows creating them.
8. **Stream GitHub audit logs** somewhere durable. Mass clone and odd ASO / user-agent patterns are how you notice the bad day early. Wiz's post is a good reminder that git event retention is short if you are not streaming.
9. **Practice revoke.** Who can disable an App installation? Who revokes a fine-grained PAT? Write it down before you need it.
10. **Say it in onboarding.** "We do not create classic PATs for bots" beats another wiki page nobody reads.

## Living example

I am not linking a public recipe repo here; the patterns above are the portable part:

- Composite action: App token first, masked output, loud fallback
- Clone helpers and build jobs consume that output, not a stored PAT
- Reusable workflow secrets prefer App client ID + private key
- Deprecated PAT inputs remain only to avoid breaking callers during migration

If you maintain a shared Actions environment, put the minting helper there. Make the wrong path emit <code>{'::warning::'}</code> so the Actions UI surfaces a real annotation. Culture changes faster when the pipeline nags.

For the IR side of PAT abuse, use the [Wiz investigation writeup](https://www.wiz.io/blog/investigating-github-pat-compromise) as the response playbook. Use this post as the prevention argument: stop minting the class of credential that campaign depended on.

## Conclusion

Long-lived tokens feel like glue. They are solvent for attackers. Every classic PAT in an environment secret is a decision that expiry does not matter. Flip that default.

Mint at job time. Scope the App. Expire what must still be a PAT. Treat fallbacks as debt with a warning, not as architecture.

Till next time, Peace be on you 🙏🏽

#### References

- [How to Investigate GitHub PAT Compromise (Wiz)](https://www.wiz.io/blog/investigating-github-pat-compromise)
- [Authenticating as a GitHub App installation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation)
- [actions/create-github-app-token](https://github.com/actions/create-github-app-token)
- Related on this blog: [GitHub Actions supply chain hardening](/github-actions-supply-chain-hardening/), [GitHub access control as IaC](/github-access-control-iac/), [Keyless signing with GitHub OIDC](/keyless-signing-container-images-github-oidc/)

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
