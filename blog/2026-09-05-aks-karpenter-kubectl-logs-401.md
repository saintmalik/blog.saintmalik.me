---
slug: aks-karpenter-kubectl-logs-401
title: "AKS + Karpenter: kubectl logs returns 401 Unauthorized"
authors: Abdulmalik
date: 2026-09-05
image: /bgimg/aks-karpenter-kubectl-logs-401-cover.webp
tags: [azure, aks, karpenter, kubernetes, debugging, incident]
description: get/describe work, logs and exec return 401, but only on Karpenter nodes. RBAC-off AKS, kubelet anonymous-auth mismatch, and the DaemonSet that fixed it.
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

`kubectl get pods` is fine. `kubectl describe` is fine. Then you hit `kubectl logs` on a pod that just landed on a Karpenter node and get `401 Unauthorized`. Same cluster. Same context. Pods on the system pool still give you logs. That split is the smell.

<!--truncate-->

Incident writeup from an AKS preprod cluster running self-hosted Karpenter (Azure provider). Not a tutorial. Wrong rabbit holes first, then the real cause, then what I shipped so new nodes stop doing it again.

Still deciding whether Karpenter on AKS is even worth it? I wrote the [constraints post](/aks-karpenter-quota-constraints/) separately. This one assumes the nodes already exist and kubectl is failing in a very specific way.

## What broke

| Works | Broken |
| --- | --- |
| `kubectl get` / `describe` | `kubectl logs` |
| API list/watch | `kubectl exec` / `attach` |
| Pods on the **system** VMSS | Pods on **Karpenter** nodes |
| | `nodes/proxy` style calls |

Control plane is fine. Your credentials are not "completely wrong." Something about **apiserver → kubelet** on a subset of nodes is rejecting the proxy.

## Rabbit holes (wrong)

### 1. Bad kubeconfig

First instinct on any weird auth error: regenerate credentials.

```bash
az aks get-credentials -g <rg> -n <cluster> --overwrite-existing
```

Still 401 on Karpenter pods. System-pool pods still fine.

Then try the cluster admin local account:

```bash
az aks get-credentials -g <rg> -n <cluster> --admin
```

Still 401 on Karpenter nodes until I fixed the kubelet flag. Prefer `--admin` when the cluster still has local accounts and you're debugging auth weirdness, but **kubeconfig alone was not the bug**. Admin vs user only changes who you are to the apiserver. The failure was past that.

### 2. NetworkPolicy / CNI

"Maybe Cilium is dropping the proxy." Unlikely when `get` works and only kubelet streaming endpoints fail, and only on one node class. Still burned time grepping policies. Not it.

### 3. Azure Portal / Log Analytics

Portal container logs and Log Analytics take a different path. If those work while `kubectl logs` fails, that's a clue: the problem is the **Kubernetes apiserver→kubelet** hop, not "the container has no stdout."

## Real cause

Cluster had **Kubernetes RBAC disabled** (`enableRBAC=false` / local accounts era). That matters because AKS does not wire the same kubelet auth story you get with RBAC on.

On the **managed system pool**, kubelet was running with:

```text
--anonymous-auth=true
```

So when the apiserver proxies `logs`/`exec` to that kubelet without a client cert that kubelet would accept under stricter settings, anonymous is allowed and it works.

On **Karpenter-provisioned nodes**, `/etc/default/kubelet` came up with:

```text
--anonymous-auth=false
```

Same apiserver proxy. Different kubelet. **401 Unauthorized.**

That's why the split was so clean: system node = logs work; Karpenter node = 401. API object access never touches kubelet the same way, so `get`/`describe` keep looking healthy.

Compare flags yourself if you can reach the node (Run Command, SSH jump, privileged debug pod, whatever your break-glass is):

```bash
grep anonymous-auth /etc/default/kubelet
# system pool:   --anonymous-auth=true
# karpenter node: --anonymous-auth=false
```

## Fix

### Immediate: patch live nodes

Flip the flag on existing Karpenter nodes and restart kubelet:

```bash
# on the node
sed -i 's/--anonymous-auth=false/--anonymous-auth=true/g' /etc/default/kubelet
systemctl restart kubelet
```

I did that via Azure Run Command across the Karpenter nodes. Logs/exec came back. (If you saw a pause / cooldown screenshot elsewhere in this weekend's notes, that's not the same thing as this DaemonSet fix.)

### Durable: DaemonSet so new nodes self-fix

Karpenter will keep shipping nodes with the provider default. One-shot Run Command does not survive scale-up. Ship a privileged DaemonSet in `kube-system` that:

1. mounts the host root
2. checks `/etc/default/kubelet` for `--anonymous-auth=false`
3. patches to `true`, drops a marker under `/var/lib`, restarts kubelet
4. sleeps forever if the marker is already there (so it does not restart-loop)

Sketch (trim to your nodeSelector / image policy):

```yaml title="kubelet-anonymous-auth-fix.yaml"
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kubelet-anonymous-auth-fix
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: kubelet-anonymous-auth-fix
  template:
    metadata:
      labels:
        app.kubernetes.io/name: kubelet-anonymous-auth-fix
    spec:
      hostPID: true
      tolerations:
        - operator: Exists
      nodeSelector:
        karpenter.sh/nodepool: general   # your pool label
      containers:
        - name: fix
          image: mcr.microsoft.com/azurelinux/base/core:3.0
          securityContext:
            privileged: true
          volumeMounts:
            - name: host-root
              mountPath: /host
          command:
            - /bin/bash
            - -ec
            - |
              MARKER=/host/var/lib/kubelet-anonymous-auth-fix.done
              FILE=/host/etc/default/kubelet
              [[ -f "$MARKER" ]] && exec sleep infinity
              if grep -q -- '--anonymous-auth=false' "$FILE"; then
                sed -i 's/--anonymous-auth=false/--anonymous-auth=true/g' "$FILE"
                touch "$MARKER"
                chroot /host systemctl restart kubelet
              fi
              touch "$MARKER"
              exec sleep infinity
      volumes:
        - name: host-root
          hostPath:
            path: /
```

This is a **workaround**, not a security goal. You're aligning Karpenter nodes with what AKS already does on the system pool under `enableRBAC=false`.

### Longer term

Recreate (or rebuild) the cluster with **RBAC enabled**. That is ForceNew in Terraform/OpenTofu land on AKS, so plan for it. Once mTLS / kubelet auth matches a normal RBAC cluster, delete the DaemonSet.

Until then: when you grab credentials on these clusters, use `--admin` if you still rely on local accounts. Don't assume a user kubeconfig failure mode when the real split is node-class kubelet flags.

## Lessons

1. **Node pools do not share kubelet flags.** Managed system VMSS ≠ Karpenter bootstrap. Diff `/etc/default/kubelet` before you rewrite your kubeconfig for the third time.
2. **`kubectl get` green does not mean kubelet proxy is green.** Logs/exec/attach are a different path.
3. **RBAC-off clusters lie differently.** With `enableRBAC=false`, anonymous kubelet auth on system nodes is how AKS makes the happy path work. Anything that boots nodes "more correctly" (`anonymous-auth=false`) will look like a permissions bug.
4. **Fix the bootstrap or fix every node forever.** One Run Command is incident response. A DaemonSet (or a provider/bootstrap change) is how you stop paging yourself on the next scale-out.
5. **`--admin` when local accounts exist** is useful for auth debugging. It is not a substitute for fixing kubelet.

## Conclusion

Symptom looked like auth. Cause was a kubelet flag mismatch between AKS system nodes and Karpenter nodes on an RBAC-disabled cluster. Patch + DaemonSet unblocked preprod. Real cleanup is an RBAC-on rebuild.

Till next time, Peace be on you 🙏🏽

#### References

- https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- https://learn.microsoft.com/en-us/azure/aks/manage-azure-rbac
- https://github.com/Azure/karpenter-provider-azure
- https://blog.saintmalik.me/aks-karpenter-quota-constraints/

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
