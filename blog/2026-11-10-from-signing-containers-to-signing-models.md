---
slug: from-signing-containers-to-signing-models
title: "From signing containers to signing models"
authors: Abdulmalik
date: 2026-11-10
image: /bgimg/from-signing-containers-to-signing-models-cover.webp
tags: [ai-security, mlsecops, agents, devsecops, supply-chain, cosign, appsec, security]
keywords:
  - model signing
  - OpenSSF model-signing
  - Sigstore model-transparency
  - KitOps cosign
  - MLSecOps
  - model provenance
  - DevSecOps to AI security
description: "Sign model directories the way you sign containers: OpenSSF model-signing locally, then KitOps + Cosign keyless in GitHub Actions."
faq:
  - question: "What is the difference between provenance and lineage?"
    answer: >-
      Lineage is the family tree: which base a fine-tune, adapter, or
      quantization descends from. Provenance is the signed build record:
      source, inputs, builder, and output digests. Lineage becomes evidence
      when each hop's parent appears by digest in a signed attestation, not
      only as a model-card string.
  - question: "Do I need Sigstore to sign a model?"
    answer: >-
      No. Sigstore keyless is the default in OpenSSF model-signing, but the
      same tool signs with your own key pair, X.509, or PKCS#11. Cosign +
      KitOps is the OCI path if admit already verifies registry digests.
      Trade-off is key custody versus short-lived OIDC certs.
  - question: "Do I need an SBOM or ML-BOM to sign a model?"
    answer: >-
      No. Signing is integrity of the artifact: a known identity published
      these exact bytes. An SBOM or ML-BOM is optional inventory of what you
      think you are shipping. Useful next to signing. Not a prerequisite.
  - question: "Does a valid signature mean the model is safe?"
    answer: >-
      No. A signature proves authenticity of the hashed files and possession
      of the key or OIDC identity. A publisher can still sign a backdoored
      pack. Prefer safetensors, pin the expected identity, and verify at
      every boundary before the deserializer runs.
  - question: "OpenSSF model-signing or Cosign + KitOps?"
    answer: >-
      Use Cosign on a ModelKit when admit already verifies an OCI reference.
      Use model_signing when admit verifies a directory the runtime loads
      from disk. Same habit either way: pin identity, fail closed on mismatch.
---

import Giscus from "@giscus/react";
import Figure from '../src/components/Figure';

I already know how to sign containers. Key-based Cosign, keyless OIDC, AWS Signer + Notation without public Rekor. That still applies when the artifact is a model directory. What changed is the shape of the thing I hash.

Signing answers one question: are these the exact bytes a known identity published? That is integrity of the artifact. It does not answer how the model was built, which base it came from, or what packages sit next to it at serve time. Those are separate controls. You do not need an SBOM, ML-BOM, or AIBOM to sign. Inventory is optional and adjacent if you want a bill of materials later. This post owns signing end to end, then shows provenance in CI.

Related:

- [Sign container images with Cosign (key-based)](/signing-container-images-for-trust-assurance/)
- [Cosign keyless signing with GitHub Actions OIDC](/keyless-signing-container-images-github-oidc/)
- [AWS Signer + Notation (no public Rekor)](/iac-security-with-state-file-aws-signerion/)

<!--truncate-->

## Signing vs provenance vs lineage

Same separation in one table. Do not mash them into one JSON file.

| Control | Question it answers | Format | Tooling | What it does **not** prove |
| --- | --- | --- | --- | --- |
| **Model signing** | Who published these exact files? | Sigstore bundle over a manifest of per-file hashes (or Cosign on an OCI ModelKit) | OpenSSF [`model-signing`](https://github.com/sigstore/model-transparency), Cosign + [KitOps](https://kitops.org/docs/security/) | That the model is benign |
| **Build provenance** | Which source, inputs, and builder produced it? | in-toto statement, predicate `https://slsa.dev/provenance/v1` | `actions/attest`, `gh attestation verify` | That the training data or code was trustworthy |
| **Lineage metadata** | Which base model was it derived from? | Model card YAML (`base_model`, `datasets`), or a pedigree claim in inventory | Hub model card, optional BOM pedigree | That the claim is true. The uploader declares it until digests appear in a signed attestation |

Signing and provenance compose: the signature covers a manifest of file digests, and the SLSA attestation lists the same files as subjects. Check both and you know the bytes are what a trusted identity published and the output of a build you can inspect. Lineage without digests is a claim.

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/from-signing-containers-to-signing-models-map.webp" />
  <source type="image/png" srcSet="/bgimg/from-signing-containers-to-signing-models-map.png" />
  <img src="/bgimg/from-signing-containers-to-signing-models-map.png" alt="Side by side: container build digest Cosign registry verify before admit, versus model pack export or OCI ModelKit model-signing or Cosign registry verify before serve. Same skills linked in the middle. Differs: single digest vs multi-file tree, and a signature does not prove clean training." />
</picture>
<p>Left hashes one image digest. Right hashes a model tree (or an OCI ModelKit). Signature still is not proof of clean training.</p>
</Figure>

## Why the model is the attack surface

A model file is not inert data. Classic PyTorch / pickle-style checkpoints encode opcodes that can invoke callables. `torch.load` on attacker-influenced bytes is an RCE path. Prefer `safetensors` where the ecosystem lets you.

This is not theoretical. In February 2025, [ReversingLabs](https://www.reversinglabs.com/blog/rl-identifies-malware-ml-model-hosted-on-hugging-face) documented malicious Hub models with reverse-shell payloads in serialized data. The technique, nullifAI, corrupted the stream so `picklescan` missed it while the payload still ran on deserialize. Two models, taken down after disclosure. The point is not the count. The artifact and the scanner that vets it can both be defeated by the same input. Scanning helps. It is not enough alone.

The surface is wider than the weight file:

- **Checkpoint:** deserialization RCE, or a backdoor that behaves normally except on a trigger
- **Retrieval:** typosquat, hijacked maintainer, unauthenticated download
- **Conversion / quantization:** every transform between publish and serve is a tamper window if you do not verify end to end
- **Deps / remote code:** `transformers`, `vllm`, and repo `*.py` that `trust_remote_code=True` will execute

Defense at load time is two questions: is this the artifact the publisher produced (signing), and was it produced by a process I trust (provenance). Lineage sits next to those. It does not replace them.

## Prerequisites

- Python 3.9+ with a venv
- `openssl`
- `cosign` (optional for the hash-list blob baseline and the OCI path)
- Network once, to pull the sample model

```shell-session
$ python3 -m venv /tmp/model-signing-venv
```

```shell-session
$ source /tmp/model-signing-venv/bin/activate
```

```shell-session
$ pip install 'model-signing==1.1.1' pyOpenSSL 'huggingface_hub'
```

```shell-session
$ model_signing --version
```

You already have three container paths. I am not re-pasting those workflows.

1. **Key-based Cosign:** [key-based post](/signing-container-images-for-trust-assurance/)
2. **Keyless Cosign** via GitHub Actions OIDC: [keyless post](/keyless-signing-container-images-github-oidc/)
3. **AWS Signer + Notation** when public Rekor is a non-starter: [AWS Signer post](/iac-security-with-state-file-aws-signerion/)

Same pattern: bind a signature to content, verify with a trusted key or identity, do not run when verify fails. Below does that on a model directory, then Cosign on a file-hash list blob, then GitHub Actions.

## Model signing: authenticating the artifact

OpenSSF / Sigstore [`model-signing`](https://github.com/sigstore/model-transparency) (PyPI: `model-signing`, CLI: `model_signing`) hashes every file under a model directory, signs that manifest, and re-hashes on verify. Same Sigstore family as Cosign. I use the **key** method locally so you stay offline after the one sample download. In CI, use Sigstore keyless and pin the workflow identity.

Sample pack: [`prajjwal1/bert-tiny`](https://huggingface.co/prajjwal1/bert-tiny) (~17MB). Config, WordPiece vocab, PyTorch weights. Hub is only where the sample came from.

### 1. Stage a clean tree

Hub snapshots leave a `.cache/` under `--local-dir`. Copy only the model files into a clean directory before you sign.

```shell-session
$ source /tmp/model-signing-venv/bin/activate
```

```shell-session
$ mkdir -p /tmp/model-sign-lab
```

```shell-session
$ cd /tmp/model-sign-lab
```

```shell-session
$ hf download prajjwal1/bert-tiny --local-dir /tmp/model-sign-lab/bert-tiny-hub
```

```shell-session
$ mkdir -p bert-tiny
```

```shell-session
$ cp bert-tiny-hub/{config.json,pytorch_model.bin,vocab.txt,README.md} bert-tiny/
```

```shell-session
$ chmod u+w bert-tiny/pytorch_model.bin
```

```shell-session
$ ls -la bert-tiny/
```

```shell-session
$ du -h bert-tiny/pytorch_model.bin
```

| File | Role | Size |
| --- | --- | --- |
| `config.json` | architecture / hyperparams | 285 B |
| `pytorch_model.bin` | weight checkpoint | ~17 MB |
| `vocab.txt` | tokenizer vocab | ~226 KB |
| `README.md` | model card | 2.5 KB |

No Hub CLI: `python -c 'from huggingface_hub import snapshot_download; snapshot_download("prajjwal1/bert-tiny", local_dir="...")'`.

If the runtime loads LoRA adapters, prompts, or tool schemas with the weights, put those files in this tree before you sign. What is not in the tree is not in the signature.

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/signing-models-01-layout.webp" />
  <source type="image/png" srcSet="/bgimg/signing-models-01-layout.png" />
  <img src="/bgimg/signing-models-01-layout.png" alt="hf download prajjwal1/bert-tiny then ls of real config.json pytorch_model.bin vocab.txt README.md" />
</picture>
<p>Hub pull of <code>prajjwal1/bert-tiny</code>. Clean tree under <code>/tmp/model-sign-lab/bert-tiny</code> with a 17MB <code>pytorch_model.bin</code>.</p>
</Figure>

### 2. Sign with a key pair

CLI flags on `model-signing` 1.1.1 use underscores: `--private_key`, `--public_key`. By default git-related paths are ignored (`--ignore-git-paths`).

```shell-session
$ cd /tmp/model-sign-lab
```

```shell-session
$ source /tmp/model-signing-venv/bin/activate
```

```shell-session
$ openssl ecparam -name prime256v1 -genkey -noout -out key.priv
```

```shell-session
$ openssl ec -in key.priv -pubout -out key.pub
```

```shell-session
$ model_signing sign key bert-tiny \
  --private_key key.priv \
  --signature bert-tiny.sig
Signing succeeded
```

`bert-tiny.sig` is a Sigstore-style bundle (~2KB) wrapping a DSSE / in-toto statement over the hashed model files.

### 3. Verify success

```shell-session
$ model_signing verify key bert-tiny \
  --signature bert-tiny.sig \
  --public_key key.pub
Verification succeeded
```

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/signing-models-02-sign-verify.webp" />
  <source type="image/png" srcSet="/bgimg/signing-models-02-sign-verify.png" />
  <img src="/bgimg/signing-models-02-sign-verify.png" alt="model_signing sign then verify succeeds on real bert-tiny directory" />
</picture>
<p>Sign the directory, list the <code>.sig</code>, verify with the public key.</p>
</Figure>

### 4. Bitflip a weight byte, watch verify fail

```shell-session
$ chmod u+w bert-tiny/pytorch_model.bin
```

```shell-session
$ printf X | dd of=bert-tiny/pytorch_model.bin bs=1 seek=0 conv=notrunc status=none
```

```shell-session
$ model_signing verify key bert-tiny \
  --signature bert-tiny.sig \
  --public_key key.pub
```

```shell-session
$ echo "exit=$?"
exit=1
```

Non-zero exit. Hash mismatch on `pytorch_model.bin`.

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/signing-models-03-tamper-fail.webp" />
  <source type="image/png" srcSet="/bgimg/signing-models-03-tamper-fail.png" />
  <img src="/bgimg/signing-models-03-tamper-fail.png" alt="bitflip pytorch_model.bin then model_signing verify fails with hash mismatch" />
</picture>
<p>Same signature, tampered weights: hash mismatch for <code>pytorch_model.bin</code>.</p>
</Figure>

Restore before you continue:

```shell-session
$ cp bert-tiny-hub/pytorch_model.bin bert-tiny/pytorch_model.bin
```

```shell-session
$ chmod u+w bert-tiny/pytorch_model.bin
```

```shell-session
$ model_signing verify key bert-tiny \
  --signature bert-tiny.sig \
  --public_key key.pub
```

### 5. Same habit with Cosign on a file-hash list

Cosign already signs blobs. Hash the model files into `hashes.txt`, sign that blob, verify, then flip one byte. This is still signing integrity, not an SBOM.

```shell-session
$ cd /tmp/model-sign-lab
```

```shell-session
$ cp bert-tiny-hub/pytorch_model.bin bert-tiny/pytorch_model.bin
```

```shell-session
$ chmod u+w bert-tiny/pytorch_model.bin
```

```shell-session
$ (cd bert-tiny && find . -type f | sort | while read -r f; do
  shasum -a 256 "$f"
done) > hashes.txt
```

```shell-session
$ COSIGN_PASSWORD=demo cosign generate-key-pair --output-key-prefix labcosign
```

```shell-session
$ COSIGN_PASSWORD=demo cosign sign-blob \
  --key labcosign.key \
  --bundle hashes.sigbundle \
  hashes.txt
```

```shell-session
$ cosign verify-blob \
  --key labcosign.pub \
  --bundle hashes.sigbundle \
  hashes.txt
Verified OK
```

```shell-session
$ printf X >> hashes.txt
```

```shell-session
$ cosign verify-blob \
  --key labcosign.pub \
  --bundle hashes.sigbundle \
  hashes.txt || true
```

`Verified OK` on the honest hash list. Invalid signature after the append.

<Figure>
<picture>
  <source type="image/webp" srcSet="/bgimg/signing-models-04-cosign-blob.webp" />
  <source type="image/png" srcSet="/bgimg/signing-models-04-cosign-blob.png" />
  <img src="/bgimg/signing-models-04-cosign-blob.png" alt="cosign sign-blob and verify-blob on real bert-tiny hashes then fail after append" />
</picture>
<p>Cosign on the model hash list: verify succeeds, then fails after the payload flips.</p>
</Figure>

### 6. Verify against a pinned identity, at every boundary

A valid signature proves authenticity of the hashed files and possession of the key (or OIDC identity). It does not prove the model is benign. A publisher can sign a backdoored pack.

Signing is only as strong as the identity policy. Verifying against "any signer from this org" is nearly worthless. Pin the expected releaser identity and issuer. Keep the issuer in config, not hard-coded. For GitHub Actions it is `https://token.actions.githubusercontent.com`. The identity is the signing workflow URI pinned to a git ref.

Check signatures where the artifact crosses a boundary: upload, select for deploy, consume as input to another model. A signature checked once at download and never again does not protect tampering in your own conversion pipeline.

Prefer `safetensors` even after verify, so a verification gap is not also an RCE.

### Build, sign, and promote in GitHub Actions

Local key signing is the hash check. Production still needs what you already do for containers: package in CI, sign it, do not promote when verify fails.

Training often lives on a GPU cluster. Actions should own **package + sign + promote**. Swap the stage step for "fetch the checkpoint your trainer just wrote" when you wire this for real.

| Need | Marketplace / official | What still needs shell |
| --- | --- | --- |
| KitOps CLI | [`jozu-ai/gh-kit-setup`](https://github.com/jozu-ai/gh-kit-setup) | `kit pack` / `kit push` |
| Cosign keyless | [`sigstore/cosign-installer`](https://github.com/sigstore/cosign-installer) `@v4.1.3` | `cosign sign` / `cosign verify` with pinned identity |
| Registry login | `docker/login-action` (GHCR) | none for auth |
| Stage checkpoint | No official Hub-snapshot Action for this shape | `hf download`, or copy from your trainer |
| OpenSSF `model-signing` | **No official Action yet.** CLI-first | pinned `pip install model-signing==…` + CLI |

Permissions match the [Cosign keyless post](/keyless-signing-container-images-github-oidc/): `id-token: write` for Fulcio, `contents: read` for checkout, `packages: write` when you push to GHCR.

#### KitOps + Cosign keyless (OCI admit path)

[KitOps ModelKits](https://kitops.org/docs/security/) are OCI 1.1 artifacts. Same Cosign flow as images. Use this when promote already means an OCI ref in the registry.

```yaml title=".github/workflows/build-sign-promote-model.yml"
name: build-sign-promote-model
on:
  workflow_dispatch:

env:
  MODEL_REF: ghcr.io/${{ github.repository }}/bert-tiny:ci
  # Pin the workflow URI Fulcio embeds. Same idea as containers.
  EXPECTED_IDENTITY: https://github.com/${{ github.repository }}/.github/workflows/build-sign-promote-model.yml@refs/heads/${{ github.ref_name }}

jobs:
  build-and-sign:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Stage sample model (or copy your trainer checkpoint)
        run: |
          pip install "huggingface_hub"
          mkdir -p model/hub model/bert-tiny
          hf download prajjwal1/bert-tiny --local-dir model/hub
          cp model/hub/{config.json,pytorch_model.bin,vocab.txt,README.md} model/bert-tiny/
          # If the runtime loads prompt.txt / tools.json with the weights,
          # copy them into model/bert-tiny/ here so they enter the signed ModelKit.

      - name: Kitfile
        run: |
          cat > Kitfile <<'EOF'
          manifestVersion: 1.0.0
          package:
            name: bert-tiny
            version: 0.0.1
          model:
            name: bert-tiny
            path: ./model/bert-tiny
            framework: pytorch
          EOF

      - uses: jozu-ai/gh-kit-setup@v1.0.0
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: sigstore/cosign-installer@v4.1.3

      - name: Pack, push, keyless sign
        run: |
          kit pack . -t "${MODEL_REF}"
          kit push "${MODEL_REF}"
          cosign sign --yes "${MODEL_REF}"

  promote-and-serve:
    runs-on: ubuntu-latest
    needs: build-and-sign
    permissions:
      contents: read
      packages: read
    steps:
      - uses: sigstore/cosign-installer@v4.1.3
      - name: Verify with pinned OIDC identity
        env:
          MODEL_REF: ${{ env.MODEL_REF }}
          EXPECTED_IDENTITY: ${{ env.EXPECTED_IDENTITY }}
        run: |
          cosign verify \
            --certificate-identity "${EXPECTED_IDENTITY}" \
            --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
            "${MODEL_REF}"
          echo "promote/serve gate passed"
          # kit unpack / deploy only after verify succeeds
```

Paste this workflow, hit **Run workflow**, confirm both jobs green before you trust the copy-paste.

#### OpenSSF `model-signing` (directory from disk)

Use this when the serve gate loads a directory from disk. No official marketplace Action yet, so install is one pinned pip step.

```yaml
# jobs.build-and-sign / promote-and-serve shape, artifact-based
permissions:
  id-token: write   # sign job only
  contents: read

steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-python@v5
    with:
      python-version: "3.11"
  - run: pip install "model-signing==1.1.1" pyOpenSSL "huggingface_hub"
  - run: |
      mkdir -p artifacts/hub artifacts/bert-tiny
      hf download prajjwal1/bert-tiny --local-dir artifacts/hub
      cp artifacts/hub/{config.json,pytorch_model.bin,vocab.txt,README.md} artifacts/bert-tiny/
  - run: |
      model_signing sign sigstore artifacts/bert-tiny \
        --signature artifacts/bert-tiny.sig \
        --use_ambient_credentials
  - uses: actions/upload-artifact@v4
    with:
      name: bert-tiny-signed
      path: |
        artifacts/bert-tiny
        artifacts/bert-tiny.sig

# promote job: download-artifact, same pip pin, then:
# model_signing verify sigstore artifacts/bert-tiny \
#   --signature artifacts/bert-tiny.sig \
#   --identity "${EXPECTED_IDENTITY}" \
#   --identity_provider "https://token.actions.githubusercontent.com"
```

CLI flags on `model-signing` 1.1.1 (underscores):

- Sign: `model_signing sign sigstore <dir> --signature <bundle> --use_ambient_credentials`
- Verify: `model_signing verify sigstore <dir> --signature <bundle> --identity <workflow URI> --identity_provider https://token.actions.githubusercontent.com`

Pin the workflow file path and ref you trust. Do not accept "any signature from this repo."

Offline verify after you download the artifact:

```shell-session
$ model_signing verify sigstore ./bert-tiny \
  --signature ./bert-tiny.sig \
  --identity "https://github.com/OWNER/REPO/.github/workflows/build-sign-promote-model.yml@refs/heads/main" \
  --identity_provider "https://token.actions.githubusercontent.com"
```

Use Cosign on a ModelKit when admit is already "verify this OCI reference." Use `model_signing` when admit is "verify this directory the runtime loads."

## Provenance: trusting the process, not just the publisher

Signing authenticates the artifact. Provenance authenticates how it was built. For models trained or fine-tuned in GitHub Actions, provenance is one workflow step and one verify command. GitHub artifact attestations give you SLSA Build L2-shaped provenance on hosted runners.

Lineage on a Hub model card (`base_model`, `datasets`) is the uploader's claim. It becomes evidence when each parent checkpoint appears by digest in `resolvedDependencies` of a signed attestation. Until then, treat pedigree and model-card base links as claims.

### Attest the export in the same job

Build in CI, not on a laptop, if you want hosted-platform provenance. Attest the exported files. `actions/attest` generates SLSA build provenance by default. `subject-path` accepts a glob.

```yaml
permissions:
  id-token: write
  contents: read
  attestations: write
steps:
  # ... checkout, fetch pinned base model and data, train or export ...
  - name: Attest model build provenance
    uses: actions/attest@v4
    with:
      subject-path: 'out/model/*'
  # Sign the same directory in this job so consumers pin the workflow, not a person.
```

### Verify before promote

```shell-session
$ gh attestation verify out/model/model.safetensors \
  --repo my-org/model-training \
  --signer-workflow my-org/model-training/.github/workflows/train.yml
```

`--signer-workflow` stops other workflows in the org from producing an acceptable attestation. `--deny-self-hosted-runners` rejects self-hosted builds. GPU training often runs on self-hosted machines, so that fleet is part of what you trust.

Log verified digests, signer identity, and the attestation reference with each deployment. When production misbehaves, you want the served pack tied to a build record.

Provenance does not prove the training data was clean. It proves which builder, inputs, and subjects the platform attested. Keep that limit honest.

## Putting the layers together

No single control is enough. A practical promote / load path stacks in this order:

1. **Format hygiene.** Prefer `safetensors`. Treat `trust_remote_code=True` as a privileged review, not a convenience flag.
2. **Scanning.** Run picklescan / ModelScan / commercial as a fast filter. Remember nullifAI: scanners inspect attacker-controlled content and can be evaded.
3. **Signature verify at every boundary.** Pin identity + issuer. Fail closed before the deserializer runs. This post.
4. **Provenance.** Require SLSA-style attest for artifacts you produce (`actions/attest` + `gh attestation verify`). Prefer upstream that ships it.
5. **Isolation.** Load and run with least privilege and no outbound network by default, so a verification gap or a signed-but-backdoored model has a small blast radius.

Cheap filters first. Cryptographic verify before you touch the bytes. Isolation as the assume-failure backstop.

If prompts, tool manifests, or MCP configs travel with the model, put them in the signed pack before promote. Same fail-closed habit as the weight bitflip.

Inventory (SBOM / ML-BOM) is optional and adjacent if you want a bill of materials next to the signature. It is not required to sign. If you do keep one, do not sign `sbom.json` as the integrity control. Sign the pack. I wrote that up separately in [SBOM for models](/sbom-for-models-not-just-containers/).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `No module named 'OpenSSL'` | `pip install pyOpenSSL` inside the venv |
| `No such option '--private-key'` | Use `--private_key` / `--public_key` (underscores) on 1.1.1 |
| `dd: ... Permission denied` on weights | Hub files can be `444`; `chmod u+w` first |
| Verify fails after you “only” edited docs | If the file is under the model path, it is in the manifest |
| Signature polluted by Hub `.cache/` | Copy model files into a clean dir before `sign` |
| Sigstore keyless wants a browser | Use `sign key` / `verify key` locally; save OIDC for CI |
| GHA sign hangs on OIDC | Missing `permissions.id-token: write`, or omit `--use_ambient_credentials` / Cosign keyless OIDC perm |
| Verify fails on identity mismatch | Pin the exact workflow URI (file path + `@refs/...`) |
| Kit / Cosign unpack fails | Verify the **same** tag/digest you pushed |

When the next model ships, what actually refuses to run if the signed digests are wrong: the slide, or the gate?

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
