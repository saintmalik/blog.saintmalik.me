---
slug: vault-gitops-control-plane
title: "Vault control plane via GitOps. Secret values stay out of git."
authors: Abdulmalik
date: 2026-09-17
image: /bgimg/vault-gitops-control-plane-cover.webp
tags: [vault, gitops, argocd, eks, helm, security, devops, aws, azure]
description: "Most of Vault on Kubernetes can be declared in git: HA, TLS, engines, policies, K8s auth, injector, snapshots. Terraform owns seal identity. Secret values and first init stay out of the repo."
---

import Giscus from "@giscus/react";

I used to treat Vault like a snowflake appliance: click init, paste root token, `vault write` policies by hand, openssl for TLS, Terraform manifests for backups. That series still lives on this blog. Production taught a sharper split.

<!--truncate-->

**GitOps the control plane. Do not GitOps the secret values.**

**In git (ops repo, Argo syncs it):** Helm chart path, raft HA, injector settings, cert-manager TLS, values that declare KV *mounts*, ACL *policy text*, Kubernetes auth *roles*, snapshot CronJob, and a config Job that applies that shape after every install/upgrade (and can restore from the latest snapshot when raft is empty).

**Never in git:** `vault operator init` output, root/admin token, recovery shares, KV *payloads* (`jwtkey`, Stripe, Redis password), AppRole `secret_id`. Those live in SSM / Azure Key Vault (or a one-shot write into Vault). Argo never "syncs" the bytes.

**What the Argo app actually does:** points at something like `operations-repo/<cloud>/<env>/vault/`, renders the HashiCorp Helm chart plus your templates (TLS, CronJob, config Job), and keeps the cluster matching that tree. **What the config Job actually does:** fetches the admin token from the cloud store, then idempotently `vault secrets enable` / `policy write` / `auth enable` / `write auth/kubernetes/role/...`, and optionally pulls the latest `.snap` when storage is empty. Full Job YAML, engines/policies/K8s auth, CronJob, and cert-manager TLS are already written in the [self-healing Vault post](/vault-self-healing-kubernetes/). This post is the ownership map plus how apps wire in.

Cloud glue (KMS / Azure Key Vault seal, IRSA / Workload Identity, backup bucket IAM) stays in OpenTofu. The shape above belongs under Argo CD.

## Who owns what

- **OpenTofu / Terraform** owns the cloud glue: seal key, Vault server identity, snapshotter identity, backup bucket IAM. Crypto identity stays in state, not in the Helm chart.
- **Argo CD + Helm** (ops repo) owns the appliance and the logical config: chart, cert-manager TLS, engines, policies, auth methods, snapshot CronJob, config Job. Shape you can PR and sync.
- **Humans + SSM / cloud secret store** own first bootstrap and the secret *values*: `vault operator init`, parking the root/admin token, `vault kv put`. Never git.

That boundary is the whole security story. If a policy path or K8s role is wrong, fix it in a PR. If a JWT signing key is wrong, rotate it in Vault (or via a Job that reads cloud secrets). Never commit the value so Argo can "sync" it.

## What GitOps can own

### 1. Server HA + injector

Official HashiCorp Helm chart under something like `operations-repo/<cloud>/<env>/vault/`, pointed at by an Argo `Application`. Raft × 3, resources, affinity, Agent Injector with `failurePolicy: Fail` so pods do not start when injection is broken.

```yaml
# Argo Application (sketch). Full example in the self-healing post.
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vault
  namespace: argocd
spec:
  source:
    repoURL: https://git.example.com/ops.git
    path: aws/prod/vault
    helm:
      valueFiles: [values.yaml]
  destination:
    server: https://kubernetes.default.svc
    namespace: vault
  syncPolicy:
    automated: { prune: true, selfHeal: true }
```

Terraform does **not** `helm_release` Vault. Comment that loudly in `vault.tf` so the next engineer does not drag the chart back into state.

### 2. TLS without openssl on a laptop

The [end-to-end TLS post](/end-to-end-tls-vault-eks/) walks CSR + Kubernetes CA by hand (historical). Day-2 path: cert-manager `Issuer` + `Certificate` templates next to the chart ([self-healing Vault post](/vault-self-healing-kubernetes/)). Same DNS SANs, no laptop key material, renewals automatic.

### 3. Engines, policies, auth (config Job)

A Helm post-install / post-upgrade Job is the control-plane applicator. Values declare shape; the Job applies it idempotently. Full Job template lives in the [self-healing post](/vault-self-healing-kubernetes/) (engines, policies, K8s auth, optional auto-restore). Shape sketch with generic names:

```yaml
# values.yaml (shape only; no secret bytes)
vault:
  config:
    enabled: true
    # token path in cloud store, not a committed value
    secrets_engines:
      - path: secret
        type: kv-v2
    policies:
      app-pod-policy: |
        path "secret/data/payments-pod" {
          capabilities = ["read"]
        }
        path "secret/data/api-pod" {
          capabilities = ["read"]
        }
    auth_methods:
      kubernetes:
        enabled: true
        roles:
          - name: app-pod-role
            bound_service_account_names: ["payments-pod", "api-pod"]
            bound_service_account_namespaces: ["apps"]
            policies: ["app-pod-policy"]
            ttl: "1h"
```

```sh
# what the config Job does (sketch; full YAML in self-healing post)
vault secrets enable -path=secret kv-v2   # if missing
vault policy write app-pod-policy ...
vault auth enable kubernetes                  # if missing
vault write auth/kubernetes/config \
  kubernetes_host=... kubernetes_ca_cert=... issuer=...
vault write auth/kubernetes/role/app-pod-role ...
```

Root/admin token for that Job comes from **SSM Parameter Store** or **Azure Key Vault** via IRSA / Workload Identity. Empty placeholder in git. Same pattern as [secrets in IaC](/secrets-in-iac-terraform/): cloud store holds the bootstrap credential; automation assumes a role to read it.

OIDC for humans (Google Workspace, etc.) fits the same Job: enable mount, pull client id/secret from SSM, write roles. Azure environments can leave human OIDC off until ready and keep port-forward + stored root for break-glass.

### 4. Snapshots + optional auto-restore

The [backup/restore post](/automate-vault-backup-restore-on-aws-eks/) is still valid for IRSA + S3. Prefer the CronJob and restore logic as **Helm templates** synced by Argo ([self-healing write-up](/vault-self-healing-kubernetes/)): schedule, snapshotter SA, S3/Blob path, and "empty raft → pull latest `.snap`" in the same config Job. Disaster recovery becomes a sync, not a runbook on someone’s laptop.

Azure Blob + Azure Key Vault seal follows the same split: TF creates seal KV + backup identity; GitOps owns CronJob and restore flags. Do **not** raft-restore across clouds with different seals and JWT issuers. Copy KV paths with a migration Job if you must move clouds.

### 5. How apps consume secrets (still GitOps)

Two delivery paths, both declared in git as **references**, not values:

**Vault Agent Injector** (runtime, majority of services). Mental model in [Good Secrets Management in Kubernetes](/vault-in-kuberbetes/); path/role live in GitOps values here:

```yaml
# chart / values: path + role + key names only
vault:
  secretDataPath: secret/data/payments-pod
  role: app-pod-role
envVars:
  - name: JWT_KEY
    key: jwtkey
```

```yaml
# rendered pod annotations
vault.hashicorp.com/agent-inject: "true"
vault.hashicorp.com/agent-inject-secret-env: secret/data/payments-pod
vault.hashicorp.com/role: app-pod-role
# template exports JWT_KEY from .Data.data.jwtkey
```

**Argo CD Vault Plugin** (sync-time, sparse use, e.g. Redis Helm password):

```yaml
password: <path:secret/data/redis-pod#password>
```

AVP credentials are K8s auth in-cluster or AppRole for cross-cluster. Creds Secret is created from SSM/KV by Terraform or an OOB runbook, never committed. Prefer Agent Inject for app pods; reserve AVP for charts that must see a rendered Secret at sync.

## What stays human (on purpose)

| Step | Why it is not "just Argo sync" |
|------|--------------------------------|
| First `vault operator init` | Creates root of trust; recovery shares / root go to Azure KV or SSM |
| Placing admin token for config Job | Until the token exists in the cloud store, the Job cannot apply policies |
| Writing KV **values** | GitOps maps key *names*; operators or a one-shot Job write the bytes |
| AppRole `secret_id` lifecycle | Role definition can be GitOps; secret_id rotation is OOB / SSM |
| Cross-cloud secret copy | Playbook + in-cluster Jobs; shred exports; no dumps in the repo |

If you skip this list and try to put root tokens or KV payloads in git "temporarily," you do not have GitOps Vault. You have a delayed breach.

## How this maps to the older posts

| Older post | Keep for | Today’s GitOps default |
|------------|----------|-------------------------|
| [Good Secrets Management in Kubernetes](/vault-in-kuberbetes/) | Injector + K8s auth mental model | Paths/roles in GitOps values; fail-closed injector |
| [End-to-end TLS on EKS](/end-to-end-tls-vault-eks/) | SAN checklist, HA TLS requirements (manual openssl path) | cert-manager Certificate in the Vault Argo app |
| [Automate backup/restore](/automate-vault-backup-restore-on-aws-eks/) | IRSA + S3 IAM shape | Snapshot CronJob + restore in Helm hooks |
| [Self-healing Vault](/vault-self-healing-kubernetes/) | Full Helm, config Job, engines/policies/auth, CronJob, cert-manager, auto-restore | Same; this post adds the ownership map + Agent/AVP wiring |
| [Secrets in IaC](/secrets-in-iac-terraform/) | SSM as source for TF | Same stores feed Vault config Job / AVP, not the git tree |

## Rollout order I would use again

1. TF: seal key + Vault IRSA/WI + snapshotter identity + backup bucket.
2. Argo app: Helm HA + cert-manager TLS + injector (`failurePolicy: Fail`).
3. Human: init once; park root/admin token in SSM or seal KV.
4. Values + config Job: engines, policies, K8s auth (and OIDC if ready).
5. Snapshot CronJob; prove one restore on a scratch namespace.
6. Wire one service via Agent inject annotations from GitOps values.
7. Only then AVP for the odd Helm chart that cannot wait for a sidecar.

## Conclusion

Vault on Kubernetes is not "either Terraform or ClickOps." The boring production shape is: **OpenTofu for crypto identity, Argo+Helm for the appliance and logical config, Agent (and sparingly AVP) for delivery, humans for init and secret bytes.** Update the control plane with a pull request. Rotate values out of band. That is how most of Vault becomes securely GitOps without lying to yourself that git is a secret store.

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
