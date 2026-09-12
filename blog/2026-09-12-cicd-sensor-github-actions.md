---
slug: cicd-sensor-github-actions
title: "Think EDR, but for CI/CD: cicd-sensor on GitHub Actions"
authors: Abdulmalik
date: 2026-09-12
image: /bgimg/cicd-sensor-github-actions-cover.webp
tags: [devsecops, github-actions, supply-chain, runtime-security, cicd, ebpf, security, arc]
description: "Artifact signing and pinned SHAs do not tell you what the job did. cicd-sensor is open-source runtime security for CI — EDR-shaped coverage for GitHub Actions and GitLab. This guide walks the three GitHub Actions runner shapes."
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Figure from '../src/components/Figure';
import Giscus from "@giscus/react";

Ask an engineering or infrastructure team what is happening inside their CI/CD pipeline at runtime. The answer is usually a blank stare. Artifact signing, SBOMs, and pinned Actions SHAs matured. Runtime insight into the job itself lagged behind.

<!--truncate-->

I have cared about CI/CD runtime security for a long time. The first tool that looked like a real answer was [Harden-Runner](https://github.com/step-security/harden-runner) from StepSecurity: EDR-shaped coverage for GitHub Actions. Solid product. Free for public repos; private and fleet features sit behind paid tiers. Fair for a company shipping that depth.

Then I looked for open source alternatives. Most were littered: unmaintained, half-finished, or awkward enough that you had to glue two workflows together just to get a signal. I told myself that when I had time I would build or contribute to something better.

Around June I found [falco-actions](https://github.com/falcosecurity/falco-actions) for runtime detection in CI. I joined the public Falco Slack and floated an enforcement idea: when an outbound-connection rule fires after secret access, do not only alert — drop the destination before exfil finishes (companion script / iptables DROP, or something better on the modern_ebpf path).

<Figure>
<picture>
  <source type="image/webp" srcSet={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/falco-actions-enforcement-slack.webp`} />
  <source type="image/png" srcSet={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/falco-actions-enforcement-slack.png`} />
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/falco-actions-enforcement-slack.png`} alt="Public Falco Slack thread: Saintmalik proposing falco-actions enforcement mode; leogr replies that Falco drivers are detection-only and falco-actions is lightly maintained" />
</picture>
<p>Public Falco Slack thread: proposing enforcement for falco-actions. Drivers stay detect-only; the Actions project needed maintainers more than a block path.</p>
</Figure>

That matched what I already sensed. Falco’s probes are detection-shaped. Stop-the-exfil in CI was not the ready story there yet.

Recently I dug again and found someone with the same itch already shipping: [cicd-sensor](https://github.com/cicd-sensor/cicd-sensor), started by [Hiroki Suezawa](https://github.com/rung) around May 2026. Open source eBPF runtime security for GitHub Actions and GitLab CI, including self-hosted and ARC-style fleets. Detect, respond, and audit the pipeline job itself.

I started contributing: first PR open, and several issues filed (OIDC for Manager auth, Azure outputs, ARC Kubernetes-mode hook template overwrite, AKS node matrix).

cicd-sensor covers **GitHub Actions and GitLab CI**. GitLab Runner Docker executor is a supported target; GitLab Kubernetes executor is in preview (same docs tree as ARC). This post is GitHub Actions only — the three runner shapes below. For GitLab, start from the [user guide overview](https://github.com/cicd-sensor/cicd-sensor/blob/main/docs/user-guide/overview.md).

| This post covers | Notes |
|------------------|--------|
| GitHub-hosted | Action drop-in; standalone artifacts |
| Self-hosted on a machine | Agent + Docker proxy + Manager + job hooks |
| ARC on Kubernetes | DaemonSet + hooks; preview in upstream docs |

The project is still pre-release and moving fast. Pin SHAs. Treat Manager and ARC paths as ops work, not a one-line Action drop-in.

If you already read [Runtime Trace attestation](/runtime-trace-process-attestation/), this is the broader sensor story. That post is process attestation as a gate. This one is how you get continuous visibility (and optional terminate) on the runner fleet.

## What cicd-sensor actually is

cicd-sensor is an eBPF agent aimed at CI runners, not at long-lived production nodes as a general EDR. It observes process, network, and related job activity, applies [baseline rules](https://github.com/cicd-sensor/cicd-sensor/blob/main/docs/user-guide/baseline-rules.md) by default, and can emit:

- HTML job reports and Runtime Trace attestation predicates (especially useful on GitHub-hosted)
- Summary / Detection / Runtime Event Logs (when a [Manager](https://github.com/cicd-sensor/cicd-sensor/blob/main/docs/user-guide/manager.md) is in the path)
- Rule actions such as `detect` or `terminate` (start with detect / `monitor_mode`)

Kernel bar (from upstream docs):

- **amd64**: Linux 5.15+, with BTF at `/sys/kernel/btf/vmlinux`
- **arm64**: Linux 6.1+ (fentry/trampoline landed later on arm64)
- cgroup v2 where the machine / node setup expects it

`ubuntu-slim` and similar “container on a shared VM” hosted labels are not supported: there is no host eBPF environment for the agent.

Two usage models matter:

1. **GitHub-hosted standalone** — add `cicd-sensor-action` to the job. Local `.cicd-sensor/` config optional. Artifacts out of the job. Manager optional for fleet logs.
2. **Machine / Kubernetes + Manager** — Agent (and Docker proxy or DaemonSet) on the host/node. Config, rules, and log shipping go through Manager. Required for self-hosted machine and ARC.

## Path 1: GitHub-hosted runners

This is the shortest path. Official guide: [GitHub-hosted runner](https://github.com/cicd-sensor/cicd-sensor/blob/main/docs/user-guide/github-hosted.md).

Pin the action (example from current docs — check the latest release tag before you copy):

```yaml
jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - uses: cicd-sensor/cicd-sensor-action@6511eb44c91d71b2b93d71193b1bf2cb18352f66 # v0.0.38
      - uses: actions/checkout@...
      # rest of the job
```

Put the action first so it covers the whole job. It is fine before `actions/checkout`.

Supported labels include `ubuntu-latest`, `ubuntu-24.04`, `ubuntu-22.04`, and the arm variants. Third-party hosts (Blacksmith, BuildJet, etc.) need a BTF check; Blacksmith x86_64 is called out as supported from `v0.0.38`, ARM64 Blacksmith without BTF is not.

### Standalone: what you get

Without Manager, the agent runs inside the job and uploads an HTML report (and by default a Runtime Trace attestation predicate) as artifacts. Signing that attestation is a separate step (`actions/attest` or Cosign) if you want a signed predicate on the subject.

Project-local tuning lives under:

```text
repo/
  .cicd-sensor/
    config.yaml
    rules/
      example.yaml
```

Example `config.yaml` for a careful first rollout:

```yaml
default_max_alerts_per_rule: 20
disable_baseline_rules: false
monitor_mode: true   # treat terminate rules as detect
```

Custom rule sketch:

```yaml
rule_sets:
  - ruleset_id: acme/github-hosted
    rules:
      - rule_id: curl_exec
        rule_name: "curl executed"
        event_type: process_exec
        condition: process.exec_path.endsWith("/curl")
        action: detect
```

Validate rules before you rely on them:

```sh
cicd-sensorctl rule validate .cicd-sensor/rules
```

Baseline rules still apply even when you have no local rule files. Keep them on unless you have a reason to opt out.

### Optional: Manager from hosted jobs

When you set `manager-url` and `manager-token`, logs can leave the job into cloud outputs / SIEM. Important behavior: **repository-local `.cicd-sensor/` is not used** once Manager is configured. Config and rules come from the manager only. Store the token as a GitHub Actions secret.

```yaml
- uses: cicd-sensor/cicd-sensor-action@6511eb44c91d71b2b93d71193b1bf2cb18352f66 # v0.0.38
  with:
    manager-url: https://cicd-sensor-manager.example.com
    manager-token: ${{ secrets.CICD_SENSOR_MANAGER_TOKEN }}
```

## Path 2: Self-hosted runner on a machine

On a long-lived (or ephemeral) machine runner, a one-shot Action is not enough. You install the Agent and Docker proxy on the host, point them at Manager, then wire GitHub job hooks so each Actions job gets a start/end lifecycle.

Follow in order:

1. [Machine runner install](https://github.com/cicd-sensor/cicd-sensor/blob/main/docs/user-guide/self-hosted-install.md)
2. [GitHub Actions machine runner](https://github.com/cicd-sensor/cicd-sensor/blob/main/docs/user-guide/github-self-hosted.md)
3. [Manager](https://github.com/cicd-sensor/cicd-sensor/blob/main/docs/user-guide/manager.md)

Running only a long-lived Agent without Manager is **not** a supported target for this path.

### Host install (short version)

Prereqs: supported kernel + BTF, cgroup v2, systemd, dockerd. Outbound HTTPS to your Manager URL.

Unpack a [release](https://github.com/cicd-sensor/cicd-sensor/releases) into `/opt/cicd-sensor` and rename arch-suffixed binaries to `cicd-sensor`, `cicd-sensor-manager`, `cicd-sensorctl` as documented.

Store the manager token:

```sh
sudo install -d -m 0750 /etc/cicd-sensor
echo "MANAGER_TOKEN_HERE" | sudo tee /etc/cicd-sensor/manager-token >/dev/null
sudo chmod 0600 /etc/cicd-sensor/manager-token
```

Agent systemd unit (GitHub machine runner):

```ini
# /etc/systemd/system/cicd-sensor-agent.service
[Unit]
Description=cicd-sensor Agent
After=network-online.target
Wants=network-online.target
RefuseManualStop=yes
IgnoreOnIsolate=yes

[Service]
Type=simple
RuntimeDirectory=cicd-sensor
RuntimeDirectoryMode=0755
LoadCredential=manager_token:/etc/cicd-sensor/manager-token
ExecStart=/opt/cicd-sensor/cicd-sensor agent start \
  --provider github \
  --runner machine \
  --manager-url https://cicd-sensor-manager.example.com \
  --manager-token-file ${CREDENTIALS_DIRECTORY}/manager_token
Restart=always
RestartSec=5s
NoNewPrivileges=yes
PrivateTmp=yes
OOMScoreAdjust=-1000
KillMode=mixed
TimeoutStopSec=5s

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now cicd-sensor-agent.service
```

Docker needs a proxy in front of the socket so container creation is attributable. Real dockerd moves to `/run/docker-upstream.sock`; clients keep talking to `/run/docker.sock` served by `cicd-sensor proxy dockerd`. See the install doc for the `docker.socket` override and `cicd-sensor-docker-proxy.service`. The proxy is observation for attribution, not an authorization boundary: treat socket access like Docker root.

### Job hooks

GitHub runs scripts before/after each job when these env vars point at absolute paths:

| Hook | Role |
|------|------|
| `ACTIONS_RUNNER_HOOK_JOB_STARTED` | `cicd-sensor host start` |
| `ACTIONS_RUNNER_HOOK_JOB_COMPLETED` | `cicd-sensor host end` |

Create hooks under `/opt/cicd-sensor`:

```sh
sudo sh -c 'printf "%s\n" "#!/usr/bin/env sh" "/opt/cicd-sensor/cicd-sensor host start" > /opt/cicd-sensor/github-job-started.sh && chmod 0755 /opt/cicd-sensor/github-job-started.sh'
sudo sh -c 'printf "%s\n" "#!/usr/bin/env sh" "/opt/cicd-sensor/cicd-sensor host end" > /opt/cicd-sensor/github-job-completed.sh && chmod 0755 /opt/cicd-sensor/github-job-completed.sh'
```

Scope them per runner via the runner directory `.env` (example install path `/opt/actions-runner`):

```sh
cd /opt/actions-runner
cat >> .env <<'EOF'
ACTIONS_RUNNER_HOOK_JOB_STARTED=/opt/cicd-sensor/github-job-started.sh
ACTIONS_RUNNER_HOOK_JOB_COMPLETED=/opt/cicd-sensor/github-job-completed.sh
EOF
sudo ./svc.sh stop
sudo ./svc.sh start
```

If the start hook exits non-zero, the job never runs. The completed hook’s health check is also a tamper signal: if something inside the job called `host end` early to cut monitoring short, finalize fails and the job does not look clean.

Verify with a test workflow, then:

```sh
sudo journalctl -u cicd-sensor-agent.service -f
```

You can still use `cicd-sensor-action` from workflows on a machine that already has host setup; the durable path is Agent + hooks + Manager.

## Path 3: ARC on Kubernetes

Actions Runner Controller scale sets are **preview** support. Do not treat this like GitHub-hosted maturity yet. Guide: [GitHub ARC runner scale sets](https://github.com/cicd-sensor/cicd-sensor/blob/main/docs/user-guide/kubernetes/github-arc.md).

You need Manager, node prerequisites (cgroup v2, containerd NRI, runc systemd cgroups — see [Kubernetes runner install](https://github.com/cicd-sensor/cicd-sensor/blob/main/docs/user-guide/kubernetes/index.md)), and an existing ARC install. cicd-sensor runs as a privileged node DaemonSet. Job hooks are fail-closed: if the agent or GitHub Kubernetes runner socket is missing on a node, jobs on that node can fail before steps run.

Pick the mode that matches your scale set:

| ARC mode | When | cicd-sensor pieces |
|----------|------|--------------------|
| Default | No `containerMode`; job runs in the runner container | DaemonSet + job hook + runner socket mount |
| dind | `docker build` / Compose style | Same pattern + `containerMode.type: dind` |
| Kubernetes | `container:` / services / container actions as Pods | DaemonSet + NRI + job hook + container hook wrapper |

### Shared bootstrap

```sh
kubectl create namespace cicd-sensor-system --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace arc-runners --dry-run=client -o yaml | kubectl apply -f -

kubectl -n cicd-sensor-system create secret generic cicd-sensor-manager \
  --from-literal=token="${CICD_SENSOR_MANAGER_TOKEN}" \
  --dry-run=client -o yaml | kubectl apply -f -
```

Ensure the ARC runner namespace allows the hostPath used for the GitHub Kubernetes runner socket if Pod Security Admission is strict.

### Values merge rule (read this before Helm)

Do **not** pass “existing ARC values” and “cicd-sensor example” as two `--values` files. Helm deep-merges maps; **lists are replaced**. Runner `env`, `volumeMounts`, and `volumes` are lists. A second file can silently drop either your settings or the sensor mounts.

Copy the example for your mode from [`examples/kubernetes/github-arc/`](https://github.com/cicd-sensor/cicd-sensor/tree/main/examples/kubernetes/github-arc), merge into one file (`cicd-sensor-arc-values.yaml`), pin image tags (examples use `:latest` only as placeholders), set `CICD_SENSOR_MANAGER_URL` on the DaemonSet, then:

```sh
kubectl apply -f cicd-sensor-daemonset.yaml
kubectl apply -f cicd-sensor-job-hook.yaml
# kubernetes mode also: cicd-sensor-container-hook-wrapper.yaml

helm upgrade --install RUNNER_SCALE_SET_NAME \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set \
  --namespace arc-runners \
  --version ARC_CHART_VERSION \
  --values cicd-sensor-arc-values.yaml
```

Default-mode runner env / mounts look like this (from upstream example — merge, do not paste blindly over a production values file):

```yaml
template:
  spec:
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command:
          - /home/runner/run.sh
        env:
          - name: ACTIONS_RUNNER_HOOK_JOB_STARTED
            value: /opt/cicd-sensor/job-hooks/github-k8s-job-started.js
          - name: CICD_SENSOR_GITHUB_K8S_RUNNER_SOCKET
            value: /run/cicd-sensor/github-k8s/runner.sock
        volumeMounts:
          - name: cicd-sensor-github-arc-job-hook
            mountPath: /opt/cicd-sensor/job-hooks
            readOnly: true
          - name: cicd-sensor-github-k8s-runner-socket
            mountPath: /run/cicd-sensor/github-k8s
    volumes:
      - name: cicd-sensor-github-arc-job-hook
        configMap:
          name: cicd-sensor-github-arc-job-hook
          defaultMode: 0555
      - name: cicd-sensor-github-k8s-runner-socket
        hostPath:
          path: /run/cicd-sensor/github-k8s
          type: DirectoryOrCreate
```

Do not mount host `containerd.sock`, CRI/NRI sockets, or `/run/cicd-sensor` internal sockets into workflow-created job/service/step Pods. The GitHub Kubernetes runner socket into the ARC runner container is the documented exception.

### Verify

```sh
kubectl -n cicd-sensor-system rollout status daemonset/cicd-sensor
kubectl -n cicd-sensor-system logs daemonset/cicd-sensor -c agent
# kubernetes mode: also -c nri → look for nri_observer_starting / nri_staging_put
```

After a job starts you want `github_k8s_start_accepted` in agent logs. Confirm the runner Pod has the hook env and `/run/cicd-sensor/github-k8s` mount, then run a workflow with `runs-on` set to your scale set name and watch Manager.

I have been pushing on AKS node image verification for this path (community docs PR and issues for a wider verified matrix). Preview means “works in documented shapes,” not “every cloud node image is certified.”

## How I would roll this out

1. **Public or low-risk hosted job** — pin `cicd-sensor-action`, leave baseline on, `monitor_mode: true`, read the HTML report for a week.
2. **Add one custom detect rule** that matches a known bad pattern you care about (unexpected curl/wget to odd destinations, unexpected crypto miners, etc.), still detect-only.
3. **Private fleet** — stand up Manager (Lambda / ECS / Cloud Run / k8s Deployment — project ships images on GHCR). Point hosted jobs at Manager when you want SIEM delivery. For self-hosted and ARC, Manager is mandatory.
4. **Terminate later** — turn off `monitor_mode` only after false positives are boring.
5. **Attestation** — on hosted jobs, take the Runtime Trace predicate artifact and sign/verify it in promote gates the same way you would any other in-toto predicate ([related post](/runtime-trace-process-attestation/)).

## What this is not

- Not a replacement for pinning Actions, least-privilege `GITHUB_TOKEN`, and static workflow lint ([hardening post](/github-actions-supply-chain-hardening/)).
- Not Harden-Runner’s egress product. Different tradeoffs: cicd-sensor is open and self-hostable; Harden-Runner is polished and commercial for private enforcement.
- Not production-node Falco/Tetragon with a CI sticker. The lifecycle hooks and Docker/NRI attribution are the CI-specific hard parts.

## Contribute / follow

- Project: [github.com/cicd-sensor/cicd-sensor](https://github.com/cicd-sensor/cicd-sensor)
- Action: [cicd-sensor/cicd-sensor-action](https://github.com/cicd-sensor/cicd-sensor-action)
- Docs entry: [User guide overview](https://github.com/cicd-sensor/cicd-sensor/blob/main/docs/user-guide/overview.md)

CI runtime should not stay a blank stare. cicd-sensor is the open sensor I wanted when I was staring at paid-only and abandoned options. Hosted is a one-step start. Machine and ARC need Manager and honest ops. That is the right shape for something that can detect, respond, and leave an audit trail of what the pipeline actually did.

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
