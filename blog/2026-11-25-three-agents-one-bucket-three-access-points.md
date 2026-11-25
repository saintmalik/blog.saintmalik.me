---
slug: three-agents-one-bucket-three-access-points
title: "Three agents, one bucket, three access points"
authors: Abdulmalik
date: 2026-11-25
image: /bgimg/three-agents-one-bucket-three-access-points-cover.webp
tags: [ai-security, agents, aws, s3, sts, iam, agentcore, least-privilege, confused-deputy, security]
keywords:
  - Amazon S3 Files multi-agent
  - AWS STS GetScopedCredentials
  - S3 Files access points agents
  - scoped STS AI agents
  - AgentCore shared workspace
  - confused deputy multi-agent S3
  - least privilege agent credentials
description: "Shared agent workspace on one S3 bucket. Per-agent S3 Files access points stop Agent B from overwriting Agent A's tree on the mount. GetScopedCredentials stops the S3 API bypass. Architecture, IAM patterns, CloudTrail checks, and the limits that matter."
faq:
  - question: "Why is one shared S3 Files access point unsafe for multi-agent workspaces?"
    answer: >-
      Every agent mounts the same root and POSIX identity. A prompt-injected
      Agent B can walk into Agent A's directory and overwrite or copy files
      with normal open and write calls. Isolation needs separate access-point
      roots that do not overlap, plus separate mount IAM.
  - question: "Does GetScopedCredentials replace S3 Files access points?"
    answer: >-
      No. Access points control the NFS mount path and POSIX identity. Scoped
      STS credentials control the SigV4 S3 API path. You need both, because
      POSIX permissions do not stop a principal with s3:PutObject on the bucket.
  - question: "How is GetScopedCredentials different from AssumeRole with a session policy?"
    answer: >-
      Scope-down layers stack and never replace earlier layers. The principal
      ARN, session name, and tags stay the same. Role chaining's one-hour cap
      does not apply. AssumeRole session policies replace earlier session
      policies and change the session identity.
  - question: "What should I look for in CloudTrail?"
    answer: >-
      eventName GetScopedCredentials with requestParameters.policy and
      scopedSessionDescription. Later S3 calls keep the parent session ARN but
      use a new accessKeyId. Join on responseElements.credentials.accessKeyId.
  - question: "What are the hard limits on scoped credentials?"
    answer: >-
      Inline scope-down policy max 2,048 characters, at most three scope-down
      layers per session, regional STS endpoints only, and a short list of
      unsupported services. You cannot revoke a scoped child apart from the
      parent session.
---

import Giscus from "@giscus/react";
import Figure from '../src/components/Figure';

Three agents share one bucket as a workspace. Agent A writes under `agents/a/`. Agent B gets prompt-injected and tries to overwrite `agents/a/report.md`. If every agent mounts the same S3 Files root with the same IAM role, that write succeeds. The model did not need a new exploit. It needed a filesystem and a confused deputy (a helper that acts with too much power on someone else's behalf).

The fix I want in production is two controls that close different paths:

1. Amazon S3 Files access points with roots that do not overlap, so the NFS mount Agent B sees cannot leave its tree.
2. AWS STS `GetScopedCredentials`, so the temporary credentials Agent B holds cannot `PutObject` into Agent A's prefix over the S3 API.

Access points alone are not enough. Scoped STS alone is not enough if the agent still has a mount that sees the whole tree. Pair them.

Related:

- [Don't put the token in the agent](/dont-put-the-token-in-the-agent/)
- [Agent-on-agent: when your bot becomes the payload](/agent-on-agent-when-your-bot-becomes-the-payload/)
- [From STRIDE and ATT&CK to ATLAS, OWASP LLM, and MAESTRO](/from-stride-attack-to-atlas-owasp-llm-maestro/)

<!--truncate-->

## What others already said (and this post's angle)

AWS already wrote the building blocks:

- The [AWS Security Blog on `GetScopedCredentials`](https://aws.amazon.com/blogs/security/scope-down-permissions-of-existing-sessions-using-aws-sts-getscopedcredentials/) covers agent and multi-tenant prefix scoping, CLI shape, recursive scope-down, and CloudTrail fields.
- The [AWS Compute Blog on AgentCore + S3 Files](https://aws.amazon.com/blogs/compute/building-document-investigation-agents-with-amazon-bedrock-agentcore-and-amazon-s3-files/) walks document investigation with mount IAM and case-folder checks below the app.
- [AgentCore filesystem docs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-filesystem-configurations.html) define how S3 Files access points attach to runtimes (VPC, port 2049, `s3files:AccessPointArn`).

Third-party writeups mapped the STS surface: [eCorpIT](https://ecorpit.com/aws-sts-getscopedcredentials-ai-agents-november-2026/) summarized parameters and AssumeRole trade-offs; [thesecguy](https://thesecguy.com/notes/aws-sts-getscopedcredentials-ai-agents/) posted a short CLI sketch; [ibreak.software](https://ibreak.software/2026/11/scope-down-aws-sessions-getscopedcredentials-abuse-cases/) poked abuse edges (AssumeRole escape if the parent still has it, CloudTrail join on `accessKeyId`).

This post is not another API tour. It is the production threat I keep reviewing: a shared workspace, multi-agent least privilege, mount path plus API path, and how far prompt injection can reach. Architecture and what you must prove in logs. No private lab dump. Where I cite CloudTrail shape, it comes from the AWS IAM / Security Blog docs, not from inventing a run.

## The unsafe pattern

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/three-agents-one-bucket-unsafe-pattern.webp" />
  <source type="image/png" srcSet="/bgimg/three-agents-one-bucket-unsafe-pattern.png" />
  <img src="/bgimg/three-agents-one-bucket-unsafe-pattern.png" alt="Hand-drawn diagram titled The unsafe pattern: one IAM role and session with s3:* on bucket/*, one S3 Files access point rooted at /, forking to Agent A, Agent B, and Agent C. Each mounts /mnt/ws and sees everything." />
</picture>
<p>One IAM role, one access point rooted at <code>/</code>. Every agent mounts <code>/mnt/ws</code> and sees the whole tree.</p>
</Figure>

Product likes this. One bucket. One mount. Agents hand off with `open()` / `write()` instead of custom S3 SDK glue. The Storage Blog even ships a five-stage pipeline that way on purpose.

Security problem: the workspace is also the place a confused deputy can hurt you. Untrusted ticket text, tool output, or a nested helper (same family as [agent-on-agent](/agent-on-agent-when-your-bot-becomes-the-payload/)) steers Agent B to:

- `open("/mnt/ws/agents/a/secrets.env")` and paste it into a "status" message
- overwrite `agents/a/out.json` with attacker-shaped data the next agent will trust
- call `s3.PutObject` on `agents/a/...` if the role still has bucket IAM, even when the mount root looks narrow

A container or sandbox around the agent does not shrink an IAM role that already covers `bucket/*`, or an access point rooted at `/`. How far damage can go is set by the role and the access point prefix, not by the process edge. Putting the durable key in the agent process is a separate miss ([don't put the token in the agent](/dont-put-the-token-in-the-agent/)). Here the miss is authority that is too wide for the task, whether the key lives in the agent or in a broker that still mints fat sessions.

## Control design: three agents, three access points, scoped STS

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/three-agents-one-bucket-safe-pattern.webp" />
  <source type="image/png" srcSet="/bgimg/three-agents-one-bucket-safe-pattern.png" />
  <img src="/bgimg/three-agents-one-bucket-safe-pattern.png" alt="Hand-drawn diagram titled The safe pattern: bucket agent-workspace with three S3 Files access points rooted at /agents/a, /agents/b, and /agents/c; orchestrator holds parent creds, calls GetScopedCredentials per task, and passes only scoped creds plus access-point ARN into the sandbox; Agent B example mounts only AP-B, sees / as agents/b, with s3 Get/Put under agents/b/* only and no AssumeRole in scope-down." />
</picture>
<p>One bucket, three access points, scoped STS per task. Agent B only mounts AP-B and only holds creds that can touch <code>agents/b/*</code>.</p>
</Figure>

Two layers, one job each:

1. Mount isolation (S3 Files). Access point `rootDirectory` and `posixUser` limit what the NFS client can name. AgentCore (and EC2/ECS/Lambda mounts) attach with `s3files:ClientMount` / `ClientWrite` conditioned on `s3files:AccessPointArn`. See [AgentCore filesystem configurations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-filesystem-configurations.html) and [How S3 Files works with IAM](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-files-security-iam.html).
2. API isolation (`GetScopedCredentials`). The scope-down policy intersects with the parent session. Permissions can only shrink. The principal ARN, role session name, tags, and source identity stay the same. See [GetScopedCredentials API](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetScopedCredentials.html) and [Permissions for GetScopedCredentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_control-access_getscopedcredentials.html).

### AssumeRole vs GetScopedCredentials

`AssumeRole` with a session policy still works. Many shops already have one role per agent. Use that when each agent must show up as a different principal in CloudTrail.

`GetScopedCredentials` fits better when you already hold a parent temporary session and you need child credentials for one task. You do not write new trust policies. You do not replace earlier session policies. You also skip the role-chaining one-hour cap.

The other hard difference: scope-down layers stack. `AssumeRole` session policies replace. AWS documents that clearly.

Short rule I use: different principal in the trail means per-agent roles. Same orchestrator identity, but the task must not inherit every tool permission, means scoped STS.

## IAM / STS / S3 Files specifics

### Parent role (orchestrator / broker)

Needs enough to mount and mint, not enough for every agent forever:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MintScopedSessions",
      "Effect": "Allow",
      "Action": "sts:GetScopedCredentials",
      "Resource": "*"
    },
    {
      "Sid": "ManageAgentTrees",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::agent-workspace",
        "arn:aws:s3:::agent-workspace/agents/*"
      ]
    },
    {
      "Sid": "MountAnyAgentAccessPoint",
      "Effect": "Allow",
      "Action": [
        "s3files:ClientMount",
        "s3files:ClientWrite",
        "s3files:GetAccessPoint"
      ],
      "Resource": "arn:aws:s3files:REGION:ACCOUNT:file-system/FILE_SYSTEM_ID",
      "Condition": {
        "ArnLike": {
          "s3files:AccessPointArn": "arn:aws:s3files:REGION:ACCOUNT:file-system/FILE_SYSTEM_ID/access-point/*"
        }
      }
    }
  ]
}
```

The parent can see the whole tree. That is fine if the parent never enters the agent sandbox. Agents never receive the parent credentials.

### Scope-down policy for Agent B (pass to `GetScopedCredentials`)

Keep it under 2,048 characters. Include every dependent action the task needs. If the agent must call `GetScopedCredentials` again for a grandchild, allow `sts:GetScopedCredentials` in this layer too (AWS recursive rule).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MountOnlyB",
      "Effect": "Allow",
      "Action": [
        "s3files:ClientMount",
        "s3files:ClientWrite",
        "s3files:GetAccessPoint"
      ],
      "Resource": "arn:aws:s3files:REGION:ACCOUNT:file-system/FILE_SYSTEM_ID",
      "Condition": {
        "ArnEquals": {
          "s3files:AccessPointArn": "arn:aws:s3files:REGION:ACCOUNT:file-system/FILE_SYSTEM_ID/access-point/ap-agent-b"
        }
      }
    },
    {
      "Sid": "S3OnlyAgentBPrefix",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:AbortMultipartUpload"],
      "Resource": "arn:aws:s3:::agent-workspace/agents/b/*"
    },
    {
      "Sid": "ListOnlyAgentB",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::agent-workspace",
      "Condition": {
        "StringLike": { "s3:prefix": ["agents/b/*"] }
      }
    }
  ]
}
```

CLI shape (regional endpoint; the API is not on the STS global endpoint):

```bash
aws sts get-scoped-credentials \
  --region us-east-1 \
  --policy file://agent-b-scope.json \
  --duration-seconds 900 \
  --scoped-session-description "agent-b-task-case-4421"
```

Pass only the returned `AccessKeyId` / `SecretAccessKey` / `SessionToken` into Agent B's environment or SDK default chain. Prefer minting inside a broker that the agent calls ([credential stays off the model process](/dont-put-the-token-in-the-agent/)). If you must hand credentials to a sandbox, hand the scoped set, never the parent.

Deny-list style (`Allow` + `NotAction` for `sts:AssumeRole*`, `s3:DeleteBucket`, and similar) is documented for "keep most permissions, strip the foot-guns." For shared workspaces I prefer an allow-list per prefix. A deny-list that forgets `s3:PutObject` on `agents/a/*` still loses.

### One access point per agent

Each agent gets its own access point on the same S3 Files filesystem. Set `rootDirectory.path` to `/agents/a` (or `/agents/b`, `/agents/c`). Set `posixUser` to match the container UID/GID (often `1000:1000` for AgentCore). Roots that do not overlap are the mount-side isolation the Storage Blog points at when security requirements grow past a shared pipeline identity.

## How Agent B's overwrite attempt dies

1. On the mount. Agent B's view of `/` is `agents/b`. A write to `/agents/a/report.md` is not a path that exists under that root. Path walk escapes fail at the access-point boundary.
2. On the S3 API. Even if the model invents `put_object(Bucket=..., Key="agents/a/report.md")`, the scope-down policy does not allow that resource. Effective permission is the intersection of parent and every scope-down layer. The call is denied.
3. On prompt injection. Injection can still make Agent B do anything inside `agents/b` for up to `DurationSeconds`. Scoped STS shrinks how far damage can go. It does not make the model trustworthy. Pair with short TTL, no `AssumeRole*` in the scope, and brokered tools for money-moving or cross-prefix actions.

## How to prove it in CloudTrail

AWS documents the event shape. Use that when you check that the pattern works.

1. Find the mint. `eventSource` = `sts.amazonaws.com`, `eventName` = `GetScopedCredentials`. Make sure that `requestParameters.policy` matches the agent prefix you intended. Make sure that `scopedSessionDescription` names the task (this field exists so you can label purpose in the trail). Make sure that you see `responseElements.scopedPoliciesCount` and the new `responseElements.credentials.accessKeyId`.
2. Join child activity. Later S3 or S3 Files calls keep the same session ARN / principal id as the parent. The field that changes is `userIdentity.accessKeyId`. Join child events to the mint event on that key. If you only group by role session ARN, Agent B and the orchestrator look identical. That is identity preservation, not a bug.
3. Expect AccessDenied on cross-prefix. Reproduce once in a non-prod account: scoped Agent B credentials attempt `GetObject` / `PutObject` on `agents/a/...`. You want AccessDenied in the trail (or in SDK errors), not silence.
4. Revocation. Scoped credentials inherit `aws:TokenIssueTime` from the parent. Revoking active sessions on the role hits parent and children together. You cannot revoke a scoped child alone. Plan kill switches at the parent session.
5. Do not paste live `sessionToken` values into tickets or blogs. CloudTrail can carry credential material in `responseElements` for STS. Treat trails as sensitive.

## Things that still bite you

POSIX on the mount is not the S3 API. The [S3 Files POSIX docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-files-posix-permissions.html) say POSIX does not restrict direct S3 API access. If the agent still holds fat IAM on the bucket, the SDK walks past the access-point root.

Mount writers and S3 API readers also disagree on timing. AgentCore is close-to-open for NFS clients. Bucket-side readers get S3 eventual consistency. A sibling that reads via the API can lag the mount. Handoffs on the mount, or accept the lag.

If any scope-down layer still allows `sts:AssumeRole*`, a steered agent can jump to a wider role. Strip it unless you mean to broker that hop.

Putting scoped keys in the agent process still loses to an env dump inside the TTL. Prefer brokered tool calls. Scoped STS shrinks the keyring. It is not a substitute for keeping the keyring off the model.

Inline scope-down tops out at 2,048 characters and three layers per session. Some services reject scoped credentials. See the [IAM page](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_control-access_getscopedcredentials.html). That page and the [Security Blog post](https://aws.amazon.com/blogs/security/scope-down-permissions-of-existing-sessions-using-aws-sts-getscopedcredentials/) also cover the other launch gotchas (KMS caches, same-account resource policies, regional STS, request quota).

## What I check when a PR gives an agent bucket access

When a PR wires an agent into the shared workspace, I open the mount config and the IAM the task role gets. The question is simple: can Agent B still touch Agent A's tree?

I look for one S3 Files access point per agent (or per trust domain), with a `rootDirectory` that does not overlap a sibling. The execution or task role that mounts must condition `s3files:ClientMount` / `ClientWrite` on that access point ARN. A shared access point rooted at `/` is an automatic reject for me.

I look for the orchestrator minting `GetScopedCredentials` per task: allow-listed prefix plus mount actions only, and the agent never receives the parent credentials. If the scope still allows `sts:AssumeRole*`, I reject the PR unless there is a named, audited reason for that hop.

In CloudTrail I want mint events whose `policy` matches the intended prefix and a `scopedSessionDescription` that names the task. I also want detections for unexpected mint policies, missing descriptions, AccessDenied spikes on cross-prefix S3 calls, and a child `accessKeyId` hitting a foreign prefix.

TTL for untrusted or prompt-exposed agents stays in minutes, not hours. And I accept the boring limits up front: mount-to-S3 sync lag, and whatever services sit on the unsupported list for scoped credentials. If the agent's tools need those services, this pattern is the wrong fit until you redesign the tool path.

## Conclusion

Shared S3 Files workspaces are the right product shape for multi-agent handoffs. They are also a classic confused-deputy filesystem if every agent mounts the same root under the same fat session.

Three agents, one bucket, three access points stops the mount walk. `GetScopedCredentials` stops the S3 API walk into a sibling tree. Together they shrink how far prompt injection can reach to the task prefix and the clock you set. They do not replace brokered egress, tool policy, or threat modeling. They are the IAM half of a workspace you can defend.

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
