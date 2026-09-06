---
slug: aks-karpenter-quota-constraints
title: "Self-hosted Karpenter on AKS: Cilium, CAS, and the quota wall"
authors: Abdulmalik
date: 2026-09-05
image: /bgimg/aks-karpenter-quota-constraints-cover.webp
tags: [azure, aks, karpenter, kubernetes, autoscaling, cilium]
description: Why you cannot just flip the NAP addon on a Calico + CAS cluster, what Cilium costs you, and how regional vCPU quota turns NodePool requirements into "filtered out all available instance types."
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

On EKS, "run Karpenter" is mostly: chart, IRSA, NodePool, EC2NodeClass. On AKS the same sentence hits a wall of prerequisites Microsoft already documented. Then a quieter wall nobody puts in the getting-started: **regional vCPU quota**.

<!--truncate-->

This is the constraints post, not a full install runbook. The question was: self-hosted Azure Karpenter provider (GitOps the controller like AWS) vs AKS Node Auto Provisioning (NAP), on an existing Standard cluster that was still on Calico with cluster autoscaler on.

Related: once nodes exist, you can still get [kubectl logs 401 on Karpenter nodes](/aks-karpenter-kubectl-logs-401/) if the cluster is RBAC-off. Different problem. Same weekend.

## "Just enable the addon"

NAP is the path Microsoft wants. AKS runs the controller, rotates bootstrap tokens, owns chart/version/node image churn. You still GitOps `NodePool` + `AKSNodeClass`. Capacity policy stays yours. Helm ownership does not.

Self-hosted (`oci://mcr.microsoft.com/aks/karpenter/karpenter`) matches the AWS install muscle memory: you own upgrades, tokens, values. Azure provider README is blunt: prefer NAP; Microsoft support channels for Karpenter are really about NAP; self-hosted is GitHub best-effort.

So why not just `--node-provisioning-mode Auto`?

Because the cluster was not eligible yet. And even after it was, quota decides whether a NodePool is a schedule or decorative YAML.

## Hard gate: Calico → Cilium

Docs (NAP networking + Azure Karpenter provider README):

- **Calico unsupported** for NAP and for the Azure provider
- **Kubenet unsupported** (provider)
- Recommended shape: Azure CNI + **Cilium** (often Overlay; Overlay is recommended, not always required for eligibility)

So before Karpenter of either flavor: leave Calico.

On an existing AKS cluster that meant roughly:

```bash
az aks update \
  -g <rg> -n <cluster> \
  --network-dataplane cilium \
  --network-policy cilium
```

Expect a **full node reimage**. Budget downtime. Enabling Cilium uninstalls Calico/NPM policy engines, so review NetworkPolicies for behavior drift. Standard Kubernetes NetworkPolicy objects are usually fine. Calico-only CRDs are not.

Ordering trap if you already had NAP: Microsoft says you **cannot** jump to Azure CNI Powered by Cilium in one shot with NAP on. Workaround is disable NAP → update dataplane → re-enable. Prefer **Cilium first, then Karpenter/NAP** on an existing cluster.

I stayed on Node Subnet + Cilium (no Overlay migrate). Overlay is irreversible and has its own policy prerequisites. Cilium on Node Subnet was enough to clear the Calico gate for Karpenter.

## CAS off (or carefully tainted)

Two scalers fighting for pending pods is how you get surprise VMs.

Clean path:

```bash
az aks update -g <rg> -n <cluster> --disable-cluster-autoscaler
# and/or per nodepool:
az aks nodepool update -g <rg> --cluster-name <cluster> -n <pool> --disable-cluster-autoscaler
```

Disabling CAS does **not** delete nodes. Then enable NAP, or install self-hosted, then apply NodePools.

There is a coexistence feature flag (`AllowClusterAutoscalerAndNAP`) with taints so CAS and NAP do not double-provision. Fine as a bridge. Do not leave it forever.

Terraform/OpenTofu modules (including AVM AKS) often refuse `auto_scaling_enabled=true` together with NAP `Auto`. Believe the precondition.

## Self-hosted vs NAP (what I actually chose)

| | NAP | Self-hosted Azure provider |
| --- | --- | --- |
| Controller | AKS managed | You (Helm from MCR) |
| GitOps | CRDs | Chart values + CRDs + identity glue |
| Support | Microsoft (NAP) | GitHub best-effort |
| Auth to Azure | Cluster MI | Workload identity + UAMI + federated credential |
| Ops tax | Lower | Token rotation, chart pins, node image story |

Self-hosted if you explicitly want controller lifecycle in Git like EKS. Otherwise NAP is the boring correct answer. Either way you still need Cilium (or another supported CNI path), CAS discipline, and CRDs that fit **quota**.

## The quiet constraint: regional vCPU quota

Karpenter does not invent capacity Azure will not give you.

Inputs that matter as much as the Helm chart:

- **Region + family quota** (e.g. DSv4 vCPUs almost exhausted)
- **Zones** your NodePool allows (`topology.kubernetes.io/zone`)
- **SKU filters** (`sku-name` / `sku-family` / size requirements)
- **Capacity type** (on-demand vs Spot)
- **NodePool CPU/memory limits** so a bad deploy cannot eat the subscription

Tighten zone to one availability zone and pin a small SKU family because that is what the system pool already uses, and you will watch Karpenter events say it **filtered out all available instance types**. Not because the chart is broken. Because the intersection of (zone × family × remaining quota × Spot availability) is empty.

Classic loop:

1. Pending pods
2. NodePool requirements look "reasonable" (same SKU as system pool, one zone)
3. Quota for that family is already at or near the cap
4. Karpenter correctly provisions nothing useful
5. You debug scheduling, CNI, and identity for an hour

What actually helps, in order of honesty:

1. **Raise the quota** for the family/region (support request; waits)
2. **Widen SKUs** in the NodePool (other families you still have headroom for, e.g. a Ddsv4 preference when DSv4 is pinned)
3. **Allow Spot** where the workload can die
4. **Lower NodePool limits / stop asking for more replicas** than quota can pay for
5. **Free quota** by shrinking or deleting unused AgentPools that still hold the same SKU family

Quota is a design input, not an afterthought. Write NodePool requirements against `az vm list-usage` (or the portal Quotas blade), not against the SKU you wish you had.

Example shape. Keep limits explicit:

```yaml title="nodepool-snippet.yaml"
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: general
spec:
  limits:
    cpu: "16"          # hard ceiling vs subscription remaining
  template:
    spec:
      requirements:
        - key: topology.kubernetes.io/zone
          operator: In
          values: ["3"]                 # match what you actually have
        - key: karpenter.azure.com/sku-family
          operator: In
          values: ["D"]                 # widen if one family is capped
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand", "spot"] # if the app can take Spot
```

Tune to your provider version / Azure requirement keys. The point is the **limits and the intersection**, not copying keys blindly.

## Order of ops (existing cluster)

1. Decide NAP vs self-hosted (default NAP unless you need chart ownership)
2. **Cilium** (and policy review), before Karpenter
3. **Disable CAS** (or short coexistence with taints)
4. Enable NAP *or* install chart + WI/UAMI + `MC_*` RBAC
5. Apply `AKSNodeClass` + `NodePool` sized to **quota + zones**
6. Only then scale workloads that assume dynamic capacity

Skip step 2 or 3 and the addon/controller install is the easy part of a bad day. Skip quota math and you get a healthy controller that politely refuses to create anything.

## Conclusion

Karpenter on AKS is less "install the autoscaler" and more: clear the networking prerequisite, pick who owns the controller, turn CAS off, then provision inside a quota envelope. Cilium was the documented gate. Regional vCPU was the undocumented feeling of defeat. Widen SKUs or raise quota. The YAML will not negotiate with Azure for you.

Till next time, Peace be on you 🙏🏽

#### References

- https://learn.microsoft.com/en-us/azure/aks/node-auto-provisioning
- https://learn.microsoft.com/en-us/azure/aks/node-auto-provisioning-networking
- https://learn.microsoft.com/en-us/azure/aks/migrate-from-autoscaler-to-node-auto-provisioning
- https://learn.microsoft.com/en-us/azure/aks/update-azure-cni
- https://github.com/Azure/karpenter-provider-azure
- https://blog.saintmalik.me/aks-karpenter-kubectl-logs-401/
- https://blog.saintmalik.me/autoscaling-eks-karpenter/

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
