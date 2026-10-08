---
slug: guardduty-ai-protection
title: "What GuardDuty AI Protection actually detects (and what it doesn't)"
authors: Abdulmalik
date: 2026-10-09
image: /bgimg/guardduty-ai-protection-cover.webp
tags: [aws, guardduty, bedrock, sagemaker, ai-security, cloudtrail, security, devops]
description: "GuardDuty AI Protection watches Bedrock, AgentCore, and SageMaker AI via CloudTrail. Three Low findings, how to enable, what Low means for response, and what it still misses."
---

import Giscus from "@giscus/react";

AWS shipped [GuardDuty AI Protection](https://aws.amazon.com/about-aws/whats-new/2026/07/amazon-guardduty-ai-protection-aws/) as GA in mid-July 2026. If you already run Bedrock or SageMaker AI and GuardDuty, this is the protection plan that finally looks at model invocation data events instead of only management-plane noise.

It is not "AI security done." It is a specific data-source plan with three finding types. Know what it watches, how to turn it on, and what to do when Low severity findings show up. Then know what it will never see.

<!--truncate-->

This is enablement for leads and platform folks. Not a threat-intel essay. Hidekazu-style encyclopedias already exist if you want the long tour. Below: what the plan is, the three findings, enable notes, how not to drop Low, and one credibility section on the gaps.

If you are also wiring agents to tools, the [MCP gateway post](/mcp-security-gateways-cmcp/) is the adjacent control plane story. GuardDuty AI Protection does not replace that.

## What it is

When you enable AI Protection, GuardDuty analyzes:

- AWS CloudTrail **management events** (same foundational stream you already had)
- AWS CloudTrail **data events** from Amazon Bedrock, Amazon Bedrock AgentCore, and Amazon SageMaker AI

You do not create a trail or flip data-event logging yourself for this. GuardDuty creates a CloudTrail **service-linked channel** per monitored account, configures the data-event settings, and streams those events for analysis. You can confirm the channel under CloudTrail Settings → Service-linked channels, or via `ListChannels`. Account owners cannot retune that channel's data-event settings; detection does not depend on someone remembering to keep a custom trail healthy.

Pricing is usage on the volume of CloudTrail data events GuardDuty analyzes, measured in **GB**. The service-linked channel itself has no separate CloudTrail charge for collecting those events; that cost is bundled into AI Protection usage. You still pay standard GuardDuty and any other protection plans. Check the [GuardDuty pricing page](https://aws.amazon.com/guardduty/pricing/) for current rates. Existing GuardDuty customers do not get new protection plans auto-enabled; you opt in. New GuardDuty accounts typically get a 30-day free trial window that can include protection plans per the trial docs.

Region caveats matter. `AnomalousModelInvocation` and `CostHarvesting` need Bedrock or SageMaker AI in-region (SageMaker-only where Bedrock is missing). `PromptInjection.Direct` needs Bedrock Guardrails support in-region.

## The three finding types

All three default to **Low**. Resource type is **AccessKey**. The finding points at the IAM identity that invoked the model. Affected AI resources land in the finding `resource` object (`modelDetails` for the first two; `bedrockGuardrailDetails` for prompt injection).

| Finding | What it means | How GuardDuty decides |
| --- | --- | --- |
| `Impact:IAMUser/AnomalousModelInvocation` | Identity invoked Bedrock or SageMaker AI in a way that breaks the baseline for that identity or account | Anomaly ML over API, model, source IP/ASN, user agent |
| `Impact:IAMUser/CostHarvesting` | Token volumes look like cost abuse (expensive / oversized inputs or outputs vs baseline) | Anomaly ML on input/output token volume, correlated with other odd signals |
| `Impact:IAMUser/PromptInjection.Direct` | Bedrock Guardrails intervened on a direct prompt-injection style attack | Guardrail evaluation in CloudTrail data events; not standalone ML |

`AnomalousModelInvocation` and `CostHarvesting` apply to Bedrock and SageMaker AI invocations. `PromptInjection.Direct` is Bedrock + Guardrails only.

Baselines take observation. Brand-new identities and quiet accounts will look "odd" until GuardDuty has enough history. That is normal for anomaly findings. Plan triage accordingly.

MITRE ATLAS mappings in the docs: AML.T0040 (inference API access), AML.T0034 (cost harvesting), AML.T0051 (LLM prompt injection). Useful labels for IR writeups. Not a substitute for reading the finding JSON.

## How to enable

**Standalone account.** GuardDuty console → Protection Plans → Configure all enablements → enable AI Protection → save. Or CLI:

```bash
aws guardduty update-detector \
  --detector-id "$DETECTOR_ID" \
  --region "$REGION" \
  --features '[{"Name":"AI_PROTECTION","Status":"ENABLED"}]'
```

`ListDetectors` (or the GuardDuty Settings page) gives you the regional detector ID. Flip `ENABLED` to `DISABLED` to turn it off.

**Org-wide.** Only the **delegated GuardDuty administrator** can enable or disable AI Protection for member accounts. Members cannot flip it from their own account.

Typical admin moves:

1. Enable on the admin detector (`UpdateDetector` / console as above).
2. Enable for existing members via console "Enable for all existing active member accounts" or `UpdateMemberDetectors` with `AI_PROTECTION` / `ENABLED` and the member account IDs.
3. Auto-enable for **new** accounts with org config, for example:

```bash
aws guardduty update-organization-configuration \
  --detector-id "$DETECTOR_ID" \
  --region "$REGION" \
  --auto-enable \
  --features '[{"Name":"AI_PROTECTION","AutoEnable":"NEW"}]'
```

Console path: Protection Plans → Configure accounts manually → Automatically enable for new member accounts, or Accounts → Auto-enable preferences. You can also push coverage with [Organizations GuardDuty policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_guardduty.html) (`ai_protection` key) if you manage GuardDuty that way.

Enable the plan in every Region where you actually invoke models. Findings are regional like the rest of GuardDuty.

## What leads should do with Low

Default severity is Low for all three. Do not treat that as "noise we can ignore." For AI Protection, Low means "early / identity-linked anomaly or guardrail signal," not "benign by policy."

Wire EventBridge (or Security Hub → ticket) so these finding types always create a ticket or Slack alert. Do **not** drop Low severity globally for GuardDuty if that filter would swallow these three types. Filter by finding type if you must reduce volume elsewhere.

Triage sketch:

1. **Identity.** Who is the AccessKey / principal? Expected service role, human break-glass, or unknown?
2. **Context.** IP/ASN, user agent, model IDs in `modelDetails`, token volume deltas for CostHarvesting, guardrail fields for PromptInjection.
3. **Expected change?** New model launch, new CI identity, new region, load test. Document and suppress narrowly if legitimate.
4. **Unexpected?** Treat as possible credential compromise or abuse. Rotate keys / revoke sessions, scope `bedrock:InvokeModel*` / `sagemaker:InvokeEndpoint*` (and related Converse / async APIs in the remediation docs), check Budgets / Cost Anomaly Detection for spend, and review whether Guardrails blocked or only reported.

If PromptInjection findings fire and the guardrail action was detect-only (`NONE`), move the prompt-attack filter to **Block** so the workload actually stops the content. Finding volume without block is theater.

Foundational GuardDuty still covers useful AI-adjacent management events (unusual guardrail removal, training data source changes, disabled Bedrock invocation logging, odd SageMaker notebook/job creation, exfiltrated EC2 credentials reused against AI APIs). Lambda Protection can help on Bedrock agent network weirdness. AI Protection does not replace those plans.

## What it does not catch (credibility)

Say this out loud before someone puts "we have GuardDuty AI Protection" on a risk register as complete coverage.

**DIY / EKS / self-hosted LLM stacks are out of scope for these findings.** If the model runs on your cluster, EC2, or someone else's API, AI Protection is not reading those prompts or token curves. Foundational GuardDuty may still flag stolen instance credentials or other CloudTrail management weirdness. That is not the same as Bedrock/SageMaker invocation anomaly findings.

**MCP tool abuse is not a GuardDuty AI Protection finding.** Tool poisoning, rug-pulls, and over-privileged `tools/call` paths need policy at the [gateway](/mcp-security-gateways-cmcp/), identity hygiene, and app-layer controls. CloudTrail data events for Bedrock/SageMaker will not narrate "the agent read `.env` via filesystem MCP."

**`PromptInjection.Direct` is Guardrails-gated.** GuardDuty generates it when a Bedrock Guardrail intervenes and the content policy filter is `PROMPT_ATTACK` with confidence **HIGH** (and `guardrailAction` of `GUARDRAIL_INTERVENED`). No Guardrails (or Guardrails without prompt-attack filtering enforced on the invocation path) means no finding of this type. Enforce Guardrails account-wide or org-wide with Bedrock policies; do not rely on every app team remembering to attach a guardrail per request.

**Stolen-key cost abuse (industry "LLMjacking") is not a prompt injection finding.** A compromised key burning tokens on expensive models maps to **`AnomalousModelInvocation`** and/or **`CostHarvesting`**. Prompt injection is a different failure mode: malicious prompt content vs original instructions, surfaced through Guardrails. Mixing the labels in IR tickets will waste a weekend.

Same honesty bar as the [microVM runners post](/ephemeral-microvm-runners-supply-chain/): name the control, name the gap, spend on the gap that matches how you actually run models.

## Bottom line

Enable AI Protection wherever you use Bedrock, AgentCore, or SageMaker AI. Enforce Bedrock Guardrails prompt-attack filters if you want `PromptInjection.Direct`. Route all three Low findings to humans. Keep separate controls for self-hosted models, MCP tool paths, and plain old credential theft that shows up as spend and weird invocation baselines rather than a prompt-injection label.

Three findings. One data-event plan. Clear edges. That is enough to brief a lead without a slide deck.

Till next time, Peace be on you 🤞🏽

#### References

- [GuardDuty AI Protection](https://docs.aws.amazon.com/guardduty/latest/ug/ai-protection.html)
- [AI Protection finding types](https://docs.aws.amazon.com/guardduty/latest/ug/findings-ai-protection.html)
- [Enable for a standalone account](https://docs.aws.amazon.com/guardduty/latest/ug/ai-protection-enable-standalone-account.html)
- [Enable in multiple-account environments](https://docs.aws.amazon.com/guardduty/latest/ug/ai-protection-enable-multiple-accounts.html)
- [What's New: GuardDuty AI Protection (Jul 14, 2026)](https://aws.amazon.com/about-aws/whats-new/2026/07/amazon-guardduty-ai-protection-aws/)
- [MCP security gateways](/mcp-security-gateways-cmcp/)
- [Ephemeral microVM runners](/ephemeral-microvm-runners-supply-chain/)

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
