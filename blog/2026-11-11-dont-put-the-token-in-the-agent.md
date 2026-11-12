---
slug: dont-put-the-token-in-the-agent
title: "Don't put the token in the agent"
authors: Abdulmalik
date: 2026-11-11
image: /bgimg/dont-put-the-token-in-the-agent-cover.webp
tags: [ai-security, agents, mcp, credentials, appsec, security, github-actions]
keywords:
  - credential broker
  - remote MCP
  - tool gateway
  - agent credentials
  - MCP secret injection
  - brokered egress
description: "Keep GH_TOKEN and cloud keys out of Cursor, Claude Code, and Copilot-style agents. Agent sends tools/call. Remote MCP or a tool gateway holds the secret and calls GitHub or AWS."
faq:
  - question: "Why shouldn't agents hold GH_TOKEN or cloud keys?"
    answer: >-
      Agents dump env, log secrets, and get prompt-injected into tool calls.
      If the token lives in the agent process, one bad step exfiltrates
      forever access.
  - question: "Where should the token live instead?"
    answer: >-
      In a remote MCP server or tool gateway that the agent calls. The agent
      sends tools/call. The broker holds the secret and enforces policy.
  - question: "Does this apply to CI agents too?"
    answer: >-
      Yes. Do not put cloud keys in the job env just because Claude Code or an
      AppSec agent needs GitHub. Broker the call the same way you would for a
      laptop agent.
  - question: "Is remote MCP enough by itself?"
    answer: >-
      It removes the secret from the agent. You still need scoped credentials,
      audit, and deny rules on the broker. Brokered egress is necessary, not
      the whole program.
---

import Giscus from "@giscus/react";
import Figure from '../src/components/Figure';

At work we kept finding the same miss. Product engineering wired Cursor to GitHub with a PAT in the laptop MCP config. CI ran Claude Code or an internal AppSec agent with `GH_TOKEN` or AWS keys in the job env. The agent could open a PR or touch S3. Sandbox looked fine. Then a tool dumped env, a log printed the secret, or a prompt-injected step ran `printenv`. The secret was already inside. The sandbox did not save us.

The fix is not "use OIDC in the deploy job." We already do that. The fix is a visible call path with three named pieces:

1. **Agent.** Cursor, Claude Code, Copilot Chat with MCP, or an internal AppSec agent in CI. Decides. Sends `tools/call`. No durable secret in its env.
2. **Broker.** Separate service. Company remote MCP on ECS / Cloud Run / Kubernetes, GitHub's remote MCP (`https://api.githubcopilot.com/mcp/`), or an egress / tool gateway such as [agentgateway](https://agentgateway.dev/). Secrets live on the MCP task role, server env, or IRSA. Not on the laptop. Not in the agent job env.
3. **Upstream.** Real `api.github.com` or AWS API call leaves from the broker. Agent only ever sees tool args and tool results.

Related:

- [Eradicate long-lived tokens](/eradicate-long-lived-tokens/)
- [MCP security gateways / cMCP](/mcp-security-gateways-cmcp/)
- [You cannot deny every tool and still ship](/you-cannot-deny-every-tool-and-still-ship/)
- [MicroVM runners vs supply chain](/ephemeral-microvm-runners-supply-chain/)

<!--truncate-->

## The failure we kept seeing

A token in the agent process env, in a job secret mapped into that process, or in MCP config next to Cursor is readable by anything that can:

- dump environment
- read the workspace or `mcp.json`
- call a shell tool
- print a debug log

Sandboxing and ephemeral runners shrink host escape and persistence. They do not revoke a secret you already handed the guest. Same line I used for Firecracker-backed runners: [microVMs protect the host; the supply chain still runs inside the job](/ephemeral-microvm-runners-supply-chain/). If `GH_TOKEN` or `AWS_SECRET_ACCESS_KEY` sits in Cursor, Claude Code, or the CI agent step, anything that can env/log/tool-read can steal it.

## The pattern

```
Agent  --tools/call-->  Broker  --session-->  api.github.com / AWS
         (no secret)     (holds secret)         (real upstream call)
```

The agent holds a request. The broker holds the keyring. Upstream sees a real `Authorization` header or SigV4 session. The model sees tool args and tool results. Never the bearer.

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/dont-put-the-token-in-the-agent-broker.webp" />
  <source type="image/png" srcSet="/bgimg/dont-put-the-token-in-the-agent-broker.png" />
  <img src="/bgimg/dont-put-the-token-in-the-agent-broker.png" alt="Diagram: Agent box (Cursor / Claude Code / Copilot) with no GH_TOKEN or AWS key sends tools/call to a separate Broker (remote MCP or tool gateway) that holds the token and calls api.github.com or AWS. Optional OIDC/IRSA mints into the broker only." />
</picture>
<p>Agent asks. Remote MCP or tool gateway calls GitHub or AWS. Durable secret never sat in the agent box. OIDC or IRSA, if you use them, mint into the broker. They are not a substitute for naming the broker.</p>
</Figure>

## Primary: laptop agents → remote MCP

This is the day-to-day shape for Cursor, Claude Code, and Copilot-style MCP clients at a company.

**What product did wrong.** Someone pasted a GitHub PAT into local MCP config so Cursor could open PRs. Or they ran `github/github-mcp-server` over stdio with `GITHUB_PERSONAL_ACCESS_TOKEN` in the agent neighborhood. One confused `read_file` or shell tool owns the keyring.

**What security fixed.** Move the GitHub and AWS tools onto a remote MCP the company hosts (ECS task, Cloud Run service, or Kubernetes Deployment), or point the IDE at GitHub's remote MCP with org OAuth / SSO. Laptop config gets a URL and signs in. Never the PAT.

Cursor / Claude Code shaped config (URL only):

```json
{
  "mcpServers": {
    "company-github": {
      "url": "https://mcp.company.example/github"
    },
    "github-official": {
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

No token field next to the agent. Auth to the company MCP is SSO, mTLS, or a short-lived client credential that cannot call GitHub by itself. For GitHub's hosted remote MCP, prefer OAuth over stuffing a PAT into headers.

Server side, the secret lives with the broker. On ECS that is the task role. On EKS that is IRSA on the MCP service account. On Cloud Run that is the runtime service account. Not Cursor's env.

```bash
# on the MCP task / pod / Cloud Run service, not on the laptop
# GitHub App installation token mint, or GITHUB_TOKEN in server env only
# AWS: task role / IRSA. No static AWS_SECRET_ACCESS_KEY in the agent.
```

One tool handler. Agent sends `tools/call` with `create_pull_request`. Broker attaches credentials and talks to GitHub via Octokit:

```js
// runs on the remote MCP server (ECS / Cloud Run / K8s), not in Cursor
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function createPullRequest({ owner, repo, title, head, base, body }) {
  const { data } = await octokit.pulls.create({
    owner, repo, title, head, base, body,
  });
  // return fields the agent needs. never return auth or GITHUB_TOKEN.
  return { number: data.number, html_url: data.html_url, state: data.state };
}
```

Same spine for AWS: agent calls `tools/call` `s3_put_object`. Broker runs `@aws-sdk/client-s3` with the task role / IRSA credentials only the MCP process can assume. Agent gets `{ etag, versionId }`. Not `AWS_SECRET_ACCESS_KEY`.

If you front several MCP backends with a gateway, [agentgateway](https://agentgateway.dev/) is the shape teams actually run on Kubernetes: one MCP endpoint, policy and audit in front, secrets still on the upstream MCP service accounts.

Bad default remains: stdio MCP next to the agent with a `.env` full of Stripe, GitHub, and cloud keys. I covered that surface and a Cedar deny path in [MCP security gateways / cMCP](/mcp-security-gateways-cmcp/). Approving a server once is not authz on every tool. Fail closed on creds, shell, and prod write: [you cannot deny every tool and still ship](/you-cannot-deny-every-tool-and-still-ship/).

If your "local MCP" story is a PAT beside Cursor, you are still putting the token in the agent neighborhood.

## Second: CI agents → remote MCP, not job-env secrets

Same three boxes on a runner. The agent is Claude Code in Actions, Copilot coding agent, or an internal AppSec agent. The broker is still a remote MCP or tool gateway the job can reach over the network. Upstream is still GitHub or AWS from that service. OIDC / IRSA lands on the **MCP service account**, not as fake credentials injected into the agent step.

Anti-pattern we killed: map `secrets.GH_TOKEN` and `AWS_ACCESS_KEY_ID` into the same step that runs the model.

```yaml
# .github/workflows/appsec-agent.yml
name: AppSec agent triage
on:
  issues:
    types: [labeled]
jobs:
  triage:
    if: github.event.label.name == 'security-triage'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      id-token: write   # only if a step must assume a role. Prefer the MCP's IRSA.
    steps:
      - uses: actions/checkout@v4

      # Claude Code in CI. Model auth only. No GH_TOKEN. No AWS_*.
      # MCP tools (open PR, read repo, AWS) go to the company remote MCP.
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Triage this issue. Use company MCP tools only.
            Open a draft PR if you have a concrete fix.
          claude_args: |
            --allowedTools mcp__company-github__*,mcp__company-aws__*
        env:
          # Agent talks to remote MCP over HTTPS + SSO/machine identity.
          # Secrets stay on the MCP task role / GitHub App. Not here.
          MCP_GITHUB_URL: https://mcp.company.example/github
          MCP_AWS_URL: https://mcp.company.example/aws
```

Call path in that job:

1. **Agent** (`anthropics/claude-code-action`, or Cursor Background Agent / Copilot coding agent in the same spirit) decides it needs a PR or an S3 put. Sends MCP `tools/call` to the company MCP URL.
2. **Broker** (ECS / Cloud Run / K8s MCP, optionally behind agentgateway) has the GitHub App installation token and/or IRSA. Adds `Authorization` / SigV4.
3. **Upstream:** broker calls `api.github.com` or AWS. Returns JSON to the agent.

Platform note: mint cloud sessions into the MCP workload identity. `aws-actions/configure-aws-credentials` on the agent job, then exporting `AWS_*` into Claude Code, puts the token back in the agent. Do the federation on the MCP service account instead.

## Same idea you already use for deploy (short)

OIDC in Actions, IRSA on EKS, Workload Identity on GKE: you already use those so deploy jobs and app pods do not carry forever keys. Keep doing that.

The new part for agents is not inventing federation. It is putting the **agent** behind the same boundary. Federation mints into the **broker** (remote MCP host, tool gateway). The agent still has no keyring. Do not treat "we have OIDC on the deploy workflow" or "the app pod uses IRSA" as done for agent tool calls. Name the agent process, name the broker process, and show where `api.github.com` or AWS is actually called.

I already wrote the PAT culture version: [eradicate long-lived tokens](/eradicate-long-lived-tokens/). IRSA for passwordless DB auth is the same binding with a different workload name ([MongoDB on EKS](/mongodb-passwordless-auth-eks/), [RDS on EKS](/rds-db-passwordless-auth-eks/)). Scope the broker role to the tools that agent is allowed to call. Do not give the Cursor laptop or the Claude Code job the prod deploy role unless that is intentional and audited.

## Day to day

When you add an agent that can open PRs or touch AWS, the token goes on the remote MCP server or tool gateway. Not in the agent env.

**Developers.** Point Cursor / Claude Code / Copilot at a remote MCP URL. Secrets stay on that host (task role, IRSA, GitHub App). `tools/call` goes out. Raw token does not come back.

**CI.** Claude Code Action or internal AppSec agent has model auth only. No cloud secrets in the job. MCP URL in config. Remote MCP / tool gateway adds auth toward GitHub or AWS. OIDC mints into the MCP service account only.

**Platform.** Broker on the cluster gets IRSA / Workload Identity on the *MCP* service account. Agent container stays empty of keys. Prefer GitHub App installation tokens over org-wide PATs on the MCP host.

**Monday check.** Can Cursor or the CI agent `printenv` or `read_file` a bearer that talks to prod? If yes, the broker is not at the boundary yet. Move the token onto the MCP/gateway and re-check.

## When brokered egress is not enough

Permission to call `sign`, `publish`, `kubectl apply`, or `stripe.refunds.create` still abuses if the broker will do it for you. Pin identity: which repo, which environment, which MCP subject, which gateway service account. Audit every inject and every `tools/call`. Short-lived sessions limit replay. They do not stop an authorized confused deputy during the window. Pair the broker with tool policy and human breakglass that dies on a clock. Keep deploy and publish identity off free-shell agent jobs, and confirm the real `api.github.com` or AWS call leaves from the broker process, not the model process.

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
