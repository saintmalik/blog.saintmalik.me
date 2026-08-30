---
slug: kubernetes-memory-forensics-volatility
title: "The Incident Response Step Most Teams Skip: Memory Forensics for Kubernetes"
authors: Abdulmalik
image: /bgimg/kubernetes-memory-forensics-volatility.webp
tags: [devsecops, kubernetes, eks, incident-response, volatility, memory-forensics, appsec, containers]
description: Audit logs and Falco catch a lot. Fileless malware, process hollowing, and other in-memory artifacts often live only in RAM. How to capture memory from an EKS node with AVML and what Volatility 3 actually gives you in a Kubernetes IR.
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Your audit logs are quiet. Falco did not fire. The pod filesystem looks clean. And the threat actor is still in the cluster.

<!--truncate-->

That is the gap memory forensics exists to close. Disk and API logs answer *what touched the control plane*. RAM answers *what was running when you froze the box*, including the process that never wrote a file, the shellcode sitting in a hollowed Go binary, and the cloud token that only existed as a string in process memory.

I already wrote about [why audit logs alone will not save you](/kube-ir-playbook-audit-logs/) and about [runtime detection with Falco](/kubernetes-runtime-security/). This post is the next layer most Kubernetes IR playbooks still leave blank: **capture memory, then ask Volatility what was actually there**.

## tl;dr

- Containers are ephemeral. Killed pod may delete the only copy of artifacts to dig into.
- On EKS (EC2 nodes), capture **node memory** with [AVML](https://github.com/microsoft/avml), then analyze with [Volatility 3](https://github.com/volatilityfoundation/volatility3). Fargate is a different problem.
- Volatility will not magically "see pods." You get Linux processes, nets, and injected regions. You map those back to containers yourself with `crictl` / cgroup / namespace context you captured at the same time.
- Practice on a lab node before you need this at 2am. Symbol tables (ISF) for your AMI kernel are the friction point, not the CLI.

## Why Memory Matters More in Kubernetes

On a traditional VM, "image the disk, then image memory" is standard DFIR. On Kubernetes, three things make memory the higher-value artifact:

1. **No durable disk for the workload.** The container rootfs dies with the pod. Fileless loaders and in-memory backdoors leave nothing for `kubectl cp` or a volume snapshot.
2. **threat actors know that.** Post-exploitation that stays in RAM is a rational choice against teams whose IR stops at CloudWatch and ECR scans.
3. **Your detection stack is syscall- and API-biased.** Falco sees `execve`. Audit logs see API calls. Neither reconstructs the full process tree and open sockets at a frozen point in time the way a memory image does.

Memory is not a replacement for those controls. It is what you reach for when they are silent and you still have a live, suspicious node.

## Capture Before You Contain (Order Matters)

Same rule as the IR playbook: **quarantine, do not delete**.

```text
1. Isolate network (NetworkPolicy / security group), keep the process alive
2. Cordon the node, stop new pods landing on the evidence host
3. Capture volatile state (memory + runtime inventory)
4. Then rotate credentials and rebuild
```

If someone on the bridge says "just delete the Deployment," that is when you lose the dump.

Also decide *what* you are imaging:

| Target | What you get | When to use it |
|---|---|---|
| **Worker node RAM** (AVML) | Full host memory: kubelet, containerd, every container's pages | Default on EKS EC2 node groups |
| **Per-process dump** (`gcore` / [varc](https://github.com/cado-security/varc)) | Smaller, faster, scoped to PIDs you already digging down to | When you know the bad PID and full RAM is too large / too slow |
| **Sidecar with shared PID ns** | Access to target pod processes without full node SSH | Restricted environments; still needs privilege |

Fargate and other serverless node models do not give you a host to dump. Plan process-level collection and cloud provider IR paths separately. Do not pretend AVML works there.

## Capturing Node Memory on EKS With AVML

[AVML](https://github.com/microsoft/avml) (Acquire Volatile Memory for Linux) is the practical choice on modern cloud Linux: userspace binary, no kernel module compile against the running AMI, LiME-format output that Volatility understands.

Via SSM or an IR break-glass role on the cordoned node:

```bash
# on the compromised worker (example)
curl -fsSL -o avml \
  https://github.com/microsoft/avml/releases/latest/download/avml
chmod +x avml

# write OFF the compromised root disk if you can (EBS volume / NFS / IR share)
sudo ./avml /mnt/ir/case-$(date +%Y%m%d)-$(hostname)-memory.lime

# ship to an evidence bucket your IR role can write, responders can read
aws s3 cp /mnt/ir/case-*-memory.lime s3://org-dfir-evidence/eks/case-047/
```

AVML is quiet while it runs. Confirm the file exists and is roughly the size of host RAM before you tear the node down.

**Alongside the dump, freeze the runtime context.** Volatility will show PIDs. You need the map from PID → container → pod:

```bash
# still on the node, before reboot / drain
crictl ps -a > /mnt/ir/crictl-ps.txt
crictl pods > /mnt/ir/crictl-pods.txt
# host PID of a container you care about
crictl inspect <container-id> | jq '{pid: .info.pid, name: .status.metadata.name}'

kubectl get pod -A -o wide --field-selector spec.nodeName=$(hostname) \
  > /mnt/ir/pods-on-node.txt
```

Without that sidecar inventory, a Volatility `pslist` is a phone book with no street names.

## Volatility 3: What You Actually Run

Volatility is a Python framework for extracting structured artifacts from a memory image. Volatility 3 dropped the old "profile" pain for a symbol-table model (ISF). Linux still needs the right symbols for your kernel; Windows is generally smoother. Budget time for ISF generation against your EKS AMI, that is the part people skip in demos and regret in incidents.

```bash
# install once on your analysis workstation / forensics AMI
pipx install volatility3
# or: git clone https://github.com/volatilityfoundation/volatility3 && pip install -e .

# sanity check: is this a usable image, what kernel?
vol -f memory.lime banners
vol -f memory.lime linux.banner
```

If `banners` fails or the kernel string does not match an ISF you have, stop and fix symbols before you trust plugin output.

### Plugins that earn their keep in a container IR

```bash
# who was running
vol -f memory.lime linux.pslist
vol -f memory.lime linux.pstree

# sockets that were live at capture time (C2 that already closed on disk)
vol -f memory.lime linux.sockstat
# or equivalent net plugins available for your vol3 build / symbols

# injected / anomalous executable regions
vol -f memory.lime linux.malfind

# strings / YARA over process or VMA space for tokens, beacons, known loaders
vol -f memory.lime linux.vmayarascan --yara-file rules/ir.yar
```

What you are hunting for, mapped to Kubernetes reality:

| Finding | Why it matters on a node |
|---|---|
| Process that is not in your golden image / not a child of `containerd-shim` as expected | Rogue binary, breakout helper, miner |
| `malfind` hits inside a language runtime or sidecar | Process injection / hollowing |
| Unexpected outbound sockets to raw IPs / odd ports | C2, mining pools, IMDS abuse from a process that already exited |

Correlate suspicious host PIDs back to `crictl inspect` output. That is how "weird process 148822" becomes "compromised pod `booking-api-7f9c` in `staging`."

## A Minimal Lab (Write From Something Real)

Do not publish a Volatility post from theory alone. A one-evening lab is enough:

1. Throwaway EKS node group or a single EC2 with containerd + a test Deployment.
2. Exec into a pod and run something loud but contained (e.g. a reverse shell to a host you own, or a known training sample in an isolated VPC).
3. Cordon, AVML the node, capture `crictl` inventory, kill the workload.
4. On your laptop or a forensics AMI: `banners` → `pslist` → find the shell → `malfind` / net plugins → match PID to the pod.

That walkthrough, with redacted screenshots of `pslist` next to `crictl` is the difference between another "what is Volatility" SEO page and something an on-call engineer can follow during an incident.

## Where This Fits Your Existing Stack

```text
Detect (Falco / GuardDuty / audit) 
  → Triage (logs, TSV sweep, lnav)
  → Contain (NetworkPolicy, cordon)
  → Preserve (AVML + runtime inventory + disk if needed)
  → Analyze (Volatility 3)
  → Eradicate (rotate, rebuild, redeploy)
```

Memory forensics is step four, not step one. If you have no detection and no containment plan, a perfect dump still leaves you watching the threat actor move.

For offensive work the inverse also holds: if you know what `malfind` and `sockstat` surface, you know how loud your post exploitation tooling is and you can put that in the report as blue team readiness, not just "we got a shell."

## Closing

Kubernetes IR that stops at audit logs and image scans assumes threat actors writes to disk and calls the API like a polite citizen. Plenty of them do not.

Add memory capture to the playbook: AVML on the cordoned node, inventory with `crictl`/`kubectl`, Volatility 3 for process and injection artifacts, then rebuild. Practice the symbol-table friction on a lab AMI before production hands you a 64GB `.lime` file and a war room.

Audit logs tell you who asked the API for what. Memory tells you what was still breathing when you finally looked.

## Further Reading

- [Volatility Foundation / Volatility 3](https://github.com/volatilityfoundation/volatility3)
- [Microsoft AVML](https://github.com/microsoft/avml)
- [Cado VARC (volatile artifact collector, including container-friendly collection)](https://github.com/cado-security/varc)
- [AWS EKS incident response and forensics best practices](https://docs.aws.amazon.com/eks/latest/best-practices/incident-response-and-forensics.html)
- Earlier on this blog: [Kubernetes IR playbook (audit logs)](/kube-ir-playbook-audit-logs/), [Kubernetes runtime security (Falco)](/kubernetes-runtime-security/)

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
