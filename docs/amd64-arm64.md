---
title: "AMD64 vs ARM64: which EC2 architecture to pick"
description: "Quick AMD64 vs ARM64 comparison for EC2: cost and power on ARM (Graviton) versus broader app compatibility on x86/amd64 when choosing instance architecture."
---

import Giscus from "@giscus/react";

Picking an EC2 architecture is mostly: **will your stack run cleanly on ARM, and is the savings worth the validation work?**

## Short answer

| | **ARM64 (Graviton / aarch64)** | **AMD64 (x86_64)** |
|---|---|---|
| Cost / efficiency | Usually cheaper per vCPU and lower power for the same work | Often more expensive for similar throughput |
| Compatibility | Great for many Linux server workloads; some binaries and vendors still lag | Widest software and vendor support |
| When to pick | New services, containers you control, languages with solid ARM builds (Go, Java, Node, Python, most distro packages) | Legacy binaries, licensed apps, anything that only ships x86, or you cannot rebuild/retest yet |

**Default bias today:** try **ARM64 / Graviton** first for greenfield or containerized apps you build yourself. Stay on **AMD64** when a dependency, agent, or commercial product is x86-only or when you have not validated ARM yet.

## What the names mean

- **AMD64** = 64-bit x86 (Intel and AMD CPUs). Same ISA family as most older laptops and servers.
- **ARM64** = 64-bit ARM (on AWS this is Graviton). Same family as Apple Silicon Macs and many phones, but server images and flags differ from macOS.

Docker/OCI image tags often look like `linux/amd64` and `linux/arm64`. Mixing them is a common production footgun: an amd64-only image on an ARM node fails or runs under emulation and burns CPU.

## Practical checklist before you switch to ARM

1. Confirm base images and language runtimes publish `arm64` (or multi-arch) tags.
2. Rebuild and run your CI on `arm64` (or multi-arch build + smoke test).
3. Check sidecars: agents, eBPF tools, proprietary scanners, DB drivers with native code.
4. On EKS/ECS, pin node groups or Karpenter requirements to the arch you actually built for.
5. Measure, do not assume. Graviton often wins on price/perf, but a broken native dependency erases the win.

## Common mistakes

- Assuming "ARM64" on your Mac means the same binary runs on Graviton without a Linux ARM build.
- Deploying a single-arch amd64 image onto an ARM node pool.
- Switching production overnight without a canary on one service.

If you are also sizing nodes and IPs on EKS, these are related: [SSH into EKS nodes](/eks-node-ssh/) and [EKS pod IP exhaustion](/eks-ip-outage/).

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
