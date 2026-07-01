---
slug: vault-in-kuberbetes
title: Good Secrets Management in Kubernetes
authors: Saintmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/kube-secret-management.jpeg
tags: [appsec, kube, devsecops]
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

You are probably handling secrets in Kubernetes like this today:

<!--truncate-->

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: hashicorp-vault-k8s
  name: hashicorp-vault-k8s
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hashicorp-vault-k8s
  template:
    metadata:
      labels:
        app: hashicorp-vault-k8s
    spec:
      containers:
      - image: busybox
        name:
        env:
        - name: API_KEY
          value: jduhdshieioieiisbbjsb
```

Hard-coding secrets in environment variables or mounting them as files has three problems:

1. They are plaintext in the manifest.
2. They are plaintext in etcd.
3. They can end up committed to Git if the manifest is your source of truth.

This guide replaces that pattern with HashiCorp Vault, the Kubernetes auth method, and the Vault Agent Injector.

## What you will build

1. Vault running in a namespace on your cluster.
2. Kubernetes authentication between Vault and your pods.
3. A KV secrets engine holding your secrets.
4. A Vault policy and role controlling which pod can read which secret.
5. A deployment that receives secrets at runtime from Vault instead of from the manifest.

## Environment

- AWS EKS (Fargate)
- Helm, kubectl, and Vault CLI locally

## Install Vault

Create a namespace and install Vault:

```bash
kubectl create ns vault
helm install vault hashicorp/vault --namespace vault
```

:::note
This uses the default Helm configuration with a file backend. For production, use a Consul-backed or integrated storage with high availability.
:::

After install, the `vault-0` pod will not be ready because Vault is sealed.

## Initialize and unseal Vault

```bash
kubectl exec -it vault-0 -n vault -- vault operator init
kubectl exec -it vault-0 -n vault -- vault operator unseal KEY1
kubectl exec -it vault-0 -n vault -- vault operator unseal KEY2
kubectl exec -it vault-0 -n vault -- vault operator unseal KEY3
```

Save the root token and unseal keys somewhere safe. If you lose them, you lose Vault and its data.

Then log in:

```bash
kubectl exec -it vault-0 -n vault -- vault login
```

For production, configure [auto-unseal with AWS KMS](https://developer.hashicorp.com/vault/docs/configuration/seal/awskms).

## Configure Kubernetes authentication

Enable the Kubernetes auth method:

```bash
vault auth enable kubernetes
```

Configure it to trust the cluster:

```bash
vault write auth/kubernetes/config \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_host=https://${KUBERNETES_PORT_443_TCP_ADDR}:443 \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  issuer="https://kubernetes.default.svc.cluster.local"
```

You can reach the Vault UI by port-forwarding if you prefer:

```bash
kubectl port-forward svc/vault -n vault 8200:8200
```

## Create a KV secret

Enable the KV secrets engine:

```bash
vault secrets enable -path=secret/ kv-v2
```

Write a secret:

```bash
vault kv put -mount=secret golangsecrets \
  apikey="jduhdshieioieiisbbjsb" \
  awskey="96859988gddjjdjds" \
  webhooksecret="jimjimjimokaynice"
```

The values are now accessible at `secret/data/golangsecrets`.

## Create a custom service account

Pods authenticate to Kubernetes using service accounts. Create one for the workload:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hashicorp-vault-k8s-pod
  labels:
    app: hashicorp-vault-k8s-pod
```

## Create a Vault policy

Create a policy that grants read access to the secret path:

```hcl
# hashicorp-vault-k8s.hcl
path "/secret/data/golangsecrets" {
  capabilities = ["read"]
}
```

Apply it:

```bash
vault policy write hashi-vault-k8s-policy hashicorp-vault-k8s.hcl
```

## Create a Vault role

The role binds the policy to a service account and namespace:

```bash
vault write auth/kubernetes/role/hashi-vault-k8s-role \
    bound_service_account_names=hashicorp-vault-k8s-pod \
    bound_service_account_namespaces=vault \
    policies=hashi-vault-k8s-policy \
    ttl=24h
```

A single role can bind multiple service accounts and namespaces if needed.

## Inject the secret into a pod

Add the service account and Vault Agent Injector annotations to your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: hashicorp-vault-k8s
  name: hashicorp-vault-k8s
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hashicorp-vault-k8s
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: 'true'
        vault.hashicorp.com/agent-inject-secret-golangsecrets: secret/golangsecrets
        vault.hashicorp.com/agent-inject-template-golangsecrets: |
          {{ with secret "secret/data/golangsecrets" -}}
            export API_KEY="{{ .Data.data.apikey }}"
            export AWS_KEY="{{ .Data.data.awskey }}"
            export WEBHOOK_SECRET="{{ .Data.data.webhooksecret }}"
          {{- end }}
        vault.hashicorp.com/role: hashi-vault-k8s-role
        vault.hashicorp.com/tls-skip-verify: 'true'
      labels:
        app: hashicorp-vault-k8s
    spec:
      serviceAccountName: hashicorp-vault-k8s-pod
      containers:
      - image: busybox
        name: hashicorp-vault-container
        command:
          ['sh', '-c']
        args:
          ['source /vault/secrets/golangsecrets']
```

:::warning
`vault.hashicorp.com/tls-skip-verify: 'true'` is only acceptable here because TLS is not configured. In production, terminate TLS properly.
:::

Apply the deployment:

```bash
kubectl apply -f deployment.yaml
```

Verify the secret by checking `/vault/secrets/` inside the pod:

```bash
kubectl exec -it <pod-name> -n vault -- ls /vault/secrets
```

If the pod fails to start, debug the injector:

```bash
kubectl logs <pod-name> -n vault -c vault-agent-init
```

## Completion criterion

The migration is complete when:

1. Vault pods are running and unsealed.
2. The Kubernetes auth method is enabled and configured.
3. A KV secret exists at a known path.
4. A policy and role restrict access to a specific service account and namespace.
5. The workload pod starts and can read secrets from `/vault/secrets/` at runtime.
6. The original manifest no longer contains hard-coded secrets.

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
