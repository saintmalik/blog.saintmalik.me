---
slug: sbom-for-models-not-just-containers
title: "From software SBOM to ML-BOM and AIBOM"
authors: Abdulmalik
date: 2026-11-12
image: /bgimg/sbom-for-models-not-just-containers-cover.webp
tags: [ai-security, mlsecops, sbom, aibom, ml-bom, supply-chain, cyclonedx, syft, grype, appsec, security]
keywords:
  - Software SBOM
  - ML-BOM
  - AIBOM
  - AI SBOM
  - CycloneDX machine-learning-model
  - model bill of materials
  - Ollama Modelfile inventory
  - MLSecOps
  - model supply chain
description: "Extend the SBOM you already run for packages and images to the model pack (ML-BOM) and the runtime call graph (AIBOM). Grype the serve env. Hash-check the pack. Gate stale model IDs. Then sign the pack."
faq:
  - question: "Is an ML-BOM the same as signing the model?"
    answer: >-
      No. An ML-BOM is inventory of the pack on disk: files, hashes, pedigree
      claims. Signing proves a known identity published those exact pack bytes.
      Generate the ML-BOM, hash-check it, then sign the pack
      (https://blog.saintmalik.me/from-signing-containers-to-signing-models/).
  - question: "Is an AIBOM the same as an ML-BOM?"
    answer: >-
      No. ML-BOM is the promote artifact tree. AIBOM is the runtime call
      inventory (local tags, Modelfiles, cloud model IDs). You usually need
      both. Software SBOM is the third doc for package CVEs.
  - question: "Why not just sign sbom.json?"
    answer: >-
      Because the runtime loads the weights tree (or ModelKit), not the BOM
      file. A signature on the inventory document does not bind the bytes the
      deserializer touches. Sign the pack. Keep Software SBOM, ML-BOM, and
      AIBOM as inventory gates.
  - question: "Where do lineage and provenance fit?"
    answer: >-
      pedigree.ancestors and Hub base_model are claims until parent digests
      appear in a signed attestation. Provenance (actions/attest@v4 on export,
      gh attestation verify on promote) is the build record. Both are covered
      in the signing post
      (https://blog.saintmalik.me/from-signing-containers-to-signing-models/).
      This post only records the claim in the ML-BOM so promote CI can see it.
---

import Giscus from "@giscus/react";
import Figure from '../src/components/Figure';

You already generate an SBOM for apps and container images. An AI system still leaves two blind spots. The weight pack on disk is not a PyPI graph. The model string your agent actually calls often never appears in `pip freeze` either.

I treat that as **three inventories**, not one mash-up JSON:

1. **Software SBOM**: train/serve packages (`cyclonedx-py` / Syft) → Grype
2. **ML-BOM**: CycloneDX `machine-learning-model` for the pack on disk (weights, hashes, pedigree) → hash-check
3. **AIBOM**: what the running system calls: local tags, Modelfiles, cloud model IDs in config

Signing the pack and attesting the train job are separate controls. Those live in [From signing containers to signing models](/from-signing-containers-to-signing-models/). Do not treat this as a second signing tutorial.

Related:

- [From signing containers to signing models](/from-signing-containers-to-signing-models/)
- [SBOM generation is not enough](/sbom-supply-chain-beyond-generation/)
- [Container image SBOM blind spots](/container-image-sbom-blind-spots/)

<!--truncate-->

## Three inventories, not one BOM

| Inventory | Question | What you put in it | How you produce it | Gate |
| --- | --- | --- | --- | --- |
| **Software SBOM** | Which packages sit next to the model? | PyPI / OS / image deps in the train or serve env | `cyclonedx-py` or Syft | Grype (`--fail-on high`) |
| **ML-BOM** | Which files am I shipping? | Weights, config, tokenizer, adapters, pedigree claims | Hand-authored CycloneDX `machine-learning-model` + file SHA-256 | `jq` + `shasum` vs disk |
| **AIBOM** | Which models does prod code actually call? | Ollama tags, Modelfile base + prompt hash, cloud endpoint / model IDs | Hand-curated YAML + `jq` / `shasum` / `ollama show` when calls change | Stale digest / missing local tag |

`pip freeze` covers the first row. A weight-directory scan covers the second if you write the hashes. Neither sees `MODEL_ID=gpt-4o-mini` in config, a custom Ollama Modelfile, or a cloud tag your agent loops on. That is the AIBOM row.

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/sbom-for-models-three-inventories.webp" />
  <source type="image/png" srcSet="/bgimg/sbom-for-models-three-inventories.png" />
  <img src="/bgimg/sbom-for-models-three-inventories.png" alt="Three inventories: Software SBOM for train and serve packages via cyclonedx-py or Syft into Grype; ML-BOM for the pack on disk with CycloneDX machine-learning-model hashes; AIBOM for runtime model calls including Ollama tags, Modelfiles, and cloud model IDs." />
</picture>
<p>Software SBOM ≠ ML-BOM ≠ AIBOM. Miss one and you are blind somewhere.</p>
</Figure>

## Signing vs provenance vs lineage vs inventory

Same table as the [signing post](/from-signing-containers-to-signing-models/). This article only executes the inventory row end to end (all three docs).

| Control | Question it answers | Format | Tooling | What it does **not** prove |
| --- | --- | --- | --- | --- |
| **Model signing** | Who published these exact files? | Sigstore bundle over per-file hashes (or Cosign on an OCI ModelKit) | OpenSSF `model-signing`, Cosign + KitOps. [Signing post](/from-signing-containers-to-signing-models/) | That the model is benign |
| **Build provenance** | Which source, inputs, and builder produced it? | in-toto / SLSA provenance | `actions/attest@v4` (produce), `gh attestation verify` (consume) | That the training data or code was trustworthy |
| **Lineage metadata** | Which base model was it derived from? | Model card `base_model` / `datasets`, or CycloneDX `pedigree.ancestors` | Hub model card, ML-BOM pedigree | That the claim is true until digests appear in a signed attestation |
| **Inventory** | Which packages, pack files, and runtime model calls make up the system? | Software SBOM + ML-BOM + AIBOM | `cyclonedx-py` / Syft + Grype, hand ML-BOM + `jq`/`shasum`, hand AIBOM YAML + CLI digests. **This post.** | File integrity. Do **not** sign `sbom.json` as the integrity control. Sign the pack |

Inventory answers "what am I looking at." Signing answers "untampered since publish." Provenance answers "built how." Lineage without digests is a claim. A production promote path needs all of them at different points.

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/sbom-for-models-three-layers.webp" />
  <source type="image/png" srcSet="/bgimg/sbom-for-models-three-layers.png" />
  <img src="/bgimg/sbom-for-models-three-layers.png" alt="One AI system fans into three jobs: inventory with Software SBOM, ML-BOM, and AIBOM; integrity with OpenSSF model-signing or Cosign plus KitOps; attestation with SLSA or in-toto. Do not mash them into one JSON file." />
</picture>
<p>Same system. Inventory here. Integrity and attestation in the <a href="/from-signing-containers-to-signing-models/">signing post</a>. Do not mash them into one JSON file.</p>
</Figure>

## Why the model is the attack surface

Short version. Full framing is in the [signing post](/from-signing-containers-to-signing-models/).

A checkpoint is not inert data. Pickle-style deserialization can run code. In February 2025, [ReversingLabs](https://www.reversinglabs.com/blog/rl-identifies-malware-ml-model-hosted-on-hugging-face) documented Hub models with reverse-shell payloads (nullifAI) that evaded `picklescan` while still executing on load. The surface also includes retrieval (typosquat, hijacked account), conversion / quantization steps, and loader deps / `trust_remote_code=True`.

Inventory does not stop those. It makes the pack, the serve env, and the runtime call graph inspectable before you promote. Signing and provenance sit on top. Prefer `safetensors`. Treat remote code as a review gate.

## Prerequisites

- A staged model directory you are about to promote (sample uses a small Hub checkpoint so the commands stay copy-pasteable)
- Python 3.9+ and a venv that matches train or serve (for the Software SBOM)
- `cyclonedx-bom` (`cyclonedx-py`) and/or `syft`
- `grype`
- `jq`
- Optional: `huggingface_hub` only to fetch the sample pack
- Optional: `ollama` if your stack serves local tags / Modelfiles (for AIBOM evidence refresh)

```shell-session
$ export PROMOTE_ROOT="${PROMOTE_ROOT:-$PWD/artifacts/promote}"
```

```shell-session
$ mkdir -p "$PROMOTE_ROOT/models" "$PROMOTE_ROOT/bom" "$PROMOTE_ROOT/aibom"
```

Serve venv for the Software SBOM path. Install `syft` / `grype` once on the runner or laptop.

```shell-session
$ python3 -m venv "$PROMOTE_ROOT/serve-venv"
```

```shell-session
$ source "$PROMOTE_ROOT/serve-venv/bin/activate"
```

```shell-session
$ pip install 'cyclonedx-bom' 'huggingface_hub'
```

```shell-session
$ syft version
```

```shell-session
$ grype version
```

## Software SBOM: train/serve packages → Grype

The pack is one artifact. The Python env (or serve image) that loads it is another. Inventory that for CVEs. Do not expect a scan of the weight directory to invent the PyPI graph.

Use the real train/serve venv or image. Sample installs torch so Grype has a package graph.

```shell-session
$ source "$PROMOTE_ROOT/serve-venv/bin/activate"
```

```shell-session
$ pip install 'torch==2.9.0' --index-url https://download.pytorch.org/whl/cpu
```

```shell-session
$ cyclonedx-py environment --sv 1.6 --of JSON \
  -o "$PROMOTE_ROOT/bom/serve-env.cdx.json"
```

```shell-session
$ jq -r '.components[] | select(.name=="torch") | "\(.name)@\(.version) \(.purl)"' \
  "$PROMOTE_ROOT/bom/serve-env.cdx.json"
torch@2.9.0 pkg:pypi/torch@2.9.0
```

Syft alternative on `site-packages` (prefer Python catalogers or you drown in file rows):

```shell-session
$ syft dir:"$PROMOTE_ROOT/serve-venv/lib" \
  --select-catalogers python \
  -o cyclonedx-json="$PROMOTE_ROOT/bom/serve-env.syft.cdx.json"
```

Prefer the image digest you actually ship when serve is containerized:

```shell-session
$ syft your-registry/serve-image@sha256:... \
  -o cyclonedx-json=serve-env.cdx.json
```

Point Grype at the Software SBOM, not the weight directory. CI gate shape adds `--fail-on high`.

```shell-session
$ grype sbom:"$PROMOTE_ROOT/bom/serve-env.cdx.json" -o table
```

Re-run when the vuln DB moves, not only when you re-export the pack. Same habit as [SBOM beyond generation](/sbom-supply-chain-beyond-generation/).

System binaries outside the package manager (`ffmpeg`, OCR, a host Ollama install) are a known gap on bare metal. Pin them in the Dockerfile or record version pins next to the Software SBOM. Do not pretend `cyclonedx-py` saw them.

## ML-BOM: the pack on disk → hash-check

This is the promote loop for the files you serve. Stage them. Write a CycloneDX ML-BOM with those file hashes. Fail when hashes diverge. Then [sign the pack](/from-signing-containers-to-signing-models/), not `sbom.json`.

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/sbom-for-models-how-you-do-it.webp" />
  <source type="image/png" srcSet="/bgimg/sbom-for-models-how-you-do-it.png" />
  <img src="/bgimg/sbom-for-models-how-you-do-it.png" alt="Ordered promote steps: Software SBOM and Grype on the serve env, stage pack and write CycloneDX ML-BOM with hashes, hash-check gate, AIBOM evidence refresh, promote then sign the pack. Fail closed on High, mismatch, or stale AIBOM." />
</picture>
<p>Software SBOM → Grype → ML-BOM → hash-check → AIBOM evidence refresh → promote, then sign the pack. High, mismatch, or stale AIBOM stops the job.</p>
</Figure>

### 1. Export and stage the model pack

Copy only the files the runtime will load. No Hub `.cache/`, no training checkpoints you will not serve.

Sample pack: [`prajjwal1/bert-tiny`](https://huggingface.co/prajjwal1/bert-tiny) (config, vocab, ~17MB `pytorch_model.bin`). Same shape as the [signing post](/from-signing-containers-to-signing-models/). Replace with your real export path.

```shell-session
$ source "$PROMOTE_ROOT/serve-venv/bin/activate"
```

```shell-session
$ MODEL_DIR="$PROMOTE_ROOT/models/bert-tiny"
```

```shell-session
$ mkdir -p "$MODEL_DIR"
```

```shell-session
$ hf download prajjwal1/bert-tiny --local-dir "$PROMOTE_ROOT/models/bert-tiny-hub"
```

```shell-session
$ cp "$PROMOTE_ROOT/models/bert-tiny-hub/config.json" \
  "$PROMOTE_ROOT/models/bert-tiny-hub/pytorch_model.bin" \
  "$PROMOTE_ROOT/models/bert-tiny-hub/vocab.txt" \
  "$MODEL_DIR/"
```

If you load LoRA / adapters / control vectors at serve time, copy them here too. If they are not in this tree, they will not be in the ML-BOM or the hash gate.

```shell-session
$ shasum -a 256 "$MODEL_DIR"/*
cf3179684f7c360dd6185962d480e7d426ceb8fe49f5db7b64bdc15dba0b8798  config.json
dab2c2bddcfb48ea430ef63fd76d46d67d704487844d967256a50dd7d7fd0a66  pytorch_model.bin
07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3  vocab.txt
```

### 2. Write the CycloneDX ML-BOM (with file hashes)

Point Syft or `cdxgen -t ai` at a classic `.bin` tree if you want. On current releases they often emit an empty component list. Do not wait for generators. Hand-author the `machine-learning-model` document with real SHA-256 values from disk. Keep `modelCard` short.

Minimum useful set:

1. Model component: `type: machine-learning-model`, name, version/revision, purl when you have one
2. File components: every weight shard / config / tokenizer / adapter you will load, each with SHA-256
3. Base model: `pedigree.ancestors` for a fine-tune
4. Datasets: `type: data` refs you are willing to claim
5. Short `modelCard.modelParameters` / `considerations`

```shell-session
$ WEIGHT=$(shasum -a 256 "$MODEL_DIR/pytorch_model.bin" | awk '{print $1}')
```

```shell-session
$ CONFIG=$(shasum -a 256 "$MODEL_DIR/config.json" | awk '{print $1}')
```

```shell-session
$ VOCAB=$(shasum -a 256 "$MODEL_DIR/vocab.txt" | awk '{print $1}')
```

```shell-session
$ BOM="$PROMOTE_ROOT/bom/bert-tiny.mlbom.cdx.json"
```

Copy and adapt:

```json
{
  "$schema": "http://cyclonedx.org/schema/bom-1.6.schema.json",
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "serialNumber": "urn:uuid:5422de9f-0b5f-4eba-b739-a1911655612b",
  "version": 1,
  "metadata": {
    "component": {
      "type": "machine-learning-model",
      "bom-ref": "pkg:huggingface/prajjwal1/bert-tiny@local",
      "name": "bert-tiny",
      "version": "local",
      "purl": "pkg:huggingface/prajjwal1/bert-tiny",
      "hashes": [
        {
          "alg": "SHA-256",
          "content": "dab2c2bddcfb48ea430ef63fd76d46d67d704487844d967256a50dd7d7fd0a66"
        }
      ],
      "modelCard": {
        "modelParameters": {
          "approach": { "type": "supervised" },
          "task": "fill-mask",
          "architectureFamily": "transformer",
          "modelArchitecture": "BertForMaskedLM",
          "datasets": [{ "ref": "data-bookcorpus-wikipedia" }],
          "inputs": [{ "format": "string" }],
          "outputs": [{ "format": "string" }]
        },
        "considerations": {
          "useCases": ["Small encoder for promote-pipeline inventory"],
          "technicalLimitations": ["Tiny parameter count. Swap for your production pack."]
        }
      }
    }
  },
  "components": [
    {
      "type": "file",
      "bom-ref": "file-pytorch_model.bin",
      "name": "pytorch_model.bin",
      "hashes": [{ "alg": "SHA-256", "content": "dab2c2bddcfb48ea430ef63fd76d46d67d704487844d967256a50dd7d7fd0a66" }]
    },
    {
      "type": "file",
      "bom-ref": "file-config.json",
      "name": "config.json",
      "hashes": [{ "alg": "SHA-256", "content": "cf3179684f7c360dd6185962d480e7d426ceb8fe49f5db7b64bdc15dba0b8798" }]
    },
    {
      "type": "file",
      "bom-ref": "file-vocab.txt",
      "name": "vocab.txt",
      "hashes": [{ "alg": "SHA-256", "content": "07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3" }]
    },
    {
      "type": "data",
      "bom-ref": "data-bookcorpus-wikipedia",
      "name": "BookCorpus + English Wikipedia (as declared by the model card)",
      "data": [{
        "type": "dataset",
        "classification": "public",
        "governance": {
          "owners": ["As declared on the upstream model card"]
        }
      }]
    }
  ],
  "dependencies": [
    {
      "ref": "pkg:huggingface/prajjwal1/bert-tiny@local",
      "dependsOn": [
        "file-pytorch_model.bin",
        "file-config.json",
        "file-vocab.txt",
        "data-bookcorpus-wikipedia"
      ]
    }
  ]
}
```

Write that JSON to `$BOM`. Substitute the three digests from `shasum` when your pack differs. For a fine-tune, add pedigree on the model component:

```json
"pedigree": {
  "ancestors": [
    {
      "type": "machine-learning-model",
      "name": "bert-base-uncased",
      "version": "<pinned-revision>",
      "purl": "pkg:huggingface/google-bert/bert-base-uncased@<pinned-revision>"
    }
  ]
}
```

That pedigree line is a lineage **claim**. Same as Hub `base_model`. Integrity of the exported pack is still [sign the directory](/from-signing-containers-to-signing-models/). Digests in a signed attestation are what turn the claim into evidence.

Spec refs: [CycloneDX AI models](https://cyclonedx.org/use-cases/ai-models-and-model-cards/), [ML-BOM](https://www.cyclonedx.org/capabilities/mlbom/). SPDX 3.0 AI profiles exist; generator/consumer maturity for day-to-day promote CI is thinner. Stay on CycloneDX unless compliance forces SPDX.

### 3. Hash-check gate (fail closed)

BOM digests must match the files you are about to promote. Exit non-zero on drift.

There is no mature marketplace Action that hash-checks a hand-authored CycloneDX `machine-learning-model` BOM against a pack tree. `cyclonedx-cli validate` is schema only. Syft catalogs packages; it does not enforce your ML-BOM file hashes. Use `jq` + `shasum` (or `sha256sum`) against the BOM you already wrote.

```shell-session
$ ok=0
```

```shell-session
$ while IFS=$'\t' read -r name expected; do
    path="$MODEL_DIR/$name"
    if [ ! -f "$path" ]; then
      echo "$name: MISSING"; ok=1; continue
    fi
    actual=$(shasum -a 256 "$path" | awk '{print $1}')
    if [ "$actual" = "$expected" ]; then
      echo "$name: OK"
    else
      echo "$name: MISMATCH"; ok=1
    fi
  done < <(jq -r '.components[] | select(.type=="file") | [.name, .hashes[0].content] | @tsv' "$BOM")
pytorch_model.bin: OK
config.json: OK
vocab.txt: OK
```

```shell-session
$ exit "$ok"
```

### Tamper / fail case

Flip one weight byte. The hash gate must fail.

```shell-session
$ python3 - <<PY
from pathlib import Path
p = Path("$MODEL_DIR/pytorch_model.bin")
b = bytearray(p.read_bytes()); b[0] ^= 0x01; p.write_bytes(b)
print("flipped first byte of pytorch_model.bin")
PY
flipped first byte of pytorch_model.bin
```

```shell-session
$ ok=0
```

```shell-session
$ while IFS=$'\t' read -r name expected; do
    path="$MODEL_DIR/$name"
    actual=$(shasum -a 256 "$path" | awk '{print $1}')
    if [ "$actual" = "$expected" ]; then echo "$name: OK"
    else echo "$name: MISMATCH"; ok=1; fi
  done < <(jq -r '.components[] | select(.type=="file") | [.name, .hashes[0].content] | @tsv' "$BOM")
pytorch_model.bin: MISMATCH
config.json: OK
vocab.txt: OK
```

```shell-session
$ echo "exit=$ok"
exit=1
```

Restore from the staged Hub copy (or your real export) before you promote. Same fail-closed instinct as `model_signing verify` after a bitflip.

## AIBOM: what the running system actually calls

The Software SBOM tells you `ollama` the Python client is installed. The ML-BOM tells you which weight files you promoted. Neither tells you that `services/agent.py` calls `support-bot` (a custom Modelfile) on every ticket, or that a stuck-loop retries against a cloud model ID that never appears in any lockfile.

That gap is the AIBOM. Hand-curate it. Gate digests and prompt hashes so the committed inventory cannot drift from prod. New call sites land in review when the YAML is stale.

### What belongs in the AIBOM

Three rows show up in every company stack I have audited:

1. **Local model tags**: Ollama (or vLLM / TGI) names the runtime loads
2. **Custom Modelfiles**: base model + baked system prompt + sampling overrides. The effective identity is both halves
3. **Cloud endpoints / model IDs**: strings in config or env (`gpt-4o-mini`, `claude-sonnet-4-20250514`, vendor `:cloud` tags) that never appear in `pip freeze`

Prompts, tool manifests, and MCP configs that travel with the agent belong here too when they shape every call. If it changes behavior and is not a package hash, it is an AIBOM row.

### Company-shaped inventory (commit this)

Keep it boring YAML next to the service. Commit something like `aibom/support-agent.aibom.yaml`. Markdown tables are fine for humans; YAML is what `jq` can gate.

```yaml
# aibom/support-agent.aibom.yaml
service: support-agent
owner: platform
updated: 2026-11-12
models:
  - role: primary-chat
    call_site: services/agent.py
    id: support-bot
    kind: ollama-modelfile
    prompt_path: prompts/support-bot.system.txt
    prompt_sha256: "<shasum -a 256 of that file>"
    base_digest: "<from ollama show of the FROM model>"
  - role: fallback-chat
    call_site: services/agent.py
    id: qwen2.5:14b
    kind: ollama-tag
    digest: "<from ollama show>"
  - role: embeddings
    call_site: services/retrieve.py
    id: text-embedding-3-small
    kind: cloud-api
    pinned: false
  - role: judge-eval
    call_site: evals/run.py
    id: atla-judge:8b
    kind: ollama-tag
    digest: "<from ollama show>"
```

For each Modelfile row, record both halves: base digest and `sha256` of the system prompt. Change either and bump the AIBOM. Only the base shows in `ollama list`.

Cloud rows are name-only today. Providers rarely give you a content-addressed pin. Mark them `pinned: false`. Log model name + timestamp on every cloud call. Prefer advisory roles for unpinned cloud models when the loop can write code or accept/reject changes.

### Refresh AIBOM evidence when model calls change

When prod picks up a new Ollama tag, Modelfile or SYSTEM prompt, cloud model ID, or call site, I refresh the committed YAML (digests, prompt hashes, call-site list) so the inventory matches what the running system actually invokes. Until that file is updated, treat it as stale.

```shell-session
$ AIBOM="$PROMOTE_ROOT/aibom/support-agent.aibom.yaml"
```

```shell-session
$ ollama list
```

```shell-session
$ ollama show support-bot
```

```shell-session
$ ollama show qwen2.5:14b
```

```shell-session
$ shasum -a 256 prompts/support-bot.system.txt
```

```shell-session
$ rg -n -e 'MODEL[_A-Z]*\s*=' -e 'model\s*=' -e 'openai|anthropic|ollama\.chat|ChatCompletion' \
  services/ evals/ config/ || true
```

Order: local tags, digests for each claimed tag, Modelfile prompt hash, then a human pass over call sites that never show up in `pip freeze`. I treat `rg` as a refresh aid, not a productized static analyzer.

Gate digests with the CLIs you already have. No custom Python.

```shell-session
$ EXPECTED=$(jq -r '.models[] | select(.id=="support-bot") | .prompt_sha256' "$AIBOM")
```

```shell-session
$ ACTUAL=$(shasum -a 256 prompts/support-bot.system.txt | awk '{print $1}')
```

```shell-session
$ echo "prompt expected=$EXPECTED actual=$ACTUAL"
```

```shell-session
$ [ "$ACTUAL" = "$EXPECTED" ] || { echo "prompt MISMATCH"; exit 1; }
```

```shell-session
$ echo "prompt OK"
```

Optional: confirm a local tag still exists.

```shell-session
$ ollama list | grep -F "qwen2.5:14b" >/dev/null
```

Fail CI when:

- An AIBOM local identifier is missing from `ollama list`
- A recorded Modelfile prompt hash no longer matches the file on disk
- Someone landed a new model string in `services/` / `config/` and forgot to update the YAML (catch in review; I do not ship a DIY regex "callsite linter" as the control)

There is no mature one-button marketplace Action for that call-site / Modelfile / cloud-ID gate. Hub-metadata "AI BOM" Actions inventory Hugging Face cards. That is a different job from gating your runtime call graph. Early research scanners exist for some Hub call shapes. They are not company-grade Ollama + Modelfile + cloud inventory yet. Commit the YAML. Verify digests with `shasum` / `ollama show` / `jq`. If you want one promote step, wrap those CLIs in a thin org composite Action. Do not invent a 70-line static-analysis toy.

There is no mature `cyclonedx-py`-for-Ollama that emits a complete AIBOM either. CycloneDX ML-BOM fields still help when a local pack is also a promote artifact. For runtime call graphs, hand curation plus CLI digest checks is the path I actually run today.

### AIBOM vs ML-BOM (do not collapse them)

| | **ML-BOM** | **AIBOM** |
| --- | --- | --- |
| Object | Files on disk you are about to promote | Names / endpoints the process invokes |
| Hash story | SHA-256 of weights / config | Digest of local tag or Modelfile prompt; cloud often unpinned |
| Generator | Hand CycloneDX (generators still thin) | Hand YAML + `ollama` / `shasum` / `jq` |
| Missed by | Empty Syft on a `.bin` tree | Entirely invisible to Software SBOM |

A fine-tune you export as safetensors is an ML-BOM row. The same weights pulled into Ollama and wrapped with a system prompt become an AIBOM Modelfile row on top. Both can be true for one product.

## Promote, then sign the pack (not `sbom.json`)

Only after Software SBOM Grype, ML-BOM hash-check, and AIBOM evidence checks pass do you promote. Integrity of the bytes is [OpenSSF model-signing or Cosign + KitOps](/from-signing-containers-to-signing-models/). Wire that in the same promote job **after** this gate. Verify against a pinned workflow identity and issuer, not "any signer." Do not treat a signature on `sbom.json` as a substitute for signing the weights tree.

### Attest the pack on export, verify on promote

Provenance is separate from these BOMs. Same wiring as the [signing post](/from-signing-containers-to-signing-models/).

**Produce** with GitHub's Action. Prefer [`actions/attest@v4`](https://github.com/actions/attest) for new workflows. [`actions/attest-build-provenance`](https://github.com/actions/attest-build-provenance) is the older wrapper on the same stack. Attest the exported pack files in the export job. That path is real for model files you build in Actions. Container / ModelKit signing with Cosign lives in the signing post.

```yaml title="export job (produce)"
permissions:
  id-token: write
  contents: read
  attestations: write
steps:
  # ... export pack into artifacts/promote/models/bert-tiny/ ...
  - name: Attest exported pack
    uses: actions/attest@v4
    with:
      subject-path: 'artifacts/promote/models/bert-tiny/*'
```

**Consume** with the official verify path: [`gh attestation verify`](https://cli.github.com/manual/gh_attestation_verify). GitHub documents the CLI for binaries and file subjects. There is no first-party `actions/attest-verify` Marketplace Action. Pin `--repo` and `--signer-workflow` on the promote gate.

```yaml title="promote job (consume)"
permissions:
  contents: read
  attestations: read
steps:
  - name: Verify pack attestation
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    run: |
      gh attestation verify artifacts/promote/models/bert-tiny/pytorch_model.bin \
        --repo my-org/model-training \
        --signer-workflow my-org/model-training/.github/workflows/export.yml
```

Model-file attestation via GitHub Attestations is usable when the export runs in Actions and you gate promote on that verify. It is not a substitute for Cosign on an OCI ModelKit when admit already speaks digests in a registry. Use both controls where each fits. Full signing detail stays in the [signing post](/from-signing-containers-to-signing-models/).

### Wire it into the promote pipeline

Reuse the Anchore Actions you already trust for software SBOM. Do not curl-install Syft and Grype in every workflow when the maintained Actions cover that path.

| Gate | Tooling | What exists today |
| --- | --- | --- |
| Software SBOM → Grype | [`anchore/sbom-action`](https://github.com/anchore/sbom-action) (Syft) + [`anchore/scan-action`](https://github.com/anchore/scan-action) (Grype) | Official, company-usable. Prefer image digest or serve path. |
| ML-BOM hash-check | Hand CycloneDX + `jq` + `shasum` | No mature marketplace Action that hash-checks a hand-authored `machine-learning-model` BOM against a pack tree. `cyclonedx-cli validate` is schema only. |
| AIBOM evidence | Committed YAML + `jq` / `shasum` / `ollama show` | No mature marketplace Action for call-site / Modelfile / cloud-ID gates. Hub-metadata Actions are a different job. |
| Pack provenance | [`actions/attest@v4`](https://github.com/actions/attest) produce; `gh attestation verify` consume | Official GitHub path. Verify is CLI-first. |

Optional: wrap the `jq` / `shasum` / `ollama` checks behind one thin org composite (`.github/actions/ml-inventory-gates`) so promote workflows call one step. The composite is yours until a vendor ships the gate. Do not grow a folder of one-off Python checkers.

```yaml title=".github/workflows/promote-model-inventory.yml"
name: promote-model-inventory
on:
  workflow_dispatch:
  push:
    paths:
      - "models/**"
      - "aibom/**"
      - "prompts/**"
      - "services/**"
      - "config/**"
      - ".github/workflows/promote-model-inventory.yml"

permissions:
  contents: read
  attestations: read

jobs:
  bom-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Software SBOM (Syft)
        uses: anchore/sbom-action@v0
        with:
          # Prefer the serve image digest you actually ship:
          # image: your-registry/serve-image@sha256:...
          path: models/serve-venv
          format: cyclonedx-json
          output-file: serve-env.cdx.json
          upload-artifact: false

      - name: Vuln scan Software SBOM (Grype)
        uses: anchore/scan-action@v7
        with:
          sbom: serve-env.cdx.json
          fail-build: true
          severity-cutoff: high
          output-format: table

      - name: Stage exported pack
        run: |
          # Replace with your real export step.
          # Output must land in models/<name>/ with only files you will serve.
          test -d models/bert-tiny

      - name: ML-BOM hash-check
        run: |
          BOM=models/bert-tiny.mlbom.cdx.json
          MODEL_DIR=models/bert-tiny
          ok=0
          while IFS=$'\t' read -r name expected; do
            path="$MODEL_DIR/$name"
            if [ ! -f "$path" ]; then echo "$name: MISSING"; ok=1; continue; fi
            actual=$(shasum -a 256 "$path" | awk '{print $1}')
            if [ "$actual" = "$expected" ]; then echo "$name: OK"
            else echo "$name: MISMATCH"; ok=1; fi
          done < <(jq -r '.components[] | select(.type=="file") | [.name, .hashes[0].content] | @tsv' "$BOM")
          exit "$ok"

      - name: AIBOM prompt digest
        run: |
          AIBOM=aibom/support-agent.aibom.yaml
          EXPECTED=$(jq -r '.models[] | select(.id=="support-bot") | .prompt_sha256' "$AIBOM")
          ACTUAL=$(shasum -a 256 prompts/support-bot.system.txt | awk '{print $1}')
          echo "prompt expected=$EXPECTED actual=$ACTUAL"
          [ "$ACTUAL" = "$EXPECTED" ]

      - name: Verify pack attestation
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh attestation verify models/bert-tiny/pytorch_model.bin \
            --repo my-org/model-training \
            --signer-workflow my-org/model-training/.github/workflows/export.yml

      # Promote only when Software SBOM, ML-BOM, AIBOM, and attestation gates pass.
      # Next step in the same job: model_signing / KitOps + Cosign on the pack.
      # Do not sign sbom.json and call that integrity.
```

When you intentionally refresh digests after a real re-export, re-hash the staged tree and update the ML-BOM file hashes before you commit:

```shell-session
$ shasum -a 256 models/bert-tiny/*
```

Reuse Grype via `anchore/scan-action` for the env SBOM. Hash-check and AIBOM stay CLI gates (`jq` / `shasum` / `ollama`) until a vendor ships one that matches this shape.

## How the layers compose

Same stack as the [signing post](/from-signing-containers-to-signing-models/). This post is the inventory deep dive.

1. **Format hygiene.** Prefer `safetensors`. Review `trust_remote_code=True`.
2. **Scanning.** picklescan / ModelScan as a fast filter. Evadable (nullifAI).
3. **Signature verify at boundaries.** Pin identity + issuer. [Signing post](/from-signing-containers-to-signing-models/).
4. **Provenance.** `actions/attest@v4` on export, `gh attestation verify` on promote for packs you build.
5. **Inventory (this post).** Software SBOM + Grype, ML-BOM + `jq`/`shasum`, AIBOM YAML + CLI digests. Then sign the pack.
6. **Isolation.** Least privilege at load time as the assume-failure backstop.

### Limits I accept

1. **BOM without a gate is not a control.** Generate, hash-check, scan, refresh AIBOM evidence, then promote.
2. **BOM ≠ training was clean.** Dataset refs and `pedigree.ancestors` are claims until a signed build record backs them.
3. **Generators are uneven.** Empty Syft/cdxgen on a classic `.bin` pack is normal. Hand-author ML-BOM file hashes. Generate the Software SBOM. Hand-curate the AIBOM. Move on.
4. **Hashes miss what never lands in the pack.** [evil Qwen](https://jimbobbennett.dev/blogs/evil-qwen/) is the short reminder: LoRA adapters, steering hooks, and control vectors can change behavior while base weight digests stay identical. If the runtime loads them, put them in the ML-BOM stage and hash gate. A hook in your own serve wrapper will not show up in the ML-BOM at all. Put the wrapper / Modelfile / prompt in the AIBOM. Behavior still needs evals.
5. **Cloud model IDs are often unpinned.** The AIBOM surfaces them. It does not give you a content hash the provider refuses to publish. Log calls. Cap blast radius.
6. **Agents.** Prompts, tool manifests, MCP configs that travel with the model belong in the AIBOM (and in the signed pack when they ship as files).

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
