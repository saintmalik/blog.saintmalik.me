---
slug: from-stride-attack-to-atlas-owasp-llm-maestro
title: "From STRIDE and ATT&CK to ATLAS, OWASP LLM, and MAESTRO"
authors: Abdulmalik
date: 2026-11-16
image: /bgimg/from-stride-attack-to-atlas-maestro-cover.webp
tags: [ai-security, threat-modeling, appsec, agents, mcp, stride, mitre-atlas, owasp, maestro, security]
keywords:
  - threat modeling AI systems
  - STRIDE for LLM agents
  - MITRE ATLAS threat modeling
  - OWASP Top 10 for LLMs
  - MAESTRO agentic threat modeling
  - DevSecOps to AI security
  - AI security engineer threat model
  - DREAD prioritization
  - MITRE ATT&CK cloud app
  - MCP agent threat model session
description: "Same threat modeling session you already run for apps. STRIDE, DREAD, and ATT&CK on cloud and IAM. ATLAS, OWASP LLM Top 10, and MAESTRO when the board has a model pack, RAG, or agent tools. Here is how I pick which tool for which part of the system."
faq:
  - question: "Do I throw away STRIDE when I threat model AI products?"
    answer: >-
      No. STRIDE still walks spoofing, tampering, repudiation, disclosure,
      denial of service, and elevation on every trust boundary. You add ATLAS
      for adversary AI TTPs, OWASP LLM Top 10 for app risk language, and
      MAESTRO when the system is agentic across layers. Same session. Extra
      lenses on the new artifacts.
  - question: "What is MAESTRO and when do I use it?"
    answer: >-
      MAESTRO is the Cloud Security Alliance agentic AI threat modeling
      framework (Multi-Agent Environment, Security, Threat, Risk, and
      Outcome). Use it when you have agents, tools, memory, and cross-layer
      trust (MCP, multi-agent, tool brokers). Walk the seven layers. Do not
      use it as the first lens on a plain REST API with no model in the path.
  - question: "Is OWASP LLM Top 10 a threat model by itself?"
    answer: >-
      No. It is a risk checklist for LLM applications (prompt injection,
      excessive agency, supply chain, and the rest). Map each relevant entry
      onto your diagram and trust boundaries. Pair it with STRIDE for the
      walk and ATLAS for attacker vocabulary.
  - question: "Where does DREAD fit next to ATLAS and ATT&CK?"
    answer: >-
      DREAD is prioritization, not discovery. After STRIDE or MAESTRO names
      the threats, score Damage, Reproducibility, Exploitability, Affected
      users, and Discoverability the same way you already do for app findings.
      ATT&CK and ATLAS name techniques. DREAD ranks what you fix first.
  - question: "What should block ship after an AI threat modeling session?"
    answer: >-
      Block ship when a critical trust-boundary finding has no owner or
      treatment, when an agent tool holds a standing cloud or SaaS token, when
      you promote without a dataset pin or model admit policy, or when a write
      or money-moving tool has no human approval path. The register feeds the
      gate. A slide of taxonomies does not.
  - question: "How does this connect to pipeline gates and model signing?"
    answer: >-
      Threat modeling decides which gates must exist. Pipeline posts cover
      train to registry to API fail-closed jobs
      (https://blog.saintmalik.me/from-securing-cicd-to-securing-ai-ml-pipelines/).
      Signing and SBOM or ML-BOM or AIBOM are treatments for supply-chain and
      tampering rows, not substitutes for the session.
---

import Giscus from "@giscus/react";
import Figure from '../src/components/Figure';

You already threat model apps. Components on a diagram, arrows, trust boundaries. STRIDE for what can go wrong. DREAD to rank. ATT&CK when you need attacker language for cloud and identity.

Same session for AI products. The diagram just has new parts: model pack, dataset digest, prompt assembly, retrieval, agent loop, MCP tools. For those I also use [MITRE ATLAS](https://atlas.mitre.org/), [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/), and [MAESTRO](https://cloudsecurityalliance.org/blog/2025/02/06/agentic-ai-threat-modeling-framework-maestro) (Cloud Security Alliance) when the stack is agentic.

Skill transfer: DevSecOps to AI security. No GPU needed. You need a diagram, the right tool for each part of the system, and a register that can block ship.

Related:

- [From securing conventional product CI/CD to securing AI/ML product pipelines](/from-securing-cicd-to-securing-ai-ml-pipelines/)
- [Don't put the token in the agent](/dont-put-the-token-in-the-agent/)
- [MCP security gateways / cMCP](/mcp-security-gateways-cmcp/)
- [From signing containers to signing models](/from-signing-containers-to-signing-models/)
- [From software SBOM to ML-BOM and AIBOM](/sbom-for-models-not-just-containers/)

<!--truncate-->

## Which tool I start with

I do not throw every framework at every part of the system. Look at what is drawn. Start with the tool that matches that part.

- Cloud and infra (account, VPC, IAM, K8s, API gateway, broker host): STRIDE on the DFD. ATT&CK only when detection or red team needs technique names.
- Threats already listed, backlog needs ranking: DREAD, or whatever severity matrix your shop already uses.
- Train data, fine-tune set, model registry, or checkpoint admit: STRIDE on tampering and repudiation. ATLAS when you need names for poisoning, model theft, or evasion.
- Chat or RAG app: STRIDE on prompt, retrieval, and output first. Then walk OWASP LLM Top 10 as a checklist. Skip rows the architecture cannot hit.
- Agent with tools, MCP, or multi-agent: STRIDE on the tool boundary first. Then a short MAESTRO pass only for paths that cross layers. ATLAS agent techniques if detection needs the vocabulary.
- Red team or detection needs one shared language: ATT&CK for the platform under the model. ATLAS for the AI-specific techniques.

Left side of the diagram is what you already use on cloud and broker paths. Right side is what you add for model, retrieval, and agent tools. Same system. AppSec stays. You add the AI tools when the board has those parts.

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/from-stride-attack-to-atlas-maestro-lenses.webp" />
  <source type="image/png" srcSet="/bgimg/from-stride-attack-to-atlas-maestro-lenses.png" />
  <img src="/bgimg/from-stride-attack-to-atlas-maestro-lenses.png" alt="Hand-drawn diagram titled What you already use vs what you add for AI: left side STRIDE, DREAD, and ATT&CK over cloud IAM, API, and broker host; right side ATLAS, OWASP LLM Top 10, and MAESTRO over model, RAG, and agent MCP tools; center is your product with DFD and trust boundaries." />
</picture>
<p>Left: STRIDE, DREAD, ATT&amp;CK on the cloud and broker path. Right: ATLAS, OWASP LLM Top 10, MAESTRO on model, retrieval, and agent tools. What you already use vs what you add for AI.</p>
</Figure>

## The system I put on the board

At work this is usually an internal support agent. User asks about an order. Agent pulls help docs, calls ticket tools, sometimes issues a refund. Secrets for GitHub or the ticketing SaaS do not live in the agent process ([token post](/dont-put-the-token-in-the-agent/)). Tools go through a remote MCP or gateway ([cMCP / gateway post](/mcp-security-gateways-cmcp/)).

Parts that matter:

- support UI / SSO
- prompt assembly
- model endpoint
- vector store / help corpus
- agent loop
- MCP broker (holds tickets and refund credentials)
- upstream ticket API and refund API

Optional path on the same board: fine-tune or eval → model registry → serve admit ([pipeline post](/from-securing-cicd-to-securing-ai-ml-pipelines/), [signing](/from-signing-containers-to-signing-models/)).

Trust boundaries I mark every time:

- **B1** prompt assembly: trusted system text meets untrusted user text, retrieval, or memory
- **B2** vector write path: who can poison what the model will read
- **B3** tool execution: model text becomes a side effect only after policy on the broker
- **B4** credential custody: agent process vs broker task role
- **B5** promote path: dataset / checkpoint → registry stage → production model id

If B3 and B4 are missing on the whiteboard, I stop. Fix the diagram before we name threats. Most of the blast radius I have seen in these reviews lived on B3 and B4: standing SaaS token in the agent env, shared admin refund credential, no durable tool audit. STRIDE and ATT&CK already catch that on the broker path. OWASP LLM, ATLAS, and MAESTRO help ML and agent owners see the same path in their language.

Repos I keep open next to the board:

- [`saintmalik/ai-ml-pipeline`](https://github.com/saintmalik/ai-ml-pipeline): dataset pin, eval canary, registry promote, signed or attested pack before admit
- [`saintmalik/ai-sec-mcp`](https://github.com/saintmalik/ai-sec-mcp): MCP config inventory, tool lockfile, fail-closed drift on new or changed tools

## How I run the session

Forty-five to ninety minutes. Whiteboard or Excalidraw. One security owner. Eng lead for the agent. Someone who owns the broker or platform IAM. Same shape we use for a normal app threat model.

### Inputs (before the call)

- One-page architecture: components, data stores, who authenticates as whom
- List of tools and whether each is read, write, or money-moving
- Where secrets live today (agent env, CI job, broker role, vault)
- Model source: vendor API, registry revision, or fine-tune path
- Current ship gate (PR checks, environment protection, registry stage)

No GPU. No model weights on the call. Diagram and trust boundaries.

### During

1. Draw the DFD. Label arrows. Fix missing B3/B4 before brainstorming.
2. STRIDE every boundary. Six prompts. Discard threats with no asset and no path.
3. Overlay OWASP LLM Top 10 on model-touching parts of the diagram. Skip entries the architecture cannot hit.
4. If agents/tools: ten-minute MAESTRO layer pass for cross-layer paths only.
5. Tag rows with ATT&CK and/or ATLAS ids where your detection or red team needs the vocabulary.
6. DREAD or severity. Owner and treatment per row. Accept is allowed when owned and dated.

### Outputs

- Updated diagram with trust boundaries
- Risk register: threat, boundary, lens ids, severity, treatment, owner, due date
- Gate changes: what blocks merge, promote, or production admit
- Test seeds: one injection case, one over-privilege tool case, one audit gap case for regression

### Gates that block ship

If the register does not change admit policy, the session did nothing.

- **Design review** blocks when a new write tool or new MCP server lands with no register row and no owner.
- **PR / CI** blocks when the agent job or laptop path still injects long-lived SaaS or cloud tokens into the agent env.
- **Model promote** blocks when the registry stage is open without dataset pin, eval canary, and signed or attested pack policy ([pipeline post](/from-securing-cicd-to-securing-ai-ml-pipelines/), [signing](/from-signing-containers-to-signing-models/)).
- **Broker deploy** blocks on unsigned image, open egress, or a refund tool with no approval path.
- **Prod admit** blocks when critical register rows are still "mitigate" with no control merged.

If you leave with OWASP names and no owners, ship gates stay as they were.

## What I skip in that session

- Reciting the full ATLAS matrix or all seven MAESTRO layers as the deliverable
- Replacing STRIDE with a new acronym because the product has a model
- Debating jailbreak novelty while a service admin token sits in the agent env
- Waiting for a GPU sandbox before naming B3 and B4

Controls still look like AppSec and cloud engineering: brokered credentials, least privilege, pinned artifacts, signed admits, audit, human approval on irreversible tools. ATLAS, OWASP LLM, and MAESTRO fill rows you would have missed. They are not a replacement for the walk.

#### References

- [Threat modeling AI (learncomputerstuff)](https://learncomputerstuff.dev/g/threat-modeling-ai/). STRIDE-adapted walk with ATLAS mapping.
- [Threat modeling LLM apps and agents (threathub)](https://threathub.dev/resources/threat-modeling-llm-applications-agents). Blast radius when the agent is tricked.
- [MAESTRO (Cloud Security Alliance)](https://cloudsecurityalliance.org/blog/2025/02/06/agentic-ai-threat-modeling-framework-maestro). The layer framework itself.
- [STRIDE for AI agents (syntrox)](https://www.syntrox.io/blog/ai-agent-threat-model-stride). Agent-shaped STRIDE controls.

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
