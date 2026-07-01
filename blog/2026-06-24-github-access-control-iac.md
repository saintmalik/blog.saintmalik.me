---
slug: github-access-control-iac
title: "GitHub Access Control at Scale: Why IaC Beats Entra Groups and Manual Grants"
authors: Abdulmalik
image: /bgimg/github-access-control-iac.png
tags: [devsecops, github, iac, opentofu, rbac, security, platform-engineering]
description: A practical guide to managing GitHub teams, repo access, and least-privilege onboarding with OpenTofu, responding to the r/devops thread on whether IaC for GitHub RBAC is even worth attempting.
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

A [Reddit thread on r/devops](https://www.reddit.com/r/devops/comments/1qh6dze/iac_for_github_teams_need_advice/) stuck with me: someone at a 600-developer org with 2,000 repositories, Okta pushing users via SCIM, was redesigning RBAC and asking whether GitHub teams could realistically be managed with IaC. The replies split fast: Entra groups, access-request tickets, [safe-settings](https://github.com/github/safe-settings), Terraform, and one blunt take: **"Don't. Unless you have a full team of Terraform experts."**

<!--truncate-->

<picture>
  <source type="image/webp" srcSet={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/reddit-iac-github-teams-thread.webp`} />
  <source type="image/png" srcSet={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/reddit-iac-github-teams-thread.png`} />
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/reddit-iac-github-teams-thread.png`} alt="Reddit r/devops thread: IaC for GitHub teams - Need advice" />
</picture>

I had been living the opposite answer. Over the past year, our platform team rebuilt GitHub access for a multi-product engineering org using **OpenTofu**, not as a side experiment, but as the authoritative control plane for org membership, teams, and repository permissions. Manual UI changes get reverted on apply. Offboarding is deleting one block in a registry file.

This post is my response to that thread: what actually works, what the skeptics get right, and the patterns worth stealing if you are heading down the same path.

## The Problem We Had Before Code Took Over

For a long time, access at our org looked like what most growing companies settle into: someone gets added to GitHub through SCIM, a manager Slack-messages a platform engineer, a collaborator gets clicked in the UI, and six months later nobody remembers why that person has **maintain** on a service they never touched.

The memorable breaking point was an access review that should have taken an afternoon and took weeks. Engineers who had rotated to a different product still had **push** on repos under their old squad. Contractors kept access after their engagement ended because removal was a separate ticket nobody tracked. A well-meaning lead had been granted **admin** on a repo "just for one deploy" and it was still there a year later.

That overnight, over-granted access pattern is a story of the past for us now, not because we got smarter people, but because we stopped treating GitHub permissions as something you fix in the UI and started treating them as something you declare, review in a PR, and enforce on apply.

## The Options People Usually Pitch

| Approach | What it solves | Where it breaks at scale |
|---|---|---|
| **Entra / Okta SCIM → GitHub** | Org membership, maybe coarse team sync | Does not encode repo-level tiers, contractor access, or clean offboarding across hundreds of repos |
| **Manual access requests** | Human judgment on edge cases | Does not scale; no durable audit trail; stale access after role changes |
| **Per-repo CODEOWNERS** | Path-level review routing in a single repo | Does not manage who has push access; rots across hundreds of repos; breaks when groups get too large |
| **safe-settings** | Org-level policy as YAML in a config repo | Good for policy; less flexible for computed RBAC from a user registry |
| **"Just use `gh` CLI"** | Scriptable one-offs | Same data problem: who owns the JSON, who reviews changes, what happens on offboard? |

The Entra-only answer is the most common and the most incomplete. SCIM gets a human into your GitHub org. It does **not** answer: which repos should they push to, what happens when they move from the Atlas squad to the Nova squad, or how you revoke everything in one shot when they leave on Friday afternoon.

IaC does not replace your IdP. It replaces the **authorization policy layer** GitHub never got from HR.

## Why a Dedicated GitHub Module (Not Scattered Resources)

A common early mistake is sprinkling `github_team_repository` blocks across dozens of service repos or burying access inside application Terraform. That works until you have more than thirty repositories and three product lines, then nobody can answer "who has push on what" without grep archaeology.

We keep GitHub org governance in **one module inside our infra monorepo**, alongside AWS and security tooling: same PR workflow, same production branch, separate state file. Not Terragrunt nesting for nesting's sake. One bounded domain: org settings, teams, repo ACLs, membership.

Why isolate it instead of mixing with app stacks?

1. **Different lifecycle**: a microservice deploy should not require a plan that touches 100 repo permissions.
2. **Different owners**: platform/security owns the policy model; product teams propose registry edits, they do not apply them.
3. **Different blast radius**: one bad module change should not take down compute; one bad access change *should* be visible in a single plan diff.
4. **Brownfield import**: consolidating years of UI-clicked collaborators into one authoritative resource is a migration project. You want that in one place.

If you are starting fresh, you could name the folder anything (`platform/github`, `org-access`, `identity/github`). The pattern matters more than the path: **registries + computed resources + one apply pipeline**.

**Stack:**

- **OpenTofu** with the `integrations/github` provider
- Flat module layout: registries and computed locals, no deep module tree
- **S3 + KMS** remote state
- PR → `tofu plan`, merge to a production `iac` branch → `tofu apply`
- No staging environment: the plan in the PR *is* the review gate

**Philosophy we wrote down internally:**

> Any manual change in the GitHub UI gets detected and reversed on the next apply. If someone is not in the registry, they should not have access.

That sounds aggressive. It is also the only way we stopped shadow admins and mystery collaborators from accumulating.

## The Registry Model

Instead of scattering resources, we centralised three registries:

1. **`user_registry.tf`**: employees, GitHub handle, role profile, product assignments
2. **`repo_registry.tf`**: every managed repo, description, visibility, **topics**
3. **`collaborator_registry.tf`**: external people who never get an org seat

Onboarding an engineer is one PR:

```hcl
"alice" = {
  github_user = "alice-dev"
  github_role = "software_eng"
  teams       = ["atlas"]
  products    = ["atlas"]
}
```

Offboarding is deleting that block. The next apply removes org membership, team memberships, and every repo collaborator entry derived from their profile.

### Multi-product and per-product role overrides

People move. Squads overlap. A tech lead on one product and an IC on another:

```hcl
"bob" = {
  github_user = "bob-lead"
  github_role = "software_eng"
  teams       = ["atlas", "nova"]
  products    = ["atlas", "nova", "compass"]
  product_roles = {
    "compass" = "eng_manager"
    "nova"    = "eng_manager"
  }
}
```

The `product_roles` map lets one human carry different permission tiers on different products without duplicating their registry entry or creating a bespoke team per person.

## Interns: Least Privilege by Default

The Reddit thread worried about squad-level groups breaking on HR churn. Interns were a sharper problem for us: you do not give a summer hire the same repo footprint as a staff engineer because their manager said "add them to the team."

We split intern handling into **role profiles** with explicit least-privilege rules:

| Intern role | Org team membership | Repo access |
|---|---|---|
| `software_eng_intern` | Product parent team only | **Read** on their product repos; **write** only via an explicit `repos` allowlist |
| `devops_intern`, `qa_intern`, `dataops_intern` | Global **Interns** team | **Read-only** across all repos, for shadowing, not shipping |

A software intern on the Atlas product does **not** land in `atlas-Devs` (the write tier). They get read through the parent product team. If they need push on one service for a scoped task, you add a keyed allowlist, not a promotion to the full dev tier:

```hcl
"carol-intern" = {
  github_user = "carol-intern"
  github_role = "software_eng_intern"
  teams       = ["compass"]
  products    = ["compass"]
  repos = {
    "compass-web" = "push"   # one repo, one permission, nothing else
  }
}
```

The logic that builds dev-team membership explicitly skips anyone with a non-empty `repos` allowlist, so you cannot accidentally inherit write on every Atlas repo through the `-Devs` sub-team:

```hcl
# Dev tier membership: skipped when a surgical repos allowlist is in play
product_dev_memberships = flatten([
  for u_key, u_val in local.users : [
    for product in u_val.products : {
      username = u_val.github_user
      team_key = "${product}-devs"
      team_id  = github_team.product_devs[product].id
      role     = "member"
    } if product != "*" &&
       contains(local.dev_roles, lookup(u_val.product_roles, product, u_val.github_role)) &&
       length(lookup(u_val, "repos", {})) == 0
  ]
])
```

When the internship ends, delete the registry block. No separate cleanup pass across forty repos.

## Group Sizing: Squad-Level, Tiered Sub-Teams

Direct answer to the Reddit question about BU-level vs squad-level groups.

**Do not** create one division team with 400 people and point review routing at it. Reviewer fatigue, notification noise, zero meaningful ownership.

**Do** create a **product parent team** plus two computed sub-teams per product:

| Team | Repo permission | Who lands here |
|---|---|---|
| `atlas` | `pull` (read) | Anyone with that product in their `products` list |
| `atlas-Devs` | `push` (write) | `software_eng`, `qa`, `devops`, `dataops` roles |
| `atlas-Leaders` | `maintain` | `eng_manager`, `tech_lead` |

Sub-teams are generated with `for_each`. You do not hand-maintain membership on each:

```hcl
resource "github_team" "product_devs" {
  for_each    = toset(local.product_keys)
  name        = "${each.value}-Devs"
  description = "Developers for ${each.value}"
  privacy     = "closed"
}
```

Membership is computed from the user registry and applied through one authoritative team membership resource. When HR moves someone from Atlas to Nova, you change **one** `products` list in their registry entry. Team membership and repo access recompute.

### HR changes: honest expectations

I will not pretend IaC auto-syncs from your HR system. Our user registry is **PR-maintained**, parallel to (not replaced by) our cloud identity registry in the same monorepo. That is operational toil, but bounded, reviewable toil with a git blame line on every access change.

SCIM solves identity delivery. **IaC solves authorization policy.** Conflating the two is why people think GitHub IaC "does not work."

## Topics, Not Per-Repo ACL Lists

The scaling trick: **never grant a team access to a repo by naming that repo in the team resource.** Tag the repo instead.

```hcl
"atlas-api" = {
  description = "Core API for the Atlas product"
  visibility  = "private"
  topics      = ["atlas"]
}
```

A `team_topics` map bridges team keys and topic strings where legacy naming diverges:

```hcl
team_topics = {
  "atlas"   = "atlas"
  "compass" = "compass-core"   # team key != topic string; document the alias
}
```

From topics, locals compile tiered access (base read, dev write, leader maintain, platform admin), then **deduplicate by highest permission**:

```hcl
permission = (
  contains([...], "admin")    ? "admin" :
  contains([...], "maintain") ? "maintain" :
  contains([...], "push")     ? "push" : "pull"
)
```

One authoritative collaborator resource per repo replaces dozens of fragmented UI grants:

```hcl
resource "github_repository_collaborators" "authoritative_access" {
  for_each   = github_repository.repos
  repository = each.key

  dynamic "team" {
    for_each = lookup(local.repo_teams_map, each.key, [])
    content {
      team_id    = team.value.team_id
      permission = team.value.permission
    }
  }

  dynamic "user" {
    for_each = lookup(local.repo_users_map, each.key, [])
    content {
      username   = user.value.username
      permission = user.value.permission
    }
  }
}
```

We migrated to this with a dedicated state move script, brownfield pain you hit once. Worth it. This is the mechanism that made "someone still has admin from last year" a plan diff instead of a spreadsheet row you argue about in an audit.

## External Contractors Without Org Seats

Contractors, auditors, and short-term vendors are a different class of identity. They should not consume an org seat. They should not inherit product-wide write because someone added them to a Slack channel.

We keep them in a **separate collaborator registry**. Access is granted by **topic intersection**: the contractor declares which topic areas they work in, and they only see repos whose topics overlap:

```hcl
contractors = {
  "external-auditor" = {
    github_user = "external-auditor"
    permission  = "push"
    topics      = ["dataops"]
  }
  "vendor-contractor" = {
    github_user = "vendor-contractor"
    permission  = "push"
    topics      = ["engineering"]
  }
}
```

The compiled mapping:

```hcl
contractor_repo_mappings = flatten([
  for u_key, u_val in local.contractors : [
    for repo_name, repo_config in local.repositories : {
      username   = u_val.github_user
      repo_name  = repo_name
      permission = u_val.permission
    } if length(setintersection(toset(repo_config.topics), toset(u_val.topics))) > 0
  ]
])
```

No org membership. No SCIM provisioning. No accidental visibility into repos outside their topic scope. When the contract ends, delete the block, same as an employee.

Before this model, contractors were often invited repo-by-repo in the UI. Removal was inconsistent. Now it is the same PR workflow as everyone else.

## Why We Dropped Per-Repo CODEOWNERS (and Use Org Rulesets Instead)

The Reddit poster asked about group size partly because of **CODEOWNERS**: at the BU level, groups get too big to be meaningful reviewers; at the squad level, HR churn makes the files stale. That is the right instinct. CODEOWNERS is often treated as the answer to GitHub governance, but it solves a **narrow** problem and creates a **second** source of truth if you are already managing teams in IaC.

Two problems get conflated:

| Problem | What you are really asking | Wrong default tool |
|---|---|---|
| **Access** | Who can clone, push, or admin this repo? | CODEOWNERS (it does not control this at all) |
| **Approval** | Who must sign off before merge? | Per-repo CODEOWNERS files across the org |

**CODEOWNERS is not the best org-wide strategy** once you pass a handful of repos and rotating squads. It is a path-to-team map inside each repository. That means:

- Every new repo needs a file maintained alongside your team membership.
- When someone moves squads, you update IaC **and** hunt down every CODEOWNERS file they appear in.
- Pointing CODEOWNERS at a 200-person BU group satisfies the letter of "required review" but not the spirit: random pings, rubber stamps, audit theater.
- Squad-sized groups in CODEOWNERS are better, but the file still drifts from the teams your registry already defines.

We did not drop CODEOWNERS because it is bad software. We dropped **org-wide reliance on it** because our IaC registries already define who belongs to which squad teams. Duplicating that in hundreds of `CODEOWNERS` files was pure toil.

For **approval gates**, we use [GitHub organization rulesets](https://docs.github.com/en/organizations/managing-organization-settings/managing-rulesets-for-repositories-in-your-organization) instead: org-level branch rules that apply across repo sets, with required reviewers assigned to **teams** (leadership, platform, product leads) rather than paths in a file. Conceptually:

- **Default branches** get a baseline review requirement (no direct push, at least one approving review).
- **Production branches** (`main`, `prod`, `production`, and common variants) get stricter gates on repos that match product or platform classifications.
- **Repo targeting** follows the same topic/metadata logic as access control, so a new Atlas-tagged repo picks up Atlas-appropriate gates without anyone adding a CODEOWNERS file.
- **Status checks** (secret scan, SAST, SCA) can be required as part of the same ruleset where your CI is ready for it.

Rulesets live in the same IaC module as teams and repo ACLs, but the idea is portable: central policy, no per-repo file sprawl, reviewers tied to teams you already maintain in the user registry.

CODEOWNERS still has a place for **path-specific ownership inside a single complex repo** (e.g. `@platform-team` for `/infra/` only). We just stopped pretending it could be our enterprise RBAC and review strategy across hundreds of repositories.

## Addressing the "Don't Use Terraform" Crowd

The skeptic on that thread said: unless you have Terraform experts, use `gh` CLI with a JSON file.

They are half right.

**What they get right:**

- GitHub RBAC is not cloud infrastructure. Treating it like a generic module farm invites complexity.
- Things that change hourly belong in an IdP, not in a forty-minute apply pipeline.
- You need humans who understand the **policy model**, not just HCL syntax.

**What they miss:**

- A JSON file parsed by shell scripts has the same review problem as HCL, except worse tooling, no plan diff, and no drift reconciliation.
- `gh api` does not give you authoritative state. Someone clicks "Add collaborator" in the UI and your JSON is a lie until someone notices.
- At 2,000 repos, "the PO manages Entra group membership" still does not tell GitHub which repos get `push` vs `pull`.

Our compromise: **registries that read like config, OpenTofu as the enforcement engine, PR review as the approval workflow.** Platform owns the module. Engineering managers propose registry edits for their squads. Security reads the plan output.

This is a **team sport**. One person cannot hold the entire user registry in their head. We split ownership: squad leads propose, platform applies, security watches the diff.

## Workflow That Actually Ships

```
Engineer needs access
  → PR to user_registry.tf (or ticket → platform PR)
  → CI runs tofu plan
  → Human reads plan diff in PR
  → Merge to iac branch
  → Auto apply
  → GitHub state matches code
```

We still keep a lightweight requests repo for intake. Requests do not auto-grant; they become registry PRs. The ticket log and the git history serve different audit purposes.

Drift detection outputs repos that exist in the org but not in `repo_registry.tf`. Same philosophy as the user registry: **if it is not in code, it should not exist.**

## Lessons We Learned the Hard Way

1. **Import brownfield before preaching "code is law."** Import blocks and a migration script to consolidate fragmented collaborator state. One big bang without that would have been career-limiting.

2. **Topic typos are ACL bugs.** When team keys and repo topics diverge, document the alias map or someone will push code nobody on the squad can reach.

3. **`lifecycle { ignore_changes = [...] }` on repos** tamed noisy plans after adoption, but it also means topics on legacy repos may not enforce until you revisit that block. Know what you ignored.

4. **Temporary overrides in code are debt.** Escalations map is the cleaner escape hatch for time-bound elevation:

   ```hcl
   escalations = {
     "platform-lead" = { github_role = "admin" }
   }
   ```

5. **Intern read on all repos** for certain intern roles is a conscious tradeoff: broad visibility for shadowing, no write. Document it in your threat model.

6. **Parallel cloud identity registry** means dual maintenance until you unify. We accept that cost for now. GitHub policy and cloud policy share the same PR workflow even if the data is duplicated.

## When IaC Is the Wrong Tool

Skip full GitHub IaC if:

- You have fewer than ~30 repos and a stable team: Entra group → team sync may be enough.
- You cannot get merge rights on a production branch with mandatory plan review.
- Nobody will own offboarding registry deletes: IaC makes nothing worse, but also nothing better.
- You want HR-driven auto-provisioning with zero human PR: that is a different problem, and you will still need a policy engine somewhere.

## Completion criterion

Before you call this migration done, you should be able to:

1. Onboard an engineer with one registry PR.
2. Offboard an engineer with one registry deletion.
3. See any manual UI change reverted by the next `tofu apply`.
4. Explain how topics decide repo access for dev, leader, and intern tiers.
5. Show a plan diff for every access change before it reaches `main`.
6. Demonstrate that contractors have access only to repos matching their declared topics.

## Conclusion

The Reddit question was not "can Terraform talk to the GitHub API?" Of course it can. The question was **how you manage the combinatorics** (people × products × repos × contractors × offboarding) without UI drift and without granting access that outlives the reason it was granted.

IaC for GitHub teams is not only possible. For a multi-product org with serious audit requirements, it is the most maintainable option we found, **if** you invest in registries, tiered squad teams, topic-driven access, least-privilege intern handling, org-level rulesets for review gates, and a culture where the plan diff is the approval artifact.

The `gh` CLI crowd and the Entra-only crowd are optimising for different scales. At 600 developers and 2,000 repos, you need the policy in git.

Till next time, Peace be on you 🤞🏽

#### References

- [Reddit: IaC for GitHub teams - Need advice](https://www.reddit.com/r/devops/comments/1qh6dze/iac_for_github_teams_need_advice/)
- [GitHub Terraform Provider](https://registry.terraform.io/providers/integrations/github/latest/docs)
- [GitHub Organization Rulesets](https://docs.github.com/en/organizations/managing-organization-settings/managing-rulesets-for-repositories-in-your-organization)
- [About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [github/safe-settings](https://github.com/github/safe-settings)
- [Terramate GitHub-as-Code example](https://github.com/terramate-io/terramate-github-as-code)
- [OpenTofu](https://opentofu.org/)

**Cover photo:** [Kylian Mbappé with the 2018 World Cup trophy](https://commons.wikimedia.org/wiki/File:Kylian_Mbapp%C3%A9_with_the_2018_Soccer_World_Cup_trophy.jpg) by Edgar Brechanov / soccer.ru, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Additional options in `static/bgimg/`: `mbappe-best-young-player-2018.jpg` (CC BY-SA 3.0), `mbappe-2017.jpg` (CC BY 4.0, Biser Todorov).

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
/>
