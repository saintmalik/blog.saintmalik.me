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

Yeah, the thought process must have crossed your mind too, deploying helm charts via argocd apps, yeah, that feeling, where you know you can finally breathe without doing another long hour wait of tofu apply or terraform apply for a minimal change to your helm chart value configs.

<!--truncate-->

This comes with extra concerns for the security minded individuals, secret, secret, secret, and the risk of exposing sensitive information.

In IaC we've unlocked the many ways of managing secrets from HashiCorp Vault, to cloud provider secret managers like AWS Secrets Manager, and GCP Secret Manager.

And that brings us to many options, if you already have external secret manager controller installed in your cluster, then congratulations, you can just use it to store your secrets.

If you are like me, the vault big fan, then lets go down the rabbit hole of using Argocd Vault Plugin, Haha, i can read your thoughts, you want to plaster the normal app/deployment vault injections config.

Sorry that wont work, dont stress it, you can just use the argocd vault plugin to inject the secrets into your helm chart values.

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

You will also need to update your argocd helm chart values to use the argocd vault plugin, here is the values below

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

I am sure you, you know you must have bounded the service account to your vault role and the secret policy to allow read access to the secret.

Once you've applied and your argocd repo server is up and running, you can now use the argocd vault plugin to inject the secrets into your helm chart values.

Here is an example of a redis deployement using the argocd vault plugin to inject the secret into the helm chart values, the secrets are being injected using ```<path:secret/data/redis-pod#password>```, if you look carefully also you can see that we added the serviceaccount named ```redis-sa``` this service account must also be bounded to the vault role and the secret policy to allow read access to the secret.

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

---


#### References
- [Argo CD Vault Plugin](https://argocd-vault-plugin.readthedocs.io/en/stable/)

Till next time, Peace be on you 🤞🏽

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