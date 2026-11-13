---
slug: from-securing-cicd-to-securing-ai-ml-pipelines
title: "From securing conventional product CI/CD to securing AI/ML product pipelines"
authors: Abdulmalik
date: 2026-11-13
image: /bgimg/from-securing-cicd-to-securing-ai-ml-pipelines-cover.webp
tags: [ai-security, mlsecops, mlops, cicd, supply-chain, appsec, security, github-actions, sagemaker, kubeflow]
keywords:
  - conventional product CI/CD
  - securing AI ML product pipelines
  - DevSecOps to AI security
  - AI security engineering
  - MLOps vs AIOps
  - training data poisoning
  - Kubeflow pipeline hardening
  - MLflow model registry gates
  - SageMaker pipeline security
  - ML-BOM AIBOM pipeline gates
  - pipeline hardening
description: "DevSecOps to AI security: same gates on AI/ML product pipelines. Secret scan, dataset pin, SAST, SBOM plus ML-BOM plus AIBOM, model registry promote, attested API image. You do not need a GPU fleet to do this job."
faq:
  - question: "Is securing AI/ML pipelines a different discipline from DevSecOps?"
    answer: >-
      No. Same job. Different artifacts. You still need short-lived credentials,
      signed build images, scanned inventories, approval gates, egress control,
      and secret hygiene. The artifact that moves is a checkpoint and a
      dataset digest, not only a container tag. Kubeflow, MLflow, and SageMaker
      are where the pipeline runs. The skill transfer is DevSecOps to AI
      security.
  - question: "Do AI security engineers need GPUs to serve models like OpenAI?"
    answer: >-
      No. AI security engineers secure the controls on the train, registry, and
      promote path. MLOps and platform teams run GPU fleets or buy hosted
      inference. Your job is fail-closed gates, registry stage policy, IAM/OIDC,
      inventories, and endpoint authZ. A CPU sklearn lab is enough to practice
      the gates.
  - question: "Does MLOps cover AIOps?"
    answer: >-
      No. MLOps is operating ML training, deploy, and monitor pipelines (model
      lifecycle). AIOps usually means AI for IT/ops: alert noise, incident
      correlation. Different term. This post is AI security on ML and LLM
      pipelines. LLMOps and agent workloads still use the same DevSecOps to AI
      security gates, plus AIBOM and runtime call checks.
  - question: "What stops training data poisoning in a company pipeline?"
    answer: >-
      Pin the dataset by content digest (DVC, lakeFS, or S3 version ID plus
      object hash), put write ACL only on curated producers, quarantine
      untrusted scrapes, review diffs on curated sets, and fail promote when
      eval canaries or baseline drift checks miss. Signing the model does not
      prove the training data was clean.
  - question: "Where do model signing and ML-BOM fit relative to pipeline gates?"
    answer: >-
      Adjacent layers. Pipeline gates decide whether a train or promote job
      may run and register. Signing proves who published the pack bytes
      (https://blog.saintmalik.me/from-signing-containers-to-signing-models/).
      Software SBOM, ML-BOM, and AIBOM inventory what you ship and what the
      running system calls
      (https://blog.saintmalik.me/sbom-for-models-not-just-containers/).
      Wire promote so the gates and inventories pass.
  - question: "Can I reuse GitHub Actions OIDC for SageMaker or Kubeflow train jobs?"
    answer: >-
      Yes for the GitHub-triggered path: Actions assumes an AWS role or
      Kubernetes service account via OIDC, then starts the train job. Inside
      SageMaker or Kubeflow, use the platform role / IRSA equivalent so the
      job never holds a long-lived cloud key. Same eradicate-long-lived-tokens
      habit as app CI.
  - question: "What should block promote or serve admit?"
    answer: >-
      Fail closed unless secret scan is clean, the dataset digest matches the
      lockfile, the eval canary passed, the model registry stage allows the
      revision, and the API image is attested or signed before production
      admit. Unsigned checkpoint plus floating dataset path is not a promote.
---

import Giscus from "@giscus/react";
import Figure from '../src/components/Figure';

You already secure a normal app end to end. Secrets scan. SAST. SCA. Build. Scan. Sign. Approve. Deploy. That is DevSecOps.

Same gates on train and model promote. New artifacts. Poisoned data or an unsigned checkpoint still lands without them. Extra gate software CI rarely names: pin the training dataset by digest.

Skill transfer: DevSecOps to AI security. No GPU needed. Act A is the app stack. Act B is gates on train → registry promote → API, CPU sklearn stand-in. Kubeflow, MLflow, SageMaker: same gates, different knobs. Signing and SBOM / ML-BOM / AIBOM are adjacent.

MLOps is the ML lifecycle. AIOps is AI for IT/ops. Not the same. This post is AI security on ML and LLM pipelines.

Related:

- [From signing containers to signing models](/from-signing-containers-to-signing-models/)
- [From software SBOM to ML-BOM and AIBOM](/sbom-for-models-not-just-containers/)
- [Don't put the token in the agent](/dont-put-the-token-in-the-agent/)

<!--truncate-->

## Same gates, different artifact

Skill transfer: DevSecOps engineering to AI security engineering. Same gates, new artifacts (dataset digest, model pack, registry revision, API image). The figure is the map. Act A/B walk the steps.

Gates in order: secret scan → identity (OIDC) → dep / dataset pin → SAST → DAST / staging authZ → SCA (SBOM + ML-BOM + AIBOM) → sign / attest → model registry stage → approval → deploy API. Plus egress allowlist on the runner or train job.

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/from-securing-cicd-to-securing-ai-ml-pipelines-gates.webp" />
  <source type="image/png" srcSet="/bgimg/from-securing-cicd-to-securing-ai-ml-pipelines-gates.png" />
  <img src="/bgimg/from-securing-cicd-to-securing-ai-ml-pipelines-gates.png" alt="Side by side: conventional product CI/CD pipeline (DevSecOps) of secret scan Gitleaks, identity OIDC, dep lock, SAST, DAST, SCA, sign, approval, deploy; AI/ML product pipeline (AI security) of secret scan on train notebooks agents, identity OIDC or IRSA, dataset digest pin, SAST on train and YAML, staging endpoint authZ, SCA with SBOM plus ML-BOM plus AIBOM, attest image and model, eval canary, model registry promote, API deploy. Center label: same gates. Caption notes egress allowlist." />
</picture>
<p>Left is the conventional product CI/CD pipeline (DevSecOps). Right is the AI/ML product pipeline (AI security). Secret scan is Gitleaks. Identity is OIDC / IRSA. Dataset digest pin is the data-poisoning lock. Inventory on the right is SBOM + ML-BOM + AIBOM. Promote lands in a Model Registry, not only a container tag.</p>
</Figure>

## What an AI security engineer owns vs what platform owns

You will not be serving ChatGPT. You usually will not own the GPU fleet either.

**AI security owns (or drives) the controls:**

- Threat model for train → registry → endpoint
- Fail-closed gates: secret scan, SAST, SCA / SBOM + ML-BOM + AIBOM, dataset digest pin, image and model attest, eval canary, registry stage policy, endpoint authZ and egress
- Review of SageMaker / Vertex / HF / MLflow configs, IAM / OIDC, and network paths on the promote path
- Incident response around poisoned data, swapped weights, leaked train tokens
- Partner with MLOps / platform on admit policy. You do not need their GPUs to practice the gates.

**Platform / MLOps owns the runtime:**

- GPU train clusters, inference fleets, autoscaling, canary rollout of the serving stack
- Hosted inference buys (Fireworks, Together, Replicate, HF Inference Endpoints, Modal) when the company does not self-host
- Day-to-day operation of vLLM / TGI / Triton-class stacks when they do

Frontier labs run custom GPU fleets and global API gateways. That is not the AI security role, and it is not this lab. The lab is the gate and promote path those teams still have to pass.

## Lab stand-ins vs work tools

The companion repo is not "the only prod stack." It is a CPU stand-in so you can fail closed without a GPU fleet.

| Plane | This lab | goto for work |
| --- | --- | --- |
| Gates (+ kick train) | GitHub Actions | Actions / GitLab CI / Buildkite |
| Heavy train | Actions CPU sklearn | SageMaker Pipelines; Kubeflow (GPU K8s DAGs) |
| Model registry | HF Hub | MLflow (closest twin); SageMaker Model Registry |
| API image | GHCR | GHCR / ECR |
| Serve | optional local Docker | platform endpoint (SageMaker endpoint, k8s, hosted inference) |

SageMaker covers AWS train, pipelines, model registry, and optional endpoints. Kubeflow is GPU K8s train DAGs. MLflow is registry + tracking. Same gates. Different knobs.

## Act A: Normal app, short reminder

This is the template. You already know it. Progressive gates. Fail closed before deploy.

1. **Source lands.** PR or push. Change detection decides which jobs run.
2. **Secret scan.** Gitleaks (or push protection) on the tree. Block committed AWS keys, tokens, `.env` files.
3. **Identity.** Job auth via OIDC / short-lived cloud creds. No long-lived key in the workflow env.
4. **SAST.** OpenGrep / Semgrep / CodeQL on app code.
5. **SCA.** Lockfile and dependency scan when `package.json` / `requirements.txt` moved.
6. **Build image.** Digest-tagged. Not `:latest`.
7. **Image SCA.** Anchore / Grype / Trivy on the built image. High and critical fail the job when that is policy.
8. **Sign / attest.** Notation or Cosign / `actions/attest` on the digest before admit.
9. **Approval.** Environment protection or policy gate.
10. **Deploy.** Registry push then runtime pull of the signed digest only. Egress allowlist on the runner stays on.

That is "full from build to deploy" for an app. Act B maps the same gates onto train + Model Registry + API.

## Act B: Gate the train path, promote the pack, secure the API

Canonical code: [`saintmalik/ai-ml-pipeline`](https://github.com/saintmalik/ai-ml-pipeline). Primary story is **pipeline security gates** and **registry promote policy**, not owning inference. The tree trains a tiny CPU sklearn classifier so you can fail closed without a GPU. Local `docker run` is optional smoke for endpoint authZ.

Two artifacts. Do not conflate them:

1. **Model pack.** Dataset pin → train → eval → ML-BOM → optional Model Registry promote (HF Hub here; MLflow / SageMaker / Vertex at work). Missing repo secret `HF_TOKEN` skips Hub only.
2. **API image.** Normal product CI: scan, Syft / Grype, build, push **GHCR**, attest, environment admit. GHCR is the container plane. The Model Registry is the pack plane.

Smoke serve bakes a local pack (`MODEL_SOURCE=local`). Prod-shaped serve pins a registry revision (`MODEL_SOURCE=hub` + `HF_MODEL_ID` + `HF_REVISION`). Platform deploys. AI Sec admits.

### Prerequisites

- GitHub account (clone or fork [`saintmalik/ai-ml-pipeline`](https://github.com/saintmalik/ai-ml-pipeline))
- Python 3.11 or 3.12 for optional local smoke
- Optional: Docker, `gitleaks`, `jq`, `shasum` / `sha256sum`, `syft`, `grype`

```shell-session
$ git clone https://github.com/saintmalik/ai-ml-pipeline.git
```

```shell-session
$ cd ai-ml-pipeline
```

### 1. Secret scan (Gitleaks), then identity

Secret scan is not OIDC. Scan first. Block committed keys in the train tree, notebooks, and agent configs the same way you block them in app CI.

```shell-session
$ gitleaks detect --source . --no-git -v
```

In CI the repo runs `gitleaks/gitleaks-action`. Identity is how the job talks to cloud or GHCR later: OIDC / IRSA / short-lived tokens. No standing AWS key in the workflow env. Actions uses `id-token: write` and `GITHUB_TOKEN` for GHCR and attest. Same eradicate-long-lived-tokens habit as app CI ([token post](/dont-put-the-token-in-the-agent/)).

### 2. Dataset digest pin

The curated set is `data/tickets.csv`. Lock it by content hash. This is the data-poisoning lock (dep-lock analog).

```shell-session
$ cat datasets.lock.json
```

```json title="datasets.lock.json"
{
  "name": "tickets-v1",
  "path": "data/tickets.csv",
  "sha256": "afb7f760bf6f37971a16488aade9fa205bde9bfe08d054c4e813e24624ccd21a",
  "rows": 50,
  "schema_version": 1
}
```

Pin-check before train (plain `shasum` + `jq`, no wrapper script):

```shell-session
$ EXPECTED=$(jq -r .sha256 datasets.lock.json)
```

```shell-session
$ ACTUAL=$(shasum -a 256 data/tickets.csv | awk '{print $1}')
```

```shell-session
$ echo "expected=$EXPECTED actual=$ACTUAL"
```

```shell-session
$ test "$ACTUAL" = "$EXPECTED"
```

Tamper case: flip one label in the CSV without updating the lockfile. The `test` fails. Do not train. Do not register.

### 3. SAST on train and serve code

```shell-session
$ opengrep scan --config p/python train/ serve/
```

Or CodeQL / Semgrep in CI. The companion workflow installs OpenGrep and scans `train/` and `serve/`. Fail the job on high findings the same way Act A fails app SAST. Also scan pipeline YAML when you change workflows.

### 4. Train the model pack (CPU stand-in)

Optional local. CI does this on every push to `main`.

```shell-session
$ python3.12 -m venv .venv
```

```shell-session
$ .venv/bin/pip install -r requirements.txt
```

```shell-session
$ .venv/bin/python train/train.py \
    --data data/tickets.csv \
    --out model
```

You get `model/model.joblib` and `model/model_card.json` with `model_id: ticket-clf-v1`. Sklearn on CPU is enough to exercise the gates. At work the train job may already be SageMaker or Modal. You still require pin-check and canary before register.

### 5. Eval canary (fail closed)

```shell-session
$ .venv/bin/python train/eval_canary.py \
    --model model \
    --report out/eval.json
```

```shell-session
$ jq .canary_pass out/eval.json
```

Promote refuses to continue unless that is `true`. Canaries are only as strong as the holdout. Rotate known cases and keep a private set. Attach the dataset digest you trained on:

```shell-session
$ jq --arg ds "$(jq -r .sha256 datasets.lock.json)" \
    '. + {dataset_sha256: $ds}' out/eval.json > out/eval.pinned.json
```

```shell-session
$ mv out/eval.pinned.json out/eval.json
```

### 6. SCA / inventory: Software SBOM + ML-BOM + AIBOM

Three inventories ([SBOM post](/sbom-for-models-not-just-containers/)). There is still no Syft-class one-button ML-BOM for arbitrary packs. Software SBOM stays Syft. ML-BOM is one small script in the repo. AIBOM stays hand YAML.

**Software SBOM** (env locally, image in CI):

```shell-session
$ syft dir:.venv -o cyclonedx-json > inventory/sbom.json
```

```shell-session
$ grype inventory/sbom.json --fail-on high
```

**ML-BOM** (generate + fail-closed check):

```shell-session
$ .venv/bin/python train/gen_mlbom.py --model model --out inventory/mlbom.json
```

```shell-session
$ .venv/bin/python train/gen_mlbom.py --check inventory/mlbom.json --model model
```

**AIBOM** lists what the running system calls (`inventory/aibom.yaml`). Gate: `model_id` matches the pack and `/health`.

```shell-session
$ grep model_id inventory/aibom.yaml
```

```shell-session
$ jq -r .model_id model/model_card.json
```

Signing is adjacent ([signing post](/from-signing-containers-to-signing-models/)). Inventory does not replace attest.

### 7. Model Registry promote

GHCR holds the API image. The pack promotes to a Model Registry (HF Hub here; MLflow / SageMaker / Vertex at work). Set repo secret `HF_TOKEN` so CI can promote. Setup steps live in the [lab README](https://github.com/saintmalik/ai-ml-pipeline). Without it, train still uploads the pack artifact and the API image path continues. Pin the Hub revision in Production. Do not float latest weights. Notebooks that both produce and consume skip these gates. Fix IAM write paths, not the Registry UI. In the Actions UI, green **Register model to HF Hub** means promote ran; a skipped sibling step (if any) is only the unused "not configured" branch, not a failed Hub deploy.

Local smoke when you already have a token:

```shell-session
$ .venv/bin/python train/register_hf.py \
    --model model \
    --repo-id "${GITHUB_USER:-saintmalik}/ticket-clf" \
    --dataset-sha256 "$(jq -r .sha256 datasets.lock.json)"
```

### 8. API image: GHCR, attest, admit

Same shape as Act A for `ghcr.io/${{ github.repository }}`. Push `main` on the companion repo. Workflow: Gitleaks → dataset pin → OpenGrep → train + eval + ML-BOM → optional Hub register → build / Syft / Grype → push GHCR → `actions/attest-build-provenance` → `production` environment admit (required reviewers). Admit records image digest + registry revision for platform. Platform deploys the attested digest. AI Sec does not become the inference operator.

```yaml title=".github/workflows/train-serve.yml (attest fragment)"
permissions:
  contents: read
  id-token: write
  attestations: write
  packages: write

# after docker push:
- uses: actions/attest-build-provenance@v2
  with:
    subject-name: ghcr.io/${{ github.repository }}
    subject-digest: ${{ steps.push.outputs.digest }}
    push-to-registry: true
```

### 9. Endpoint authZ smoke (optional local)

Hit the serve path like a preview app. Not DAST on weight files.

```shell-session
$ docker build -f serve/Dockerfile -t ticket-clf:lab .
```

```shell-session
$ docker run --rm -d --name ticket-clf -p 18080:8080 \
    -e API_TOKEN=lab-token -e MODEL_SOURCE=local ticket-clf:lab
```

```shell-session
$ curl -sS http://127.0.0.1:18080/health
```

Expect `"model_id":"ticket-clf-v1"`. Bearer on `/predict` → `200`. No token → `401`. Then `docker stop ticket-clf`.

Prod-shaped pin when Hub promote exists: `MODEL_SOURCE=hub`, `HF_MODEL_ID=saintmalik/ticket-clf`, `HF_REVISION=<hub commit sha>`.

Hosted inference or self-hosted vLLM does not change the gate: only an attested API image and an approved registry stage reach Production. Managed train (SageMaker / Kubeflow) keeps the same order. Platform owns GPU. You still fail closed on pin, canary, and registry stage.

## End-to-end order (this lab)

1. Secret scan (Gitleaks).
2. Identity (OIDC / short-lived for cloud or GHCR).
3. Dataset pin (`datasets.lock.json`).
4. SAST (OpenGrep on train + serve).
5. Train pack → eval canary (fail closed).
6. Inventory: Syft/Grype SBOM, `gen_mlbom.py`, hand AIBOM.
7. Model Registry promote (HF Hub / MLflow / SageMaker).
8. API image: build, scan, push GHCR, attest.
9. Admit (`production` reviewers) + platform deploy of digest + pinned revision.
10. Egress allowlist on the runner ([hardening](/github-actions-supply-chain-hardening/), [cicd-sensor](/cicd-sensor-github-actions/)).

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
