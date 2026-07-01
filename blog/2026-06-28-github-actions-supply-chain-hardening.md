---
slug: github-actions-supply-chain-hardening
title: "GitHub Actions Supply Chain Attacks: How to Actually Harden Your CI/CD Pipeline"
authors: Abdulmalik
image: /bgimg/github-actions-supply-chain-hardening.webp
tags: [devsecops, github-actions, supply-chain, security, cicd, appsec, falco]
description: Pinned SHAs and zizmor are not enough. After tj-actions and NX, here is how to phase static hardening, runtime egress control, and syscall visibility into a CI/CD supply chain program by repo type and budget.
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Your team has pinned every third-party action to an immutable SHA. Runners are GitHub-hosted, ephemeral, isolated. Someone ran zizmor once and filed a ticket. The posture feels done.

<!--truncate-->

Then **tj-actions/changed-files** (CVE-2025-30066) dumped environment variables from thousands of workflows. The NX build system compromise followed. CNCF Backstage and Microsoft's Azure Karpenter Provider pipelines got hit in the same supply chain wave. Pinned SHAs did not save teams who pinned a commit that was already malicious, or who trusted a tag before the hijack.

Static analysis of workflow YAML is necessary. It is not runtime security. Your CI runners handle cloud credentials, signing keys, and production build artifacts with less monitoring than most engineers give their laptops. That gap is where supply chain attacks live.

This post is how I close that gap in practice: what to enforce before a job runs, what to constrain while it runs, and how to phase it in given repo visibility and budget.

## What SHA Pinning and zizmor Actually Cover

**SHA pinning** (`uses: actions/checkout@abc123def...`) protects against tag hijacking. If an attacker retags `v4.2.0` to point at malicious code, your pinned commit does not move. Good control. Two gaps remain:

1. The SHA you pinned may already contain script injection, overpermissioned `GITHUB_TOKEN` usage, or unsafe `${{ }}` interpolation in shell steps.
2. When Dependabot opens a bump PR, nobody reads 400 lines of action diff. You trust the new SHA is safe because the bot said so.

**zizmor** (and similar static scanners) catch dangerous workflow patterns before merge: unpinned actions, excessive permissions, known anti-patterns. That is build-time review of the YAML. It does not see what the runner actually does at execution time: outbound connections, process spawns, memory reads from sibling processes.

You need both **static hardening of action code** and **runtime visibility on the runner**. Different layers.

## The Runtime Gap

Runners execute untrusted code with secrets attached, but rarely get the EDR-style monitoring production hosts have. You need egress control and behavioral visibility on the runner itself. Harden-Runner and Falco Actions are the two approaches I see teams land on first; they are not interchangeable.

### Harden-Runner (StepSecurity)

Purpose-built for GitHub Actions. Monitors outbound network connections, file writes, and process execution correlated to the exact workflow, job, and step. Can **block** egress via domain allowlist.

Standout capabilities:

- **Egress enforcement**: `egress-policy: block` with an allowlist. Most supply chain exfiltration is outbound HTTP. Blocking unknown destinations kills that vector at the network layer.
- **Automated baseline**: learns expected network calls per job and alerts on deviation.
- **Incident track record**: detected the tj-actions compromise, the NX supply chain attack, and related hits in CNCF Backstage and Azure Karpenter Provider pipelines.
- **Self-hosted / ARC**: deploys as a DaemonSet for Actions Runner Controller; audit mode on self-hosted without rewriting every workflow.

Limitations worth knowing:

- Private repo egress **enforcement** and full self-hosted enforcement sit on the **Enterprise (paid)** tier. Public repos get meaningful free-tier coverage today.
- Telemetry goes to StepSecurity's cloud dashboard unless you accept that tradeoff.
- Egress control uses iptables + DNS proxy. CVE-2025-32955 showed bypass paths via sudo and Docker group membership; StepSecurity patched, but the architecture has had edge cases.

Minimal workflow wiring:

```yaml
- name: Harden Runner
  uses: step-security/harden-runner@v2
  with:
    egress-policy: audit   # start here; move to block once allowlist is stable
    allowed-endpoints: >
      github.com:443
      registry.npmjs.org:443
```

Run in **audit** mode first. Build the allowlist from real job behavior. Then switch to **block**.

### Falco Actions (Falcosecurity / CNCF)

Kernel-level syscall tracing via eBPF inside the runner. Open source. Ad-hoc Falco rules tuned for CI/CD supply chain patterns. On pull requests, findings can surface as PR comments.

Two modes:

**Live mode**: `start` and `stop` actions wrap a single job. Falco runs in Docker with the `modern_ebpf` probe. Rule hits print in the job summary.

```yaml
- uses: falcosecurity/falco-actions/start@v0.0.2
  with:
    rules-file: ./falco/ci-rules.yaml
- run: npm ci && npm test
- uses: falcosecurity/falco-actions/stop@v0.0.2
```

**Analyze mode**: captures a `.scap` syscall trace, uploads it as an artifact, and runs a separate `analyze` job. Report includes contacted IPs, DNS names, SHA256 of spawned binaries, container images, written files, optional VirusTotal lookups, and an OpenAI-generated summary.

In the tj-actions exploit, Falco's **Process Dumping Memory of Others** rule would have fired: the attack read another process's memory to dump `GITHUB_TOKEN` and cloud credentials into logs.

Limitations:

- **Sandbox status** in the Falco ecosystem. Early stage, no formal release cadence yet. Promising, not where I would bet critical fintech pipelines alone.
- **Detection only**: no egress blocking. You learn after suspicious behavior, not before exfiltration leaves the runner.
- Analyze mode pulls in OpenAI and VirusTotal unless you trim it. Not air-gap friendly.
- Syscall capture files grow fast. You need `syscall_ignore.config` filtering or artifact storage gets painful.

### Where each one fits

| | Harden-Runner | Falco Actions |
|---|---|---|
| Egress blocking | Yes (tier-dependent) | No |
| Detection | Network + file + process | Kernel syscalls (eBPF) |
| Forensics | Good (enterprise tier) | Deep (scap, process tree) |
| Custom rules | Limited | Full Falco YAML |
| Data residency | StepSecurity cloud | Your runner / artifacts |
| Self-hosted runners | Yes (enterprise for enforce) | Same workflow pattern |
| Maturity | Production, verified marketplace, ~18M runs/week | Sandbox, early-stage |
| PR comments | No | Yes (live mode) |
| Cost | Free tier + paid enterprise | Open source |

**Use both layers, not one or the other.** Block egress where you can. Add syscall visibility for the behavior network controls miss: memory dumping, odd process trees, sensitive file reads.

If budget or bandwidth forces a choice today, start with egress blocking. Prevention beats detection when credentials live on the runner for five minutes. Falco Actions is worth layering onto high-risk workflows, but I would not gate production deploys on it alone yet.

## CargoWall: Open-Source Egress, Early Maturity

[CargoWall](https://github.com/code-cargo/cargowall) (CodeCargo) is the open-source answer to "I want Harden-Runner-style egress control without StepSecurity's cloud or paid private-repo tier."

Technically it is more aggressive than iptables-only approaches:

- DNS proxy intercepts queries, resolves IPs, and applies **TC-layer eBPF** filtering on `eth0`
- Docker is pointed at the same DNS proxy so container egress respects the same rules
- **`sudo-lockdown`** restricts later steps from disabling the firewall and removes the user from the `docker` group to close privileged-container bypass paths (the class of issue that hit Harden-Runner in CVE-2025-32955)

By default it talks to the CodeCargo platform and wants `id-token: write` for OIDC integration. For fintech or any regulated workload, set **`offline: true`** so telemetry stays on the runner.

Honest maturity check: small project, v1.0.0, handful of contributors. You are granting kernel-level network control to a young action. Technically compelling on paper. Enormous trust gap versus Harden-Runner's run volume and incident history.

| | Harden-Runner | CargoWall |
|---|---|---|
| Egress mechanism | iptables + DNS proxy | eBPF TC + DNS proxy |
| Sudo / Docker bypass | Patched post-CVE-2025-32955 | Built-in `sudo-lockdown` |
| Docker egress coverage | Partial | Auto-configured |
| Maturity | ~1.1K stars, verified, 18M runs/week | Early, small community |
| Data leaving runner | StepSecurity cloud | CodeCargo (unless `offline: true`) |

What I'd do: run Harden-Runner in audit mode now and move deploy jobs to block once the allowlist is stable. Pilot CargoWall with `offline: true` on a non-production workflow if private-repo egress enforcement is blocked by budget. GitHub's native [egress firewall](https://docs.github.com/en/enterprise-cloud@latest/admin/managing-your-enterprise-account/configuring-an-egress-firewall-for-your-enterprise) in preview may eventually cover the same ground on GitHub-hosted runners.

## Chainguard Actions: Static Hardening of the Catalog

Runtime monitoring does not fix vulnerable action **source code** at pin time. That gap is what **Chainguard Actions** (preview) is trying to close.

Chainguard ingests widely used marketplace actions, evaluates them against a security ruleset, auto-remediates common failures, and publishes hardened builds. When upstream changes or the ruleset evolves, affected actions get re-hardened without you rewriting workflows by hand.

What it catches that SHA pinning does not:

- Script injection via unsafe `${{ inputs.foo }}` in `run:` blocks
- Secrets passed into shell strings instead of `env:`
- Overpermissioned defaults in popular actions

Real example from their launch: Anthropic's `claude-code-action` had a high-severity injection path. The hardening agent moved the token into an environment variable and referenced it safely in the shell.

Preview catalog: 100+ top marketplace actions, dozens of fixes applied. Each hardened action ships with SBOM and provenance metadata.

Limitation: you are shifting trust from random maintainers to Chainguard's catalog and ruleset. Hardening improves the action as published; it does not fully eliminate risk in upstream dependencies of that action.

Chainguard belongs in the **static layer**, same conversation as pinning and zizmor. It hardens what you invoke before the job runs; it does not replace egress control or syscall visibility on the runner.

None of that runs on the runner during job execution. A hardened `actions/checkout` can still end up in a workflow that exfiltrates secrets at runtime if something else in the job is malicious. Static controls fix **what you invoke**. Egress control and syscall visibility fix **what happens when it runs**. You need both layers.

## What to Turn On Monday

I care less about feature matrices than about **what ships this week** given public vs private repos and whether security budget exists.

| Context | Recommendation |
|---|---|
| **Public repos, want it working today** | Harden-Runner free tier (audit → block). Add zizmor on PRs. Pin SHAs. |
| **Private repos, security budget** | Harden-Runner Enterprise for egress enforce **or** CargoWall (`offline: true`) + Falco Actions on critical workflows |
| **Private repos, no budget, tolerate early-stage risk** | CargoWall (`offline: true`) + Falco Actions live mode. Accept maturity risk. Document it. |
| **Any repo, long-term hygiene** | Watch Chainguard Actions catalog for actions you already use. Replace pinned third-party refs with hardened builds as they appear. |

For multi-product pipelines where cloud environment secrets flow through CI into EKS deploys, I would start here: pinned SHAs and zizmor on every workflow, Harden-Runner in audit mode everywhere, egress **block** on production deploy jobs only. Run Falco Actions analyze mode on a weekly schedule of those same workflows to build a syscall baseline before you trust live mode on PRs.

## How the Layers Fit Together

```
┌─────────────────────────────────────────────────────────────┐
│  Static (pre-run)                                           │
│  SHA pin · zizmor · Chainguard hardened actions · CODEOWNERS│
├─────────────────────────────────────────────────────────────┤
│  Runtime (on runner)                                        │
│  Harden-Runner or CargoWall egress · Falco Actions syscalls │
├─────────────────────────────────────────────────────────────┤
│  Post-incident                                              │
│  Secret rotation · git history rewrite · GitHub PR diff scrub│
│  (see secret cleanup runbook)                               │
└─────────────────────────────────────────────────────────────┘
```

Pinned SHA stopped being sufficient the day maintainers got compromised **before** you pinned. zizmor catches the YAML mistakes. Neither one stops a malicious step from phoning home during the five minutes your job holds AWS credentials.

## Conclusion

Teams that treat GitHub Actions as "already safe because GitHub runs the VM" are one compromised marketplace action away from production keys in a stranger's S3 bucket. tj-actions proved the blast radius is org-wide, not theoretical.

Revise the pipeline supply chain program around three beats: harden what you invoke before the job runs, constrain what the runner can reach while it runs, and keep forensic depth when something still looks wrong. Pinning alone was never the finish line.

Till next time, Peace be on you 🤞🏽

#### References

- [CVE-2025-30066 (tj-actions/changed-files)](https://www.cve.org/CVERecord?id=CVE-2025-30066)
- [StepSecurity Harden-Runner](https://github.com/step-security/harden-runner)
- [Falco Actions](https://github.com/falcosecurity/falco-actions)
- [CargoWall](https://github.com/code-cargo/cargowall)
- [Chainguard Actions](https://www.chainguard.dev/unchained/introducing-chainguard-actions)
- [zizmor](https://github.com/zizmorcore/zizmor)
- [GitHub: Removing sensitive data (PR diff scrub)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Secret cleanup runbook (Notes)](/docs/secret-cleanup-runbook/)

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
