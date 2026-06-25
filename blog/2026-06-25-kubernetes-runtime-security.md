---
slug: kubernetes-runtime-security
title: "Kubernetes Runtime Security: The Silence That Should Keep You Up at Night"
authors: Abdulmalik
image: /bgimg/runtime-security.webp
tags: [kubernetes, devsecops, falco, runtime-security, appsec, ebpf, security]
description: Two real assessments where attackers moved inside Kubernetes with zero alerts. A practical Falco setup with modern eBPF, custom rules, Falcosidekick, Talon, and EKS audit detection.
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

On an engagement I worked alongside [Olakojo](https://x.com/Secfortress) testing a product. Between Ola is one of the best offensive security engineers in this space, and watching him work is a lesson in patience: he does not spray exploits and hope. He reads the app, finds the innocent looking path, and walks in through the front door everyone believed was secure.

<!--truncate-->

He got a shell. A real RCE. From there he was moving inside the server, making syscalls, probing paths toward root and full compromise. And the organization had **no idea**. No alert. No detection. No correlated log that said "someone just spawned an interactive shell in a container that never runs shells." Just silence, until the issue was flagged with the concerned teams for containment and remediation.

That silence is the oversight runtime security exists to fix. Not a logo on a slide. The **depth of visibility** most teams skip because the cluster passed a CIS benchmark and the pipeline runs Trivy.

## The Second Time It Happened

On a separate backend assessment we found **SSRF in the one service**, not a generic file upload. When you save or contribute a book, you pass a `thumbnail` URL. A background worker (`ThumbnailQueue`) fetches it with `axios.get()` after a weak allowlist check: `startsWith('https://images-na.ssl-images-amazon.com')`. Prefix the URL with that string, add `@`, and point the rest at your host. The server still fetches your URL.

We **confirmed** the SSRF first: submit a thumbnail like `https://images-na.ssl-images-amazon.com@attacker.example/...`, wait for the worker, and the stored thumbnail changes to whatever the backend retrieved. That is server-side fetch, proven.

From there we ran a **blind internal scan**. Chained redirects through an external tunnel let the worker follow into `kubernetes.default.svc`, internal microservices (`*.platformservice.svc.cluster.local`), Vault, NATS, and the AWS metadata endpoint. We did not get clean response bodies back. We inferred reachability from worker log patterns ("Corrupt Header" vs "Connection Refused"). Not a cluster takeover. Not a confirmed Secret exfiltration. But outbound probes from a pod that should only talk to Amazon image hosts, and **nobody on the team knew anything was happening**.

Preventive controls did not fail loudly. The story was active abuse inside the boundary with **zero runtime signal**.

Runtime security answers: *something is happening right now in a running workload that should not be happening.* Shell spawned. `/etc/shadow` read. IMDS contacted. Secret deleted via the API. `apt-get` inside a container built to only serve HTTP.

If that does not fire an alert in seconds and land in a channel someone watches, you are running production on hope.

## Why eBPF, and Why Not a Kernel Module

[Falco](https://falco.org/) evaluates **Linux syscalls and kernel events** against YAML rules. The sensor has to attach to the kernel somehow. Historically that meant a **kernel module** (`falco-probe`). That breaks on managed Kubernetes: you do not control node AMIs, kernel upgrades swap versions, and loading custom modules on EKS/GKE nodes is a non-starter for most platform teams.

**eBPF** is the modern path. Programs load into the kernel verifier, hook tracepoints/syscalls, and stream events to userspace without a `.ko` module tied to a specific kernel build. Falco's **`modern_ebpf`** driver uses libbpf-based probes. Disable the legacy loader:

```yaml
driver:
  enabled: true
  kind: modern_ebpf
  loader:
    enabled: false
  modernEbpf:
    leastPrivileged: true
```

What `leastPrivileged: true` actually buys you: the Falco pod does not need full `CAP_SYS_ADMIN` on every node. It requests a reduced capability set compatible with the modern driver. On a shared EKS node pool, that matters for security review and for not fighting Pod Security Standards.

**What eBPF sees in practice** (the events worth writing rules for):

| Falco condition | Kernel reality | Attacker behavior it catches |
|---|---|---|
| `spawned_process` | `execve` family | Shell dropped after RCE, reverse shell binary |
| `open_read` / `open_write` | file access syscalls | `/etc/shadow`, SSH keys, writes under `/etc` |
| `outbound` | socket connect | IMDS at `169.254.169.254`, mining pool ports, C2 |
| `proc.tty != 0` | controlling terminal attached | Interactive shell, not a headless healthcheck script |

That is exactly the syscall trail Ola left. No EDR on the node, no Falco: the kernel saw it all and nobody was listening.

Enable **collectors** (container metadata enrichment) and **JSON output** so alerts carry `k8s.ns.name`, `k8s.pod.name`, `container.image`, and `proc.cmdline` for triage without guessing:

```yaml
falco:
  log_level: info
  json_include_output_property: true
  json_include_output_fields_property: true

collectors:
  enabled: true

metrics:
  enabled: true
  service:
    enabled: true
```

Watch `falco_kernel_drops_total` in Prometheus. If the kernel ring buffer drops events under load, you are blind during the burst an attacker wants. That metric is how you know the sensor is starving, not healthy.

## Architecture: Two Helm Releases

On EKS, a useful runtime layer is usually **two Falco Helm releases** plus shared alert plumbing: a **DaemonSet** for syscalls on every node, and a **Deployment** for Kubernetes audit events the syscall sensor cannot see. GitOps (ArgoCD, Flux, whatever you use) keeps rules in ConfigMaps and syncs changes without hand-editing pods.

### Release 1: syscall Falco (DaemonSet, every node)

One Falco pod per node. Tolerations on `NoSchedule` and `NoExecute` so agents run on tainted worker pools, not only the default pool:

```yaml
tolerations:
  - effect: NoSchedule
    operator: Exists
  - effect: NoExecute
    operator: Exists

resources:
  requests:
    cpu: 50m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

Custom rules mount from a ConfigMap into `/etc/falco/rules.d` (GitOps-friendly: change rules in Git, Argo syncs, rolling restart):

```yaml
mounts:
  volumes:
    - name: custom-rules
      configMap:
        name: falco-custom-rules
  volumeMounts:
    - name: custom-rules
      mountPath: /etc/falco/rules.d
```

### Release 2: Kubernetes audit Falco (Deployment, one replica)

Syscall Falco cannot see **`kubectl exec`** or **Secret deletes** as syscalls inside your app container. Those are **Kubernetes API events**. Second release, no driver, `k8saudit-eks` plugin pulling from **CloudWatch**:

```yaml
fullnameOverride: falco-audit

driver:
  enabled: false

controller:
  kind: deployment
  deployment:
    replicas: 1

serviceAccount:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/falco-audit-eks

falco:
  plugins:
    - name: k8saudit-eks
      init_config:
        region: us-west-2
        polling_interval: 10
        buffer_size: 500
      open_params: your-cluster-name   # EKS cluster name → CloudWatch log group
  load_plugins: [k8saudit-eks, json]
  http_output:
    enabled: true
    url: http://falco-falcosidekick:2801

falcosidekick:
  enabled: false   # reuse Release 1's Sidekick
```

Prerequisites on the AWS side (Terraform, not Helm):

1. EKS control plane **`enabled_log_types` includes `"audit"`**
2. IRSA role with `logs:FilterLogEvents` on `/aws/eks/your-cluster-name/cluster`
3. `falcoctl` installing plugin artifacts: `k8saudit-eks:0.16`, `k8saudit-rules:0.16`

One Falcosidekick, one Slack relay, two sensors feeding it.

```
  worker nodes                         falco namespace
 ┌─────────────────┐                  ┌──────────────────────────┐
 │ app pods        │── syscalls ──►   │ Falco DaemonSet (eBPF)   │
 │ (app-services)  │                  │         │                │
 └─────────────────┘                  │         ▼                │
                                      │   Falcosidekick :2801    │
 CloudWatch ◄── EKS audit API         │    │            │       │
      │                               │    │ ERROR+     │ CRIT  │
      └── poll ──► falco-audit (x1) ──┘    ▼            ▼       │
                                      Slack relay    Falco Talon  │
                                           │              │       │
                                           ▼              ▼       │
                                        #sec-alerts   terminate   │
                                                     / label pod  │
                                      └──────────────────────────┘
```

## Writing Rules That Survive Contact With Production

Default Falco rules are a textbook. Production needs **macros that encode what normal looks like in your stack**, then rules that only fire outside that envelope.

### Step 1: Scope namespaces

Only alert on application namespaces. Platform noise (`kube-system`, `vault`, `argocd`, the Falco namespace itself) should be excluded at the macro layer:

```yaml
- macro: app_workload_ns
  condition: k8s.ns.name in (app-services, core-services)

- macro: platform_ns
  condition: >
    k8s.ns.name in (kube-system, falco, vault, argocd, cert-manager,
    kube-public, kube-node-lease)
```

### Step 2: Allowlist benign shell activity

Without this you will drown in alerts. Vault agent injects secrets via shell wrappers. Readiness probes run `sh -ec`. Enumerate what is normal in your stack first:

```yaml
- macro: benign_shell
  condition: >
    (container.name = "vault-agent")
    or (proc.cmdline contains "source /vault/secrets")
    or (proc.cmdline contains "vault agent")
    or (proc.cmdline icontains "/health/ping")
    or (proc.cmdline startswith "sh -c source")
    or (proc.cmdline startswith "sh -ec echo")
    or (proc.cmdline startswith "bash -ec /health/")
```

This took a week of tuning against normal cluster noise. You cannot skip it.

### Step 3: Three tiers mapped to response

| Tier | Priority | Example rule | Slack | Talon |
|---|---|---|---|---|
| Observe | WARNING | Interactive TTY shell | No | Label pod `falco.runtime/suspicious` |
| Investigate | ERROR | Write below `/etc`, package manager in running container | Yes | None |
| Contain | CRITICAL | `/etc/shadow` read, IMDS, mining ports, outbound from shell | Yes | Terminate pod (30s grace) |

**WARNING: interactive shell** (the rule Ola would have triggered):

```yaml
- macro: shell_proc
  condition: proc.name in (bash, sh, zsh, ash, dash, fish)

- rule: Runtime interactive shell
  desc: Interactive TTY shell in an application container
  condition: >
    spawned_process and container and shell_proc
    and proc.tty != 0
    and app_workload_ns
    and not benign_shell
    and not container.image contains "falco"
  output: >
    Interactive shell (ns=%k8s.ns.name pod=%k8s.pod.name
    container=%container.name cmd=%proc.cmdline user=%user.name
    image=%container.image)
  priority: WARNING
  tags: [runtime, shell, mitre_execution]
```

`proc.tty != 0` is the difference between a human shell and a CI script. That one field cuts false positives significantly.

**ERROR: post-exploitation drift**:

```yaml
- rule: Runtime write below etc
  condition: >
    open_write and container and evt.is_open_write=true
    and fd.name startswith /etc/
    and not proc.name in (dpkg, apt, yum, rpm, apk, apk-tools)
    and app_workload_ns
  priority: ERROR

- rule: Runtime package manager in running container
  condition: >
    spawned_process and container and app_workload_ns
    and proc.name in (apt, apt-get, yum, dnf, apk, pip, npm)
    and not container.image contains "build"
  priority: ERROR
```

**CRITICAL: credential theft and exfil** (Talon auto-kill list):

```yaml
- rule: Runtime sensitive file read
  condition: >
    open_read and container
    and fd.name in (/etc/shadow, /etc/master.passwd, /etc/sudoers)
    and app_workload_ns
  priority: CRITICAL

- rule: Runtime IMDS access
  condition: >
    outbound and container
    and fd.sip="169.254.169.254"
    and app_workload_ns
  priority: CRITICAL

- rule: Runtime suspicious outbound shell
  condition: >
    outbound and container and shell_proc
    and proc.tty != 0 and app_workload_ns and not benign_shell
  priority: CRITICAL
```

### Step 4: Kubernetes audit rules (SSRF / API abuse layer)

```yaml
- rule: Runtime K8s exec into pod
  condition: >
    kevent and ka.verb=create and ka.target.resource=pods/exec
    and not platform_ns
  output: >
    Exec into pod (user=%ka.user.name ns=%ka.target.namespace
    pod=%ka.target.name src=%ka.sourceIPs)
  priority: WARNING

- rule: Runtime K8s secret deleted
  condition: kevent and ka.verb=delete and ka.target.resource=secrets
  priority: ERROR

- rule: Runtime K8s privileged pod created
  condition: >
    kevent and ka.verb=create and ka.target.resource=pods
    and ka.req.pod.spec.containers[].securityContext.privileged=true
  priority: CRITICAL
```

The thumbnail-worker SSRF from the second assessment would have fired syscall rules first: **outbound connects to `169.254.169.254` or internal `.svc` hostnames** from a container that should only fetch external image URLs. Audit rules for **`pods/exec` and Secret deletes** only help if the pivot reaches an authenticated Kubernetes API call. Syscall-only Falco misses API abuse entirely.

## Alert Routing: Falcosidekick, Slack Relay, Falco Talon

### Falcosidekick

Sidekick fan-out with **priority gates** so WARNING does not page Slack:

```yaml
falcosidekick:
  enabled: true
  config:
    customfields: "cluster:your-cluster-name"
    slack:
      webhookurl: http://falco-slack-relay:8080
      minimumpriority: error
      outputformat: fields
    talon:
      address: http://falco-talon:2803
      minimumpriority: critical
```

### Slack relay (webhook format → bot token)

Falcosidekick and Talon speak **Slack incoming webhook JSON**. Post to a channel via **`chat.postMessage`** with a bot token. A small Python HTTP server in-cluster accepts webhook POSTs, converts attachment fields to text, forwards to Slack API. Keep tokens in Vault, not Git.

Why bother: incoming webhooks are per-channel and awkward to manage at enterprise Slack scale. Bot tokens plus channel IDs are how the rest of your ops stack already works.

### Falco Talon (automated containment)

Talon matches **specific rule names**, not generic CRITICAL from upstream defaults:

```yaml
falco-talon:
  config:
    defaultNotifiers:
      - k8sevents
    deduplication:
      leaderElection: true
      timeWindowSeconds: 10
    rulesOverride: |
      - action: Terminate Pod
        actionner: kubernetes:terminate
        parameters:
          ignore_daemonsets: true
          ignore_statefulsets: true
          grace_period_seconds: 30

      - action: Label Suspicious
        actionner: kubernetes:label
        parameters:
          labels:
            falco.runtime/suspicious: "true"

      - rule: Critical auto-terminate
        match:
          rules:
            - Runtime sensitive file read
            - Runtime IMDS access
            - Runtime suspicious outbound shell
            - Runtime mining pool port
            - Runtime persistence write
          output_fields:
            - k8s.ns.name=app-services
        actions:
          - action: Terminate Pod

      - rule: Interactive shell label
        match:
          rules:
            - Runtime interactive shell
        actions:
          - action: Label Suspicious
```

CRITICAL fires → Sidekick notifies Slack **and** Talon kills the pod in 30 seconds. WARNING shell → label only, no Slack, no kill. That is intentional: during an incident your engineers run `kubectl exec` and you do not want Talon terminating the pod they are debugging, but you **do** want a label for the audit trail.

## What an Alert Actually Looks Like

With `json_output` enabled, a CRITICAL IMDS attempt looks like this in `kubectl logs`:

```json
{
  "output": "12:04:05.123456789: Critical Outbound connection to AWS instance metadata ...",
  "priority": "Critical",
  "rule": "Runtime IMDS access",
  "time": "2026-06-24T12:04:05.123456789Z",
  "output_fields": {
    "container.name": "api",
    "container.id": "a1b2c3d4",
    "k8s.ns.name": "app-services",
    "k8s.pod.name": "api-7f8c9d-xk2lm",
    "container.image": "registry.example/myorg/api:2.4.1",
    "proc.name": "curl",
    "proc.cmdline": "curl http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    "fd.name": "169.254.169.254:80",
    "user.name": "root"
  }
}
```

That is what lands in Slack after Sidekick and the relay. No ambiguity about which pod, which image tag, which command line. That is the difference between a usable alert and "something happened on a node."

## Hands-On Verification Checklist

After deploy, do not trust the Helm release status. Prove detection end-to-end.

**1. Sensor health**

```bash
kubectl get pods -n falco -l app.kubernetes.io/name=falco
kubectl logs -n falco -l app.kubernetes.io/name=falco --tail=20 | grep -i ebpf
# Expect: modern eBPF probe loaded

kubectl port-forward -n falco svc/falco-metrics 8765:8765 &
curl -s localhost:8765/metrics | grep falco_kernel_drops_total
```

**2. Syscall detection (in a throwaway pod in `app-services`)**

```bash
kubectl run falco-test -n app-services --rm -it --restart=Never \
  --image=ubuntu:22.04 -- bash

# Inside the pod:
cat /etc/shadow          # → CRITICAL: Runtime sensitive file read → Slack + Talon kill
curl http://169.254.169.254/latest/meta-data/  # → CRITICAL: Runtime IMDS
bash -i                  # → WARNING: Runtime interactive shell → label only
```

**3. Audit detection**

```bash
kubectl exec -n app-services deploy/api -- ls   # → WARNING: Runtime K8s exec rule
kubectl logs -n falco falco-audit-0 --tail=10          # confirm plugin polling CloudWatch
```

**4. Slack path**

Confirm message in `#security-alerts` with namespace, pod, image, cmdline. If Sidekick logs show POST 200 to the relay but Slack is silent, the bug is in the relay token or channel ID, not Falco.

**5. Talon**

After CRITICAL test, pod should enter Terminating within 30 seconds. Check for Kubernetes Event from Talon notifier. WARNING shell test: pod should gain label `falco.runtime/suspicious=true`, pod stays running.

Keep a test matrix in Git next to the rules so the next engineer does not guess what to trigger.

## What Should Have Fired

| Scenario | Layer | Rule |
|---|---|---|
| Shell after RCE (Ola) | eBPF syscall | `Runtime interactive shell` (WARNING) |
| Reads `/etc/shadow`, probes IMDS | eBPF syscall | CRITICAL rules → Slack + Talon terminate |
| Package manager inside running container | eBPF syscall | `Runtime package manager in running container` (ERROR) |
| SSRF worker probes internal hosts / IMDS | eBPF syscall | `Runtime IMDS access`, outbound rules |
| SSRF pivot reaches K8s API | Audit plugin | `Runtime K8s exec`, Secret access rules |

Most teams I assess still do not have this wired. Preventive controls look fine on paper. **Build-time security and runtime detection are different programs.** You need both.

## Conclusion

If a threat actor can drop a shell, read sensitive files, and probe internal endpoints from inside your cluster, and the only signal is a manual report after the fact, you do not lack tools. You lack **coverage**.

Falco with `modern_ebpf`, scoped macros, Falcosidekick priority routing, Talon containment, and a CloudWatch-backed audit plugin is the stack that closes the gap. The Helm install is an afternoon. The macro tuning, benign allowlists, and proving alerts reach Slack are the work that actually makes runtime detection worth running.

Till next time, Peace be on you 🤞🏽

#### References

- [Falco project](https://falco.org/)
- [Falco eBPF driver docs](https://falco.org/docs/concepts/event-sources/ebpf/)
- [Falco Helm charts](https://github.com/falcosecurity/charts)
- [Falco Talon](https://github.com/falcosecurity/falco-talon)
- [Falcosidekick](https://github.com/falcosecurity/falcosidekick)
- [k8saudit-eks plugin](https://github.com/falcosecurity/plugins/tree/main/plugins/k8saudit-eks)

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
/>
