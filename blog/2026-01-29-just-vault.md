---
slug: vault-self-healing-kubernetes
title: "Self-Healing HashiCorp Vault on Kubernetes: Helmization & Auto-Restore"
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/vault-restore.webp
tags: [vault, kubernetes, gitops, devops, security, terraform]
description: Moving Vault to a GitOps flow is great, but what happens when you lose your data? Learn how to build a self-healing Vault cluster that restores itself from S3.
---

import Giscus from "@giscus/react";

If you've been following my journey with HashiCorp Vault on EKS, you've seen me talk about <a href="https://blog.saintmalik.me/automate-vault-backup-restore-on-aws-eks/" target="_blank">automating backups</a> and <a href="https://blog.saintmalik.me/tls-vault-eks/" target="_blank">setting up TLS</a>. But as things scaled, I realized that detached manual processes and terraform/tofu-managed manifests were becoming a major friction point.

<!--truncate-->

When you're running at scale, you want your infrastructure to be boring. Boring is good. Boring means if a PVC gets accidentally deleted or an EBS volume goes "poof", the system just... fixes itself.

Today, I'm sharing how I "helmized" my Vault setup and implemented a fully automated **Auto-Restore** flow.

## The Foundation: Infrastructure as Code (Terraform)

Before we talk about Helm, we need the "hard" infrastructure. This includes the EKS namespace, the KMS key for auto-unseal, and the IAM roles for Service Accounts (IRSA).

> [!NOTE]
> You MUST have **cert-manager** deployed in your cluster if you want Vault to handle TLS automatically via internal CAs. It's the standard way to handle certificate lifecycles in Kubernetes.

### 👉 Preparing the Cluster

First, we need a place for Vault to live and a safety buffer for KMS.

```hcl
resource "kubernetes_namespace" "vault" {
  metadata {
    name = "vault"
  }
}

resource "time_sleep" "kms" {
  create_duration = "60s"
}

# Allow the injector to talk to the nodes
resource "aws_security_group_rule" "allow_vault_injector" {
  type                     = "ingress"
  description              = "vault injector accept traffic"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  source_security_group_id = EKS CLUSTER PRIMARY SECURITY GROUP ID
  security_group_id        = EKS NODE SECURITY GROUP ID
}
```

### 👉 KMS Auto-Unseal

The "Auto-Restore" magic relies on Vault being able to unseal itself. We use AWS KMS for this.

```hcl
resource "aws_kms_key" "vault" {
  lifecycle {
    prevent_destroy = true
  }
  description             = "KMS key for Vault encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KeyAdministration"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "KeyUsage"
        Effect = "Allow"
        Principal = {
          AWS = module.vault_kms_irsa_role.iam_role_arn
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "vault" {
  name          = "alias/vault-chaos"
  target_key_id = aws_kms_key.vault.key_id
}
```

### 👉 IAM Roles for Service Accounts (IRSA)

We need roles for both KMS unsealing and S3 backup/restore access. We use the [official module](https://registry.terraform.io/modules/terraform-aws-modules/iam/aws/latest/submodules/iam-role-for-service-accounts-eks) from the Terraform Registry.

```hcl
module "vault_kms_irsa_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = local.module_versions.irsa

  role_name = "vault-kms-${var.env}"

  role_policy_arns = {
    kms_policy = aws_iam_policy.vault_kms_policy.arn
  }

  oidc_providers = {
    ex = {
      provider_arn               = REPLACE WITH YOUR EKS OIDC PROVIDER ARN
      namespace_service_accounts = ["vault:vault"]
    }
  }

  lifecycle {
    enabled = var.use_irsa
  }
}

resource "aws_iam_policy" "vault_kms_policy" {
  name        = "VaultKMSPolicy-chaos"
  description = "Policy for Vault to use KMS for auto-unseal"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "VaultKMSUnseal"
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*"
        ]
        Resource = aws_kms_key.vault.arn
      },
      {
        Sid    = "VaultSSMParameters"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${var.env}/iac/*"
        ]
      }
    ]
  })
}
```

> [!IMPORTANT]
> **The Vault Token**: Note that the root token generated from your very first `vault operator init` must be manually saved to AWS SSM Parameter Store at the path defined in your configuration (e.g., `/infra/iac/vaulttoken`). The configuration job will fetch this token to set up secrets engines and auth methods.

```hcl
module "vault_backup_irsa_role" {
  source    = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version   = "5.30.0"
  role_name = "hashicorp-vault-snapshot-chaos"
  role_policy_arns = {
    policy = aws_iam_policy.vault_backup_access_policy.arn
  }
  oidc_providers = {
    ex = {
      provider_arn               = REPLACE WITH YOUR EKS OIDC PROVIDER ARN
      namespace_service_accounts = ["vault:vault-snapshotter"]
    }
  }
}
```

## The "Helmization" of Vault

With the infrastructure in place, we move to **GitOps**. We use ArgoCD to deploy Vault via its official Helm chart, but with our custom "Operations" logic.

### File Structure

```text
chaos-home/
└── chaosdev/
    ├── services/
    │   └── vault.yaml          # ArgoCD Application manifest
    └── vault/
        ├── values.yaml          # Helm overrides
        └── templates/
            ├── certificate.yaml
            ├── serviceaccount.yaml
            ├── config-job.yaml  # The Auto-Restore Logic
            └── snapshot-cronjob.yaml
```

### 👉 ArgoCD Application (`services/vault.yaml`)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vault-chaos
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/saintmalik/chaos-home.git
    targetRevision: HEAD
    path: chaosdev/vault
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: vault
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### 👉 Helm Values (`vault/values.yaml`)

```yaml
# Vault Helm Values for Chaos Production
vault:
  global:
    tlsDisable: false

  injector:
    priorityClassName: "system-node-critical"
    annotations:
      karpenter.sh/do-not-disrupt: "true"
    failurePolicy: Fail
    replicas: 2
    resources:
      requests:
        memory: 96Mi
        cpu: 90m
      limits:
        memory: 156Mi
        cpu: 100m
    leaderElector:
      enabled: true
    namespaceSelector:
      matchExpressions:
        - key: kubernetes.io/metadata.name
          operator: NotIn
          values: ["vault", "kube-system", "kube-public", "kube-node-lease"]
    agentDefaults:
      cpuRequest: "10m"
      memRequest: "54Mi"
      cpuLimit: "50m"
      memLimit: "108Mi"
    metrics:
      enabled: true

  server:
    serviceAccount:
      create: true
      name: "vault"
      annotations:
        eks.amazonaws.com/role-arn: "arn:aws:iam::ACCOUNT_ID:role/vault-kms-chaos"
    annotations:
      karpenter.sh/do-not-disrupt: "true"
    resources:
      requests:
        memory: 256Mi
        cpu: 200m
      limits:
        memory: 256Mi
        cpu: 200m
    priorityClassName: "system-node-critical"
    dataStorage:
      enabled: true
      size: 2Gi
    readinessProbe:
      enabled: true
      path: "/v1/sys/health?standbyok=true&sealedcode=204&uninitcode=204"
      port: 8200
      scheme: HTTPS
      failureThreshold: 5
      initialDelaySeconds: 5
      periodSeconds: 10
      successThreshold: 1
      timeoutSeconds: 5
    livenessProbe:
      enabled: true
      path: "/v1/sys/health?standbyok=true"
      port: 8200
      scheme: HTTPS
      failureThreshold: 5
      initialDelaySeconds: 60
      periodSeconds: 10
      successThreshold: 1
      timeoutSeconds: 5
    extraEnvironmentVars:
      VAULT_CACERT: /vault/tls/ca.crt
      VAULT_TLSCERT: /vault/tls/tls.crt
      VAULT_TLSKEY: /vault/tls/tls.key
      VAULT_CLIENT_TIMEOUT: 300s
    affinity: |
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app.kubernetes.io/instance: vault
                app.kubernetes.io/name: vault
                component: server
            topologyKey: kubernetes.io/hostname
    nodeSelector:
      beta.kubernetes.io/arch: arm64
    volumes:
      - name: tls
        secret:
          secretName: vault-tls
    volumeMounts:
      - name: tls
        mountPath: "/vault/tls"
        readOnly: true
    ha:
      enabled: true
      raft:
        enabled: true
        setNodeId: true
        config: |
          ui = true
          listener "tcp" {
            tls_disable = false
            address = "[::]:8200"
            cluster_address = "[::]:8201"
            tls_cert_file      = "/vault/tls/tls.crt"
            tls_key_file       = "/vault/tls/tls.key"
          }
          storage "raft" {
            path = "/vault/data"

            retry_join {
              leader_api_addr = "https://{{ template "vault.fullname" . }}-0.{{ template "vault.fullname" . }}-internal:8200"
              leader_client_cert_file = "/vault/tls/tls.crt"
              leader_client_key_file = "/vault/tls/tls.key"
              leader_ca_cert_file = "/vault/tls/ca.crt"
            }
            retry_join {
              leader_api_addr = "https://{{ template "vault.fullname" . }}-1.{{ template "vault.fullname" . }}-internal:8200"
              leader_client_cert_file = "/vault/tls/tls.crt"
              leader_client_key_file = "/vault/tls/tls.key"
              leader_ca_cert_file = "/vault/tls/ca.crt"
            }
            retry_join {
              leader_api_addr = "https://{{ template "vault.fullname" . }}-2.{{ template "vault.fullname" . }}-internal:8200"
              leader_client_cert_file = "/vault/tls/tls.crt"
              leader_client_key_file = "/vault/tls/tls.key"
              leader_ca_cert_file = "/vault/tls/ca.crt"
            }
          }

          service_registration "kubernetes" {}

          seal "awskms" {
            region     = "us-east-1"
            kms_key_id = "chaos-kms-key-uuid"
          }

  config:
    enabled: true
    auto_restore: true
    ssm_vault_token: "/chaos/iac/vaulttoken"

    policies:
      chaos-pod-policy: |
        path "secret/data/receipt-pod" { capabilities = ["read"] }
        path "secret/data/chaos-room-pod" { capabilities = ["read"] }
    auth_methods:
      kubernetes:
        enabled: true
        mount_path: "kubernetes"
        roles:
          - name: "chaos-pod-role"
            bound_service_account_names:
              ["receipt-pod-prod", "chaos-room-pod-prod"]
            bound_service_account_namespaces: ["chaos"]
            policies: ["chaos-pod-policy"]
            ttl: "24h"
            audience: "https://kubernetes.default.svc"
          - name: "backing"
            bound_service_account_names: ["vault-snapshotter"]
            bound_service_account_namespaces: ["vault"]
            policies: ["vault-snapshot-policy"]

      github:
        enabled: false

      oidc:
        enabled: false

    secrets_engines:
      - path: "secret"
        type: "kv-v2"

  ui:
    enabled: true
    publishNotReadyAddresses: false
    activeVaultPodOnly: true
    serviceType: "ClusterIP"

  backup:
    enabled: true
    schedule: "0 0 5,27 * *"
    serviceAccountName: "vault-snapshotter"
    roleArn: "arn:aws:iam::ACCOUNT_ID:role/hashicorp-vault-snapshot-chaos"
    s3Path: "s3://chaos-bucket/vaultbackup"
```

### 👉 TLS Certificate (`templates/certificate.yaml`)

We use **cert-manager** to handle our internal Vault TLS.

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: vault-selfsigned-issuer
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: vault-tls
spec:
  secretName: vault-tls
  duration: 8760h
  isCA: true
  commonName: vault.vault.svc
  dnsNames:
    - localhost
    - "vault-0.vault-internal"
    - "vault"
    - "vault.vault.svc"
  issuerRef:
    name: vault-selfsigned-issuer
    kind: Issuer
```

### 👉 Backup Service Account (`templates/serviceaccount.yaml`)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: { { .Values.vault.backup.serviceAccountName } }
  namespace: { { .Release.Namespace } }
  annotations:
    eks.amazonaws.com/role-arn: { { .Values.vault.backup.roleArn } }
```

### 👉 Snapshot CronJob (`templates/snapshot-cronjob.yaml`)

```yaml
{{- if .Values.vault.backup.enabled }}
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vault-snapshot-cronjob
spec:
  schedule: {{ .Values.vault.backup.schedule | quote }}
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: {{ .Values.vault.backup.serviceAccountName }}
          restartPolicy: OnFailure
          containers:
            - name: snapshot
              image: hashicorp/vault:1.20.4
              command: ["/bin/sh", "-c"]
              args:
                - >
                  export VAULT_TOKEN=$(vault write -field=token auth/kubernetes/login jwt=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token) role=backing);
                  vault operator raft snapshot save /share/vault-raft.snap;
            - name: upload
              image: amazon/aws-cli:2.27.33
              command: ["/bin/sh", "-c"]
              args:
                - "aws s3 cp /share/vault-raft.snap {{ .Values.vault.backup.s3Path }}/vault_$(date +%F).snap"
{{- end }}
```

## The Solution: Auto-Restore (Self-Healing)

The goal was simple: **If Vault starts and finds no data, it should automatically find the latest snapshot in S3 and restore itself.**

We baked this logic into a Post-Install/Post-Upgrade hook Job. This is the **brain** of the operation.

### 👉 The Config & Restore Job (`templates/config-job.yaml`)

```yaml
{{- if .Values.vault.config.enabled -}}
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-config
  namespace: {{ .Release.Namespace }}
  annotations:
    "helm.sh/hook": post-install,post-upgrade
    "helm.sh/hook-weight": "10"
    "helm.sh/hook-delete-policy": before-hook-creation
spec:
  template:
    spec:
      serviceAccountName: {{ .Values.vault.server.serviceAccount.name | default "vault" }}
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      initContainers:
        - name: fetch-secrets
          image: "amazon/aws-cli:{{ .Values.vault.config.aws_cli_version | default "2.27.33" }}"
          env:
            - name: HOME
              value: /tmp
          command:
            - /bin/sh
            - -c
            - |
              set -e
              {{- if and (not .Values.vault.config.root_token) .Values.vault.config.ssm_vault_token }}
              echo "Fetching Vault Token from SSM ({{ .Values.vault.config.ssm_vault_token }})..."
              aws ssm get-parameter --name {{ .Values.vault.config.ssm_vault_token | quote }} --with-decryption --query Parameter.Value --output text > /env/vault_token
              {{- end }}

              {{- if .Values.vault.config.auth_methods.oidc.enabled }}
              echo "Fetching OIDC Client ID from SSM..."
              aws ssm get-parameter --name {{ .Values.vault.config.auth_methods.oidc.ssm_client_id | quote }} --query Parameter.Value --output text > /env/oidc_client_id

              echo "Fetching OIDC Client Secret from SSM..."
              aws ssm get-parameter --name {{ .Values.vault.config.auth_methods.oidc.ssm_client_secret | quote }} --with-decryption --query Parameter.Value --output text > /env/oidc_client_secret
              {{- end }}

              {{- if .Values.vault.config.auto_restore }}
              echo "Auto-Restore enabled. Checking for latest snapshot in S3..."
              LATEST_SNAP=$(aws s3 ls {{ .Values.vault.backup.s3Path }}/ | grep "\.snap$" | sort | tail -n 1 | awk '{print $4}')
              if [ -n "$LATEST_SNAP" ]; then
                echo "Downloading $LATEST_SNAP to /env/vault.snap..."
                aws s3 cp {{ .Values.vault.backup.s3Path }}/$LATEST_SNAP /env/vault.snap
              fi
              {{- end }}
          volumeMounts:
            - name: env
              mountPath: /env
      containers:
        - name: config
          image: "hashicorp/vault:{{ .Values.vault.config.vault_cli_version | default "1.19.5" }}"
          env:
            - name: VAULT_ADDR
              value: "https://{{ .Release.Name }}-0.{{ .Release.Name }}-internal:8200"
            {{- if .Values.vault.config.root_token }}
            - name: VAULT_TOKEN
              value: {{ .Values.vault.config.root_token | quote }}
            {{- end }}
            - name: VAULT_CACERT
              value: /vault/tls/ca.crt
          volumeMounts:
            - name: tls
              mountPath: /vault/tls
              readOnly: true
            - name: env
              mountPath: /env
              readOnly: true
          command:
            - /bin/sh
            - -c
            - |
              if [ -z "$VAULT_TOKEN" ] && [ -f /env/vault_token ]; then
                export VAULT_TOKEN=$(cat /env/vault_token)
              fi

              echo "Waiting for Vault..."
              until vault status -tls-skip-verify > /dev/null 2>&1 || [ $? -eq 2 ]; do sleep 5; done

              # AUTO-RESTORE LOGIC
              if vault status -tls-skip-verify 2>&1 | grep -q "Initialized.*false" && [ -f /env/vault.snap ]; then
                echo "Vault uninitialized. Restoring from S3..."
                INIT_OUT=$(vault operator init -key-shares=1 -key-threshold=1 -format=json)
                TEMP_TOKEN=$(echo $INIT_OUT | sed -n 's/.*"root_token":"\([^"]*\)".*/\1/p')
                VAULT_TOKEN=$TEMP_TOKEN vault operator raft snapshot restore /env/vault.snap
                sleep 10
              fi

              echo "--- Applying Secrets Engines ---"
              {{- range .Values.vault.config.secrets_engines }}
              if ! vault secrets list | grep -q '^{{ .path }}/'; then
                vault secrets enable -path={{ .path }} {{ .type }}
              fi
              {{- end }}

              echo "--- Applying Policies ---"
              {{- range $name, $policy := .Values.vault.config.policies }}
              cat <<EOF | vault policy write {{ $name }} -
{{ $policy | indent 14 }}
              EOF
              {{- end }}

              echo "--- Configuring Kubernetes Auth ---"
              {{- if .Values.vault.config.auth_methods.kubernetes.enabled }}
              if ! vault auth list | grep -q '^kubernetes/'; then
                vault auth enable kubernetes
              fi

              K_ISSUER=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token | cut -d. -f2 | base64 -d 2>/dev/null | sed 's/.*"iss":"\([^"]*\)".*/\1/')

              vault write auth/{{ .Values.vault.config.auth_methods.kubernetes.mount_path }}/config \
                kubernetes_host="https://kubernetes.default.svc" \
                kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
                issuer="$K_ISSUER"

              {{- range .Values.vault.config.auth_methods.kubernetes.roles }}
              vault write auth/{{ $.Values.vault.config.auth_methods.kubernetes.mount_path }}/role/{{ .name }} \
                bound_service_account_names={{ .bound_service_account_names | join "," | quote }} \
                bound_service_account_namespaces={{ .bound_service_account_namespaces | join "," | quote }} \
                policies={{ .policies | join "," | quote }} \
                ttl={{ .ttl | quote }}
              {{- end }}
              {{- end }}

              echo "--- Configuring GitHub Auth ---"
              {{- if .Values.vault.config.auth_methods.github.enabled }}
              if ! vault auth list | grep -q '^github/'; then
                vault auth enable -path={{ .Values.vault.config.auth_methods.github.mount_path }} github
              fi
              vault write auth/{{ .Values.vault.config.auth_methods.github.mount_path }}/config \
                organization={{ .Values.vault.config.auth_methods.github.organization | quote }}
              {{- end }}

              echo "--- Configuring OIDC Auth ---"
              {{- if .Values.vault.config.auth_methods.oidc.enabled }}
              if ! vault auth list | grep -q '^oidc/'; then
                vault auth enable -path={{ .Values.vault.config.auth_methods.oidc.mount_path }} oidc
              fi

              OIDC_CLIENT_ID=$(cat /env/oidc_client_id)
              OIDC_CLIENT_SECRET=$(cat /env/oidc_client_secret)

              vault write auth/{{ .Values.vault.config.auth_methods.oidc.mount_path }}/config \
                oidc_discovery_url={{ .Values.vault.config.auth_methods.oidc.discovery_url | quote }} \
                oidc_client_id="$OIDC_CLIENT_ID" \
                oidc_client_secret="$OIDC_CLIENT_SECRET" \
                default_role={{ .Values.vault.config.auth_methods.oidc.default_role | quote }} \
                allowed_redirect_uris={{ .Values.vault.config.auth_methods.oidc.allowed_redirect_uris | join "," | quote }}

              {{- range .Values.vault.config.auth_methods.oidc.roles }}
              cat <<EOF | vault write auth/{{ $.Values.vault.config.auth_methods.oidc.mount_path }}/role/{{ .name }} -
              {
                "user_claim": "email",
                "role_type": "oidc",
                "bound_audiences": ["$OIDC_CLIENT_ID"],
                "allowed_redirect_uris": {{ $.Values.vault.config.auth_methods.oidc.allowed_redirect_uris | toJson }},
                "token_policies": {{ .policies | toJson }}
              }
              EOF
              {{- end }}
              {{- end }}

              echo "Vault configuration complete!"
      volumes:
        - name: tls
          secret:
            secretName: vault-tls
        - name: env
          emptyDir: {}
      restartPolicy: OnFailure
{{- end }}
```

## Why This Matters

This approach turns a major disaster recovery event into a minor deployment blip.

- **Zero Manual Intervention**: You don't need to find the snapshot, download it, or run manual CLI commands.
- **Infrastructure as Code**: The entire recovery logic is version-controlled in your operations repo.
- **Speed**: Restoration happens as fast as the network can pull the snapshot from S3.

Till next time, Peace be on you 🤞🏽

#### References

- [HashiCorp Vault Raft Snapshots](https://developer.hashicorp.com/vault/docs/concepts/storage/raft#snapshots)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)

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
````
