---
title: TEE stacks — short notes
sidebar_position: 90
---

# TEE stacks (short)

## What it is

**TEE** = hardware-isolated execution so host OS / hypervisor / admin can’t freely read or tamper with **memory in use**.

**TEE stack** = hardware → isolation → runtime/LibOS → orchestration → **attestation** (prove measured code before releasing keys).

## Three trust layers (don’t mix)

| Layer | Question | Examples |
|-------|----------|----------|
| Artifact | Who signed this image? Untampered? | Cosign, AWS Signer + Notation |
| Process / supply chain | What did the build do? | in-toto, SLSA, Runtime Trace predicates |
| Confidential runtime | Can host root snoop or swap code in use? | Nitro Enclaves, SEV-SNP, TDX, SGX + CoCo/Gramine |

- Cosign ≈ Signer. **Not** an open-source Nitro.
- Open “Nitro-like” idea = **TEE/confidential compute** (SEV-SNP/TDX + CoCo, etc.), not Sigstore.

## Attestation ≠ attestation

| Cosign / in-toto | TEE |
|------------------|-----|
| Signatures & predicates about **build/artifact** | Hardware quote/PCR about **code running now** |
| “Who signed / what did CI do?” | “Is this enclave measurement expected before KMS gives the key?” |

## Learn path (short)

1. Concepts: data-in-use, attestation loop (measure → attest → verify → release secret) — [Confidential Computing Consortium](https://confidentialcomputing.io/), [Nitro Enclaves docs](https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave.html)
2. Hardware map: SEV-SNP, TDX, SGX, Nitro Enclaves (compare, don’t memorize every register)
3. Cloud-native entry: [Confidential Containers](https://github.com/confidential-containers)
4. Hands-on (pick one): Nitro hello-world + PCRs + KMS, **or** CoCo hello-world on SNP/TDX

Skip starting on SGX+Gramine day one.