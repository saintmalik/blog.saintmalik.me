---
slug: runtime-trace-process-attestation
title: "Runtime Trace attestation: signed image, dishonest process"
authors: Abdulmalik
date: 2026-09-12
image: /bgimg/runtime-trace-process-attestation-cover.webp
tags: [devsecops, supply-chain, runtime-trace, in-toto, process-trust, attestation, cicd, security, cosign, slsa]
description: "Artifact signatures prove who sealed the digests. They do not prove what the build did. Runtime Trace is process attestation: observe the job, attach the predicate, gate promote on behavior, including when the image signature is still green."
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Figure from '../src/components/Figure';
import Giscus from "@giscus/react";

The image signature said yes. Provenance said GitHub Actions on `main`. The image still shipped with a build that opened the wrong sockets and ran a binary nobody named in the workflow. That is not a signing-tool bug. That is a missing link in the chain of trust.

<!--truncate-->

I already wrote about [keyless signing](/keyless-signing-container-images-github-oidc/), [SBOMs beyond generation](/sbom-supply-chain-beyond-generation/), and [hardening Actions](/github-actions-supply-chain-hardening/). Those posts sit on **layer 1 and the edges of layer 2**: who signed the artifact, what packages are inside, how soft the pipeline identity is.

This one is the gap teams paper over with more signing. **Artifact trust is not process trust.** If you only verify digests, you will promote signed malware the moment CI builds it.

## Three layers. Stop collapsing them.

| Layer | Question | Tools people confuse |
|-------|----------|----------------------|
| **1. Artifact** | Who signed this image? Untampered? | Cosign, AWS Signer + Notation |
| **2. Process / supply chain** | What did the build actually do? | in-toto predicates (SLSA provenance, SBOM, **Runtime Trace**) |
| **3. Confidential runtime** | Can host root snoop memory or swap code in use? | Nitro Enclaves, SEV-SNP, TDX, CoCo |

Artifact signing ≈ wax seal on the box. in-toto ≈ custody log for the shipment. Nitro ≈ armored truck for data-in-use. Same English word **"attestation."** Different evidence.

This post is **layer 2**. Specifically the part an image signature does not cover: **Runtime Trace** and other predicates that describe *behavior*, not just *identity*. Cosign (or Signer) is just how many teams attach and verify that evidence.

## Gaps artifact signing alone does not close

### Signed malware

Attacker gets CI to build evil. Workflow identity is still yours. The pipeline still signs. Admission policies that only check "signed by us" stay green. The chain of trust broke **during the build**, then got a valid seal.

### Provenance is not a process log

SLSA-style provenance answers: which workflow, which source, which builder. It does not list every binary that executed, every socket that opened, every path that was read. Trace shows the job did something provenance never mentions.

### Hermetic claims you cannot prove

"We only used these inputs" is a slide until something records files actually opened. Without that, hermetic is branding.

### Reproducible-build debates

Same commit, two runs. Identities still look fine. Trace differs: tools, hosts, paths. That is environment drift or compromise. Either way you need the log.

### Light touch: authorized pipeline, wrong behavior

Unusual tooling or exfil-shaped paths on a pipeline that was allowed to run are still an incident. You should not wait for the artifact to "look evil."

## What Runtime Trace actually is

[in-toto Runtime Trace](https://github.com/in-toto/attestation/blob/main/spec/predicates/runtime-trace.md) is a predicate type:

`predicateType: https://in-toto.io/attestation/runtime-trace/v0.1`

Rough shape:

- **monitor**: what observed the job (for example Tetragon), plus policy config
- **monitoredProcess**: which build/CI job instance
- **monitorLog**: process / network / fileAccess observations
- **metadata**: time bounds

The signer is often only the **transport**: it attaches the predicate to the image subject. It does not invent the Trace. Something has to observe the build and emit the predicate.

## Hands-on: signature green, Trace red

Public lab: [`saintmalik/runtime-trace-lab`](https://github.com/saintmalik/runtime-trace-lab). Fork it, run **Runtime Trace lab**, follow the steps below in order.

| You already do | Same idea for Trace |
|----------------|---------------------|
| `cosign sign` | `cosign attest --type …/runtime-trace/v0.1 --predicate …` |
| `cosign verify` | `cosign verify-attestation --type … --policy policy.cue` |

| Run | Image signature | Trace policy |
|-----|-----------------|--------------|
| clean | PASS | PASS |
| dirty (confused CI codegen: typosquat `proto-gen-connect-go`) | PASS | **FAIL** |

End state of a good lab run:

<Figure>
<picture>
  <source type="image/webp" srcSet={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cosign-runtime-trace-summary.webp`} />
  <source type="image/png" srcSet={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cosign-runtime-trace-summary.png`} />
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cosign-runtime-trace-summary.png`} alt="GitHub Actions summary: clean Trace policy PASS, dirty FAIL expected, image signature PASS both" />
</picture>
<p>Job summary: image signature PASS on both; Trace policy PASS only on clean.</p>
</Figure>

### Who writes what

| Thing | Who |
|-------|-----|
| Tetragon TracingPolicies (`.github/tetragon-policies/`) | **Platform** — what to *observe* |
| Exporter → Runtime Trace JSON | **Platform** — Tetragon events → predicate |
| `policy.cue` | **You** — what you *refuse to promote* |
| `cosign sign` / `attest` / `verify*` | Same Cosign flow you already use |

Two different “policies.” Tetragon YAML feeds the Trace. Cosign CUE gates the Trace. You do not hand-author Trace for prod. If Trace is missing, fail closed.

### Where the platform bits live (not in app code)

```text
.github/workflows/runtime-trace-lab.yml
.github/exporter/tetragon_to_runtime_trace.py
.github/tetragon-policies/connect.yaml
.github/tetragon-policies/file-access.yaml
.github/policies/policy.cue
```

App `Dockerfile` / product code stay boring. Copy the attestation side step by step.

### 1. Start Tetragon + load TracingPolicies

Community composite action ([`lizrice/tetragon-ci`](https://github.com/lizrice/tetragon-ci), SHA-pinned; **not** an official Cilium Marketplace action). It auto-loads YAML from `.github/tetragon-policies/` in **monitor** mode. Process exec/exit comes from Tetragon defaults; these add connect + file-access into events the exporter turns into a Runtime Trace.

```yaml
- name: Start Tetragon
  uses: lizrice/tetragon-ci/.github/actions/tetragon-setup@5fddf42569d25585c85a0a3e7de0f24c683471eb
  with:
    tetragon_version: v1.7.0
    enforce_policies: "false"
    event_stream_timeout: 45m
```

Skip `tetragon-report` unless you want a huge compact-event dump in the job summary. You do not need it for Cosign.

#### Tetragon TracingPolicy: TCP connect

Lab: [`.github/tetragon-policies/connect.yaml`](https://github.com/saintmalik/runtime-trace-lab/blob/main/.github/tetragon-policies/connect.yaml)

```yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: connect
spec:
  kprobes:
  - call: "tcp_connect"
    syscall: false
    args:
    - index: 0
      type: "sock"
```

| Piece | Meaning |
|-------|---------|
| `call: "tcp_connect"` | Hook outbound TCP connects. |
| `args[0] type: sock` | Destination address/port → Trace `monitorLog.network`. |

#### Tetragon TracingPolicy: dropper / sensitive paths

Lab: [`.github/tetragon-policies/file-access.yaml`](https://github.com/saintmalik/runtime-trace-lab/blob/main/.github/tetragon-policies/file-access.yaml)

Keep selectors **tight**. Prefix `/home/` (or bare `/tmp/`) on a GHA runner floods export and can starve `process_exec`. Lab only watches the dropper path + SSH.

```yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: file-access
spec:
  kprobes:
  - call: "security_file_permission"
    syscall: false
    return: true
    args:
    - index: 0
      type: "file"
    - index: 1
      type: "int"
    returnArg:
      index: 0
      type: "int"
    selectors:
    - matchArgs:
      - index: 0
        operator: "Prefix"
        values:
        - "/tmp/curl-exfil"
        - "/root/.ssh"
  - call: "security_path_truncate"
    syscall: false
    return: true
    args:
    - index: 0
      type: "path"
    returnArg:
      index: 0
      type: "int"
    selectors:
    - matchArgs:
      - index: 0
        operator: "Prefix"
        values:
        - "/tmp/curl-exfil"
        - "/root/.ssh"
```

| Piece | Meaning |
|-------|---------|
| `security_file_permission` / `security_path_truncate` | Observe open/truncate on selected paths. |
| `Prefix: /tmp/curl-exfil` | Lab dropper path → Trace `fileAccess` / related process context. |
| `Prefix: /root/.ssh` | Example sensitive builder path. |
| Not `/home/` or bare `/tmp/` | Avoid drowning the Trace on shared runners. |

These TracingPolicies are **observation only** (`enforce_policies: "false"`). They do not fail the job. Promote failure comes later from Cosign + `policy.cue`.

### 2. Capture events for the Trace (gRPC)

On GitHub-hosted runners, `/var/log/tetragon/tetragon.log` can rate-limit under kprobe noise and drop `process_exec`. Capture JSON over gRPC instead:

```yaml
env:
  TRACE_TYPE: https://in-toto.io/attestation/runtime-trace/v0.1
  TETRAGON_EXPORT: /tmp/tetragon-trace.jsonl

- name: Capture Tetragon JSON for Runtime Trace
  run: |
    set -euo pipefail
    : > "${TETRAGON_EXPORT}"
    (
      unset RUNNER_TRACKING_ID
      nohup sudo stdbuf -oL -eL tetra \
        --server-address unix:///var/run/tetragon/tetragon.sock \
        getevents -o json \
        > "${TETRAGON_EXPORT}" 2>/tmp/tetra-json.err &
      echo $! > /tmp/tetra-json.pid
    )
    sleep 2
    test -s /tmp/tetra-json.pid
```

Leave that stream running for the rest of the job (build, dirty codegen if any, sign).

### 3. Dirty contrast (what the Trace must see)

Clean skips this. Dirty runs the confused codegen shape teams already use (`go install <plugin> && <plugin>`), with the **wrong module path** (`proto-gen-connect-go` typosquat of `protoc-gen-connect-go`). Lab dropper writes `/tmp/curl-exfil` and beacons.

```yaml
- name: Confused codegen (dirty)
  if: matrix.profile == 'dirty'
  run: |
    set -euo pipefail
    GOBIN=/tmp/lab-gobin
    mkdir -p "$GOBIN"
    export PATH="$GOBIN:$PATH"
    go install github.com/saintmalik/proto-gen-connect-go/cmd/proto-gen-connect-go@v0.1.1
    proto-gen-connect-go
    test -x /tmp/curl-exfil
```

Then build/push/sign the image as you already do (`cosign sign --yes "${REF}"`). Identity still looks fine.

### 4. Export Tetragon JSON → Runtime Trace predicate

Platform owns the exporter (lab: [`.github/exporter/tetragon_to_runtime_trace.py`](https://github.com/saintmalik/runtime-trace-lab/blob/main/.github/exporter/tetragon_to_runtime_trace.py)). After the job work:

```yaml
- name: Export Runtime Trace
  run: |
    set -euo pipefail
    sleep 2
    cp "${TETRAGON_EXPORT}" "tetragon-events-${PROFILE}.jsonl"
    python3 .github/exporter/tetragon_to_runtime_trace.py \
      --events "tetragon-events-${PROFILE}.jsonl" \
      --out "runtime-trace-${PROFILE}.json" \
      --event-name "ci-job-${PROFILE}" \
      --started "${{ steps.window.outputs.started }}" \
      --finished "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

Fail closed if dirty Trace has no smoking gun (`/tmp/curl-exfil` / `proto-gen-connect`) before you attest. Attesting an empty Trace makes Cosign policy look “green” for the wrong reason.

What a real export looks like (dirty): `rawEvents`, `monitor.tracePolicy` listing `process-lifecycle` + your `connect` / `file-access` YAMLs, then `monitorLog.process` / `network` / `fileAccess`.

<Figure>
<picture>
  <source type="image/webp" srcSet={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cosign-runtime-trace-export.webp`} />
  <source type="image/png" srcSet={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cosign-runtime-trace-export.png`} />
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cosign-runtime-trace-export.png`} alt="Export Runtime Trace step showing runtime-trace-dirty.json with Tetragon policies connect and file-access" />
</picture>
<p>Export Runtime Trace: predicate names the Tetragon policies, then lists observed processes.</p>
</Figure>

### 5. Attest the Trace (Cosign transport)

```yaml
- name: Attest Runtime Trace
  run: |
    cosign attest --yes \
      --type "${TRACE_TYPE}" \
      --predicate "runtime-trace-${PROFILE}.json" \
      "${REF}"
```

Same keyless OIDC identity you already use for `cosign sign`.

### 6. Verify image signature (still green on dirty)

```yaml
- name: Verify image signature
  run: |
    cosign verify \
      --certificate-identity "${CERT_IDENTITY}" \
      --certificate-oidc-issuer "${CERT_ISSUER}" \
      "${REF}"
```

### 7. Promote gate: `policy.cue` + `verify-attestation`

This is the decision step. Cosign is only the **transport**; your CUE file is the gate. Lab copy: [`.github/policies/policy.cue`](https://github.com/saintmalik/runtime-trace-lab/blob/main/.github/policies/policy.cue).

**Allowlist what you expect.** Do not denylist the attacker’s domain. You will not know C2 DNS ahead of time. The lab typosquat still beacons to `blog.saintmalik.me`; that host is simply **not** on the allowlist. The failure you want for the blog is the `/tmp/` process rule.

```cue
// .github/policies/policy.cue
predicateType: "https://in-toto.io/attestation/runtime-trace/v0.1"

predicate: {
	monitorLog: {
		// Every processBinary must NOT live under /tmp/.
		// Dirty drops /tmp/curl-exfil → fails closed.
		process: [...{
			processBinary: !~"^/tmp/"
		}]

		// Named destinations must be known-good (or a raw IP).
		// Unknown hostnames fail. Pure IPs allowed here because
		// GHA host traces are noisy; tighten in production.
		network: [...{
			destination: =~"^([0-9.]+|\\[[0-9a-fA-F:]+\\])(:[0-9]+)?$|^(proxy\\.golang\\.org|sum\\.golang\\.org|storage\\.googleapis\\.com|github\\.com|ghcr\\.io|objects\\.githubusercontent\\.com|registry\\.npmjs\\.org|dl-cdn\\.alpinelinux\\.org)(:[0-9]+)?$"
		}]
	}
}
```

| Piece | Meaning |
|-------|---------|
| `predicateType: "…/runtime-trace/v0.1"` | Only evaluate Runtime Trace attestations. |
| `processBinary: !~"^/tmp/"` | Every process in the Trace must match. `/tmp/curl-exfil` is out of bound. |
| `network.destination: =~"…"` | Allowlist expected hostnames + raw IPs for noisy CI. |

Wire it after image verify:

```yaml
- name: Verify Runtime Trace against policy
  id: policy
  continue-on-error: true   # lab only: dirty is expected to fail
  run: |
    cosign verify-attestation \
      --type "${TRACE_TYPE}" \
      --policy .github/policies/policy.cue \
      --certificate-identity "${CERT_IDENTITY}" \
      --certificate-oidc-issuer "${CERT_ISSUER}" \
      "${REF}"
```

Dirty fails like this (image verify above it stayed green):

<Figure>
<picture>
  <source type="image/webp" srcSet={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cosign-runtime-trace-policy-fail.webp`} />
  <source type="image/png" srcSet={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cosign-runtime-trace-policy-fail.png`} />
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/cosign-runtime-trace-policy-fail.png`} alt="cosign verify-attestation failing: processBinary /tmp/curl-exfil out of bound !~^/tmp/" />
</picture>
<p><code>processBinary: "/tmp/curl-exfil"</code> violates <code>!~"^/tmp/"</code>.</p>
</Figure>

```text
predicate.monitorLog.process.N.processBinary: invalid value "/tmp/curl-exfil" (out of bound !~"^/tmp/")
```

Assert outcomes so the **job** is green only when clean PASSes and dirty FAILs:

```yaml
- name: Check expected policy outcome
  env:
    POLICY_OUTCOME: ${{ steps.policy.outcome }}
  run: |
    set -euo pipefail
    if [ "$PROFILE" = "clean" ] && [ "$POLICY_OUTCOME" != "success" ]; then
      echo "clean Trace should pass policy.cue"
      exit 1
    fi
    if [ "$PROFILE" = "dirty" ] && [ "$POLICY_OUTCOME" != "failure" ]; then
      echo "dirty Trace should fail policy.cue"
      exit 1
    fi
```

That is the demo: **image signature still green; process attestation (Runtime Trace + `policy.cue`) red on dirty.**

### Observation notes (stay honest)

- Tetragon watches the **full job lifecycle**. Do not `sudo truncate` the event stream.
- Host Tetragon on GHA often under-reports Docker/`RUN` exec. The lab dirty step is **builder-side** codegen (the common `go install && tool` shape). Production Trace should watch the namespace that actually runs the build.
- Prefer `tetra getevents -o json` for the Trace input on noisy runners; the JSON file sink alone bit us with zero `process_exec`.

## What this does not claim

Use the scary words carefully so the post stays honest:

- **Chain of trust**: Trace maintains the *process* link. Signing maintains the *identity* link. You need both.
- **Unauthorized runtime changes**: here that means unauthorized **build-time** behavior (binaries, egress, file access) on the path to the artifact. Prod pod drift is Falco/Tetragon-in-cluster and admission, another chapter.
- **Infra operator snooping**: Trace makes CI behavior auditable and ungatable. It does not stop a hostile operator with node root from snooping a live workload. That is closer to **layer 3** (TEE / Nitro) plus logging that is not owned by the same person who runs the builder.
- **Privilege escalation**: not what Trace replaces. Still RBAC, admissions, capabilities, runtime detection.
- **Memory dump**: outside Trace promises. Confidentiality of memory is hardening / TEE / access control, not a build predicate.

Short version: Trace is behavioral evidence in the supply-chain chain of trust.

## Conclusion

Signing closes identity. Provenance names the workflow. **Runtime Trace is how you argue the process was wrong, including when the signature is valid.**

That is how you push back on signed malware, provenance that never mentions what ran, hermetic claims you cannot prove, and two builds of the same commit that touched different tools and paths. Maintain the chain of trust through the build, or "attested" is just branding.

Till next time, Peace be on you 🙏🏽

#### References

- Lab: [saintmalik/runtime-trace-lab](https://github.com/saintmalik/runtime-trace-lab)
- [in-toto Runtime Trace predicate](https://github.com/in-toto/attestation/blob/main/spec/predicates/runtime-trace.md)
- [in-toto and SLSA](https://slsa.dev/blog/2023/05/in-toto-and-slsa)
- [Cosign attestations / policy](https://docs.sigstore.dev/cosign/verifying/attestation/)
- Related on this blog: [Keyless signing](/keyless-signing-container-images-github-oidc/), [SBOM beyond generation](/sbom-supply-chain-beyond-generation/), [GitHub Actions supply chain hardening](/github-actions-supply-chain-hardening/), [AWS Signer](/iac-security-with-state-file-aws-signerion/)

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
