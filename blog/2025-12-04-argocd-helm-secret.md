---
slug: helm-argocd-secret-management
title: Dynamic Secret Management On Helm Charts in ArgoCD App
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/gitops-argocd.jpeg
tags: [DevSecOps, Helm, ArgoCD, Secrets]
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Yeah, the thought process must have crossed your mind too, deploying Helm charts via ArgoCD apps. That feeling when you can finally breathe without another long hour of `tofu apply` or `terraform apply` for a minimal change to your Helm chart values.

<!--truncate-->

But wait... what about secrets? 🤔

## The Problem

This GitOps freedom comes with extra concerns for the security minded. **secrets, secrets, secrets** and the risk of exposing sensitive information in your Git repos.

In traditional IaC, we've unlocked many ways of managing secrets:
- HashiCorp Vault
- AWS Secrets Manager
- GCP Secret Manager
- Azure Key Vault

So how do we bring this to ArgoCD?

## Your Options

You have a few paths here:

1. **External Secrets Operator** - If you already have it installed, you're golden. Just use it.
2. **ArgoCD Vault Plugin (AVP)** - Perfect for Vault fans like me

If you're thinking **"I'll just use the normal Vault sidecar injection..."** sorry, that won't work with Helm charts in ArgoCD. But don't stress, the ArgoCD Vault Plugin has you covered.

## Prerequisites

Before we dive in, make sure you have:

- ✅ HashiCorp Vault deployed and accessible
- ✅ ArgoCD installed in your cluster
- ✅ Kubernetes service account with Vault permissions
- ✅ Vault role and policy configured for your secrets

## Step 1: Create the AVP Credentials Secret

First, create a secret containing your Vault connection details:

```hcl
resource "kubectl_manifest" "avp_plugin_secret" {
  yaml_body = <<-EOF
apiVersion: v1
kind: Secret
metadata:
  name: argocd-vault-plugin-credentials
  namespace: argocd
type: Opaque
stringData:
  AVP_TYPE: vault
  AVP_AUTH_TYPE: k8s
  AVP_K8S_ROLE: helm-pod-role
  VAULT_ADDR: https://vault.vault.svc.cluster.local:8200
  VAULT_SKIP_VERIFY: "true"
  EOF
}
```

## Step 2: Configure the CMP Plugin

Next, create a ConfigMap that defines how ArgoCD should process Helm charts with Vault secrets:

```hcl
resource "kubectl_manifest" "cmp_plugin_configmap" {
  yaml_body = <<-EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: cmp-plugin
  namespace: ${kubernetes_namespace.argocd[0].id}
data:
  avp-helm.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: argocd-vault-plugin-helm
    spec:
      allowConcurrency: true
      discover:
        find:
          command:
            - sh
            - "-c"
            - "find . -name 'Chart.yaml' && find . -name 'values.yaml'"
      generate:
        command:
          - bash
          - "-c"
          - |
            set -e
            helm template $ARGOCD_APP_NAME -n $ARGOCD_APP_NAMESPACE -f <(echo "$ARGOCD_ENV_HELM_VALUES") . --include-crds | \
            argocd-vault-plugin generate -s argocd:argocd-vault-plugin-credentials -
      lockRepo: false
  EOF
}
```

> **💡 What's happening here?**
> The plugin runs `helm template` to render your chart, then pipes the output through `argocd-vault-plugin` which replaces any `<path:...>` placeholders with actual secrets from Vault.

## Step 3: Update ArgoCD Helm Values

Now update your ArgoCD Helm chart values to include the plugin sidecar:

```yaml
repoServer:
  replicas: 1
  securityContext:
    runAsUser: 999
    runAsGroup: 999
    runAsNonRoot: true
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
  serviceAccount:
    create: true
    name: argocd-repo-server
    automountServiceAccountToken: true

  volumes:
    - name: cmp-plugin
      configMap:
        name: cmp-plugin
    - name: cmp-tmp
      emptyDir: {}
    - name: var-files
      emptyDir: {}
    - name: plugins
      emptyDir: {}
    - name: custom-tools
      emptyDir: {}

  initContainers:
    - name: download-tools
      image: registry.access.redhat.com/ubi8
      env:
        - name: AVP_VERSION
          value: "1.16.1"
        - name: HELM_VERSION
          value: "3.13.3"
      command: [sh, -c]
      args:
        - >-
          curl -L https://github.com/argoproj-labs/argocd-vault-plugin/releases/download/v$${AVP_VERSION}/argocd-vault-plugin_$${AVP_VERSION}_linux_arm64 -o argocd-vault-plugin &&
          chmod +x argocd-vault-plugin &&
          mv argocd-vault-plugin /custom-tools/ &&
          curl -L https://get.helm.sh/helm-v$${HELM_VERSION}-linux-arm64.tar.gz | tar xz &&
          mv linux-arm64/helm /custom-tools/helm &&
          chmod +x /custom-tools/helm
      volumeMounts:
        - mountPath: /custom-tools
          name: custom-tools

    - name: avp-helm
      command: [/var/run/argocd/argocd-cmp-server]
      image: registry.access.redhat.com/ubi8
      securityContext:
        runAsNonRoot: true
        runAsUser: 999
      env:
        - name: HELM_CACHE_HOME
          value: /tmp/helm/cache
        - name: HELM_CONFIG_HOME
          value: /tmp/helm/config
        - name: HELM_DATA_HOME
          value: /tmp/helm/data
      volumeMounts:
        - mountPath: /var/run/argocd
          name: var-files
        - mountPath: /home/argocd/cmp-server/plugins
          name: plugins
        - mountPath: /tmp
          name: cmp-tmp
        - mountPath: /home/argocd/cmp-server/config/plugin.yaml
          subPath: avp-helm.yaml
          name: cmp-plugin
        - name: custom-tools
          subPath: argocd-vault-plugin
          mountPath: /usr/local/bin/argocd-vault-plugin
        - name: custom-tools
          subPath: helm
          mountPath: /usr/local/bin/helm
```

> ⚠️ **Don't forget:** Your service account must be bound to the Vault role with appropriate secret read permissions.

## Step 4: Deploy Your App with Secrets

Once your ArgoCD repo server is up and running, you can deploy apps that reference Vault secrets. Here's a Redis example:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: redis
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    chart: redis
    repoURL: registry-1.docker.io/bitnamicharts
    targetRevision: 22.0.7
    plugin:
      name: argocd-vault-plugin-helm
      env:
        - name: HELM_VALUES
          value: |
            fullnameOverride: redis
            image:
              registry: docker.io
              repository: bitnamilegacy/redis
              tag: 8.2.1-debian-12-r0
            auth:
              enabled: true
              sentinel: true
              password: <path:secret/data/redis-pod#password>

            commonConfiguration: |-
              appendonly no
              save 900 1
              save 300 10
              save 60 10000

            master:
              persistence:
                enabled: true

            replica:
              replicaCount: 3

            sentinel:
              enabled: true
              masterSet: redismain
              quorum: 2
              auth:
                enabled: true
                password: <path:secret/data/redis-pod#password>
              image:
                registry: docker.io
                repository: bitnamilegacy/redis-sentinel
                tag: 8.2.1-debian-12-r0

            serviceAccount:
              create: true
              name: redis-sa
              automountServiceAccountToken: true

  destination:
    server: https://kubernetes.default.svc
    namespace: microcore

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - Replace=true
```

### The Magic: Secret Placeholders

Notice the `<path:secret/data/redis-pod#password>` syntax? That's the AVP placeholder format:

```
<path:SECRET_PATH#KEY>
```

The plugin replaces these with actual values from Vault at deploy time. **Your secrets never touch Git!** 🎉

> **Important:** The `redis-sa` service account must also be bound to your Vault role with read access to the secrets.

---

## Key Takeaways

-  **ArgoCD Vault Plugin** bridges GitOps and secret management
- Works seamlessly with Helm charts via CMP sidecar
- Secrets are injected at deploy time, not stored in Git
- Use `<path:...>` placeholders in your values

## References

- [ArgoCD Vault Plugin Documentation](https://argocd-vault-plugin.readthedocs.io/en/stable/)
- [ArgoCD Config Management Plugins](https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/)
- [HashiCorp Vault Kubernetes Auth](https://developer.hashicorp.com/vault/docs/auth/kubernetes)

---

Till next time, Peace be on you ✌🏽

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