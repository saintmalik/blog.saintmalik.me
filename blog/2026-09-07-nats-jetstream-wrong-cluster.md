---
slug: nats-jetstream-wrong-cluster
title: "Your JetStream is fine. You just have two of them."
authors: Abdulmalik
date: 2026-09-07
image: /bgimg/nats-jetstream-wrong-cluster-cover.webp
tags: [nats, jetstream, kubernetes, debugging, incident, ha]
description: Publisher acks, consumer never sees the message. Restart flushes a stuck queue. Realtime fan-out works on one pod and vanishes on another. Two JetStream stores behind one Service named nats. HA done wrong vs one cluster with three members.
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Publish returns ack. Consumer never sees the message. Restart a pod and a stuck queue suddenly drains. Realtime join works on one pod; another user never sees it. Websocket adapter events vanish depending on which replica you hit. Same cluster. Same Service DNS. Different JetStream stores. That is the smell.

<!--truncate-->

This is not a pipeline-debugging post dressed up as NATS lore. The loud tickets were "publisher acked, nothing arrived" and "presence / room fan-out is haunted." Production Kubernetes. One hostname, two brains.

## What it looked like

Two surfaces, one root:

| Surface | What it looked like |
| --- | --- |
| Async / queue work | Publisher publishes to our JetStream stream (`events` / `app-events`, whatever you named it), gets an ack. Durable consumer never sees the message. Restart a consumer (or anything that lands on the *live* store) and a backlog flushes like magic. |
| Realtime / presence | Join works on one pod. Another user never sees it. Leave sticks. Rejoin fails. Websocket adapter events vanish when a replica is talking to the wrong JetStream store than the publishers. |

If you only chase "that one consumer is broken," you miss that the bus itself has a fork.

## The actual failure mode

JetStream durability is per cluster store. Ack from store A does nothing for a durable consumer bound to store B.

How you get two stores behind one `nats` Service:

1. **Two StatefulSets, same labels.** Helm rename, partial cutover, leftover STS. ClusterIP `nats` load-balances across pods that do not share a Raft/JetStream cluster. Every connect is a coin flip.
2. **Orphan PVCs.** Old volume claims still mounted (or ready to be remounted) after a rename. New STS, old disk story, or both alive at once.
3. **Mixed client URLs.** Some services on ClusterIP `nats://nats…:4222`, some pinned to `nats-0` headless, some still on a CSV of servers that the client library never actually splits. Half the fleet is "HA aware." Half is sticky to one member. During a rename (`nats` → `nats-cluster`) that mix is how you invent a second brain without meaning to.

From the outside it still looks like one Service. From JetStream's point of view you have two clusters that happen to share a DNS name.

## The HA shape I settled on

Around 2025 I stopped treating "one NATS pod" as the safe default. A single pod is a single disk, a single node drain, a single spot reclaim away from losing the bus. Shrink-to-one can feel like it dodges the dual-store mess, but it does not. The failure mode above is not "HA is bad." It is **HA done wrong**: two StatefulSets pretending to be one cluster, or stream replicas left at 1 so JetStream is not actually replicated.

What I chose then, and still run toward:

- **One** StatefulSet
- **One** Service (ClusterIP clients use)
- **Three** members in **one** NATS/JetStream cluster
- Stream **replicas = 3** so the stream survives a member loss

One pod is a workaround for messy GitOps. It does not fix dual-STS label soup. It just makes the soup smaller until the next rename.

## What I actually fixed (and what I learned)

### Ops: name it like a cluster, run it like a cluster

In the ops GitOps tree I pushed the HA shape: cluster naming (`nats-cluster`), three replicas, multi-server URL wiring for clients that need it, stream replicas set for real JetStream redundancy. Worth saying out loud: stream replicas later regressed back toward 1 in places. Config drift is part of the story. "We set replicas=3 once" is not the same as "replicas stay 3."

Rule I keep repeating after this: **one STS, one Service, one client URL (ClusterIP).** Never two StatefulSets sharing the selector labels that feed `nats`. If you rename the release, finish the cutover. Delete the orphan STS and the orphan PVCs. Do not leave "old nats" and "new nats-cluster" both Ready.

### Clients: nats.js does not split your CSV

We had `NATS_URL` values that looked HA-correct: comma-separated servers. The JetStream wrapper passed that string through. **nats.js does not parse a comma-separated list for you.** You hand it one URL, or you split and pass an array.

I tightened the wrappers to split on commas before connect. Phrase that carefully: recent fix, not ancient lore. If your env still has a CSV and the client only dials the first host, you are not as redundant as the YAML suggests. You are sticky with extra characters.

Also stop hardcoding `nats-0` in one Deployment while everyone else uses the Service. Pinning the headless pod "for stability" is how half the fleet never moves with the cluster rename.

### Detection: fingerprint the store you actually hit

Same Service DNS can still mean different stream identities. Adding a check for that: `natsIdentity` / stream `created` fingerprint so you can see which JetStream store a process actually connected to. If publishers and consumers disagree on `created`, you are split-brain even when kubectl looks calm.

That is detection. It does not replace the topology rule. It tells you the topology already lied.

## Minimal checklist if this bites you

1. Count StatefulSets that select into Service `nats` (or whatever you named it). **Must be one.**
2. Count Ready pods. Are they one Raft/JetStream cluster or two lonely singles sharing labels?
3. Diff client URLs across Deployments and Vault/env. ClusterIP everywhere, or a museum of headless-0 / old release names / CSV strings?
4. `nats stream info` (or API equivalent): one stream `created`, expected **replicas**. If replicas is 1, you do not have JetStream HA yet.
5. Compare publisher vs consumer stream identity / `created`. Mismatch → wrong store, not "consumer bug."

## Conclusion

Wrong cluster JetStream does not look like "NATS is down." It looks like flaky product: publishers that ack into the void, realtime joins that never fan out, consumers that only wake up after a lucky restart.

Do not shrink to one pod to avoid thinking. Run **one cluster with three members**, one Service, one URL, stream replicas that match the member count. Delete the second STS and its PVCs. Split your own CSV if the client will not. Fingerprint the stream so the next split fails loud.

Till next time, Peace be on you 🙏🏽

#### References

- https://docs.nats.io/nats-concepts/jetstream
- https://docs.nats.io/running-a-nats-service/configuration/clustering
- https://github.com/nats-io/nats.js

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
