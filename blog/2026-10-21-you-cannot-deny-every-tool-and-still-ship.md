---
slug: you-cannot-deny-every-tool-and-still-ship
title: "You cannot deny every tool and still ship"
authors: Abdulmalik
date: 2026-10-21
image: /bgimg/you-cannot-deny-every-tool-and-still-ship-cover.webp
tags: [ai-security, agents, mcp, appsec, devsecops, security]
keywords:
  - agent tool gateway
  - fail closed tool policy
  - PR agent blast radius
  - breakglass expiry
  - shadow AI agents
description: "Deny every agent tool and the work leaves the gateway. Fail closed on shell, creds, and prod write. Leave read and the scoped branch edit on, and let every breakglass grant die on a clock."
faq:
  - question: "Why not deny every agent tool?"
    answer: >-
      If the gateway blocks all work, engineers leave the gateway and ship
      from the laptop with shell and kubeconfig still on. Fail closed on
      shell, creds, and prod write. Leave scoped read and branch edit paths
      that still ship.
  - question: "What should always stay fail-closed for agents?"
    answer: >-
      Shell, long-lived credentials, and production write. Those are the
      grants that should not quietly return because someone is late for
      standup.
  - question: "How do I keep product velocity without abandoning the gateway?"
    answer: >-
      Count what the team actually needs in a week, keep those scoped tools
      on, and make every break-glass path audited. Absolute deny pushes the
      real work off-platform.
---

import Giscus from "@giscus/react";
import Figure from '../src/components/Figure';

Product wants the patch before standup. Security wants a gateway that can say no. I have sat between them. Both are right until someone makes it one dial.

Deny every tool and the agent is a chatbot. I have watched engineers stop waiting. They open the IDE on the laptop, shell still on, kubeconfig still in the environment, and they ship from there. Your deny rate looks perfect. Nobody complains. That quiet is the part that gets me. The control did not win. The work left.

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/you-cannot-deny-every-tool-and-still-ship-gate.webp" />
  <source type="image/png" srcSet="/bgimg/you-cannot-deny-every-tool-and-still-ship-gate.png" />
  <img src="/bgimg/you-cannot-deny-every-tool-and-still-ship-gate.png" alt="Diagram: an agent sends read files, search code, and change code through a gate that lets safe work continue, while run commands, secrets, and touch production are stopped by default. A dashed emergency override expires. A dotted quiet bypass goes around the gate where everything is still on." />
</picture>
<p>Same argument without the table. Let the everyday work through. Fail closed on the three that can ruin your week. Any override dies on a clock. And go find the agent that never hits the gate.</p>
</Figure>

Allow the shell because the tests will not run, and you handed a confused deputy a production write. I already wrote that one up: [when your bot becomes the payload](/agent-on-agent-when-your-bot-becomes-the-payload/). This is the deal I will defend when both sides are in the room.

You cannot deny every tool and still ship. Sort them by what they can break. Shell, secrets, and prod write fail closed. Read stays. A write that can only touch the PR branch stays. Take those away and you do not have a PR agent. You have a linter with opinions.

<!--truncate-->

A file read is not a shell. A shell is not a deploy. A "write file" that can edit `.github/workflows` on a branch the pipeline trusts is a delayed shell. "The agent is helpful" is not a tier. I will not sit through another review where those get lumped into one allow.

PR agents read untrusted diffs, issue bodies, and review comments. Same trust boundary as a nested helper: content you do not control, tools that act with your authority. The table is the argument I will have in that room. I am not pasting it onto an SRE laptop. A human at a terminal is a different job.

| Tier | What lands here | PR agent default | If the call is wrong |
| --- | --- | --- | --- |
| Read-ish | list dir, grep, git log, git diff, read a file in the worktree, fetch an issue | Allow | Leak of code you already cloned. Painful. Not a deploy. |
| Write | edit files on the PR branch, commit there, open or update the PR, post a review comment | Allow, scoped | A bad patch. Reversible if it cannot touch a protected ref. |
| Exec | shell, `python -c`, package lifecycle scripts, an arbitrary process, a browser on a logged-in session | Deny | RCE on the runner or the laptop. From there, everything else. |
| Creds | read `.env`, dump env, mint a token, read a secret store, assume a cloud role | Deny | The call is the incident. |
| Prod write | merge to a protected branch, `kubectl apply`, deploy, a prod DB mutation, an IAM change | Deny | Customer impact. Hard to unwind the same hour. |

Creds get their own row because I have lost that argument before. A secret read with no shell still leaves the building. A prod write with no secret read still changes the live system. Fail closed on exec, creds, and prod write. Read-ish stays on or the agent cannot do the job. Scoped write stays on or you do not have a PR agent.

"Write" is the row people lie about. Bind it to the PR head. No push to `main`, `master`, or a release tag. The worktree only. Not the home directory, not `~/.ssh`, not a kubeconfig, not CI secret files. Edits to `.github/workflows`, prod manifests, and IAM are not a normal diff. The next green pipeline will run what the agent wrote. A review comment is still write, and it is still a way out. A comment that pastes a token is a creds incident that looks like collaboration.

If the gateway cannot say "this branch, these paths," you do not have a write tier. You have an allow. I want the tool, the repo, the PR, the role, and allow or deny in the gateway log, arguments hashed. A screenshot of the model refusing in chat is how that review usually ends, and it is useless the week after.

The tiers are a slide unless you already have the catalog and a policy engine that can refuse a `tools/call` before the upstream runs. Approving an MCP server once is not authz on the next call. I covered that control plane in [MCP security gateways](/mcp-security-gateways-cmcp/). I am not re-litigating the proxy here.

## The grant that never dies

Default deny on exec, creds, and prod write for any agent that ingests PR content, tickets, or web pages. The model asking nicely is not an approval. A tool description that says "safe debug helper" is not an approval either. I do not care how polite the prompt is.

Breakglass is how a human still ships when that default is wrong for one task. It is also where I have been burned. Week one everyone is careful. Week six the shell allow is still on because the ticket is closed and the policy object is not. Nobody meant to leave it. Good intentions do not expire.

The grant I will actually sign is small, and it dies. A named human, not "the platform team." One tool, not the whole exec tier. One repo and one PR, or one incident. A reason a stranger can read next week. Hours, or until the PR closes, whichever comes first. Four hours is where I start. I would not go past a working day. Then it dies on the clock. No "until further notice." No grant that is still valid because someone went to lunch and never came back to the console.

The audit line has to outlive the grant. Who, which tool, which PR, when it opened, when it died, whether the call actually ran. If you cannot answer that from the gateway log, you do not have breakglass. You have a side door.

## Count the week, then stop arguing

Give me a week of the gateway log. Blocked calls next to overrides. I am not asking for a score.

If read-ish and scoped write dry up, we over-denied and the patch stopped. I have been in that room. Product is right to be angry. If an exec, creds, or prod write actually ran, I want the grant that was alive at that minute. If a grant is still valid after the clock, expiry was a comment.

A high deny rate by itself is a vanity metric. It can mean the policy works. It can also mean engineers stopped using the official agent and went around it. The claim I will stand behind is smaller than "agents are safe." Dangerous calls died closed, people still merged, and the overrides we made are already dead.

## The agent that is not on the gateway

The design dies when a second agent never sees the gateway.

I know the shape. Someone's laptop, IDE agent, shell on, prod kubeconfig in the environment. A small GitHub Action a team added because the sanctioned bot could not run tests, with `contents: write` and a cloud key. A vendor bot on the org for the same reason. Those sessions do not show up in your deny rate. They are the bypass, and it feels like teamwork when they add it.

A token that can deploy or read secrets, from a client that is not the gateway, is the page I actually want. The deny graph will not show it.

If the official agent cannot run the test suite because exec is denied, I would rather give it a sandboxed runner with no prod and no secrets than spend another week on "just enable bash." That complaint is how the kubeconfig session starts. I have watched it start.

A gateway that only wraps the blessed bot is a costume. The blast radius lives in whichever tool can still spawn a shell.

Ship the PR agent with the tools that edit a branch. Refuse the tools that run a shell, read a secret, or write production. When someone needs an exception, write it down and let it die on a clock.

If the deny rate looks perfect and the engineers are quiet, go find the agent that is not on the gateway. That is the one I worry about. That is the one with the blast radius.

Till next time, Peace be on you 🤞🏽

#### References

- [Agent-on-agent: when your bot becomes the payload](/agent-on-agent-when-your-bot-becomes-the-payload/)
- [MCP security gateways / cMCP](/mcp-security-gateways-cmcp/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

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
