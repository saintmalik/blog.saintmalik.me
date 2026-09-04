---
slug: container-image-sbom-blind-spots
title: "Container Image SBOM Blind Spots: What Scanning Your Image Still Misses"
authors: Abdulmalik
image: /bgimg/container-image-sbom-blind-spots-cover.webp
tags: [containers, docker, devsecops, appsec, security, sbom, supply-chain, syft, grype, cosign, kubernetes]
description: An SBOM of your container image is not the SBOM of your app. Knowing which part is which, whether the bad code can run, and proving the image is the one you built all get harder once layers, base images, and OS packages enter the picture - the container version of the three blind spots.
---

import Giscus from "@giscus/react";

Every container security program ends up doing the same three things: scan the image with Trivy in CI, sign it with cosign, put up a dashboard that counts CVEs. Then they call the problem "in progress."

That checklist is the easy 20% of the work. It makes a lot of noise but cuts very little risk.

<!--truncate-->

What decides if the next Log4Shell or xz event hurts you is hidden in the parts most teams skip: **knowing which part is which, knowing if the bad code can actually run, and proving the image is truly what you built**. All three get harder when you work with an *image* instead of a package.

A container image is not a dependency tree. It is built in layers: a base image you did not build, OS packages you did not choose, and your app on top.

If your SBOM program is built around `package.json` and `go.sum`, the container is the part you are missing. It is also where most of the exploitable CVEs actually live.

## Miss #1: Parts get mixed up, and images make it worse

The main problem is PURL vs CPE. PURL is the name your package manager uses. CPE is the name NVD uses, and a human typed it by hand. A scanner holds a clean PURL and must guess which CPE NVD used.

For container images, you get three more mix-up points on top of that one.

### Gap 1: One image, three identities

| Identity | What it is | Mutable? | What it's good for |
|---|---|---|---|
| Tag | `myorg/api:latest` | Yes, silently | Humans, deploys |
| Manifest digest | `sha256:...` commits to every layer + config | No | SBOM subject, signatures, inventory keys |
| Index (multi-arch) | tag → list of platform manifests | Yes | `docker pull` on any arch |

Most pipelines scan the tag, make an SBOM for the tag, and store it keyed by... nothing. If the tag moves, your SBOM describes an image that no longer exists.

If your image is multi-arch, `myorg/api:latest` is an *index*. Each platform manifest has its own digest, its own layers, and its own OS packages. A scanner that picks `linux/amd64` while you run `linux/arm64` gives you an SBOM for the wrong thing.

The fix is simple, and you cannot skip it: turn the tag into a digest first, scan each platform, and key everything by digest.

```bash
# resolve the tag once, then pin everything to the digest
docker buildx imagetools inspect myorg/api:latest | grep Digest

# scan the pushed artifact per platform, not the repo, not the tag
syft registry:myorg/api@sha256:<digest> --platform linux/arm64 -o cyclonedx-json > api.cdx.json
```

### Gap 2: PURL vs CPE, the Linux package problem

OS packages have the same naming problem as app dependencies, plus one extra twist. The installed part is a distro package:

```
pkg:deb/debian/openssl@3.0.11-1~deb12u2?arch=amd64&distro=debian-12
```

NVD indexes CVEs against the upstream CPE:

```
cpe:2.3:a:openssl:openssl:3.0.11:*:*:*:*:*:*:*
```

These two strings name the same code, and distro fixes make it worse. `3.0.11-1~deb12u2` is Debian's *patched* OpenSSL. A simple string comparison says "vulnerable" even though it is fixed.

That is why OS matching should trust **distro security advisories** (DSA, RHSA, ALAS) instead of raw CPE matching. The CPE fallback is where your false positives come from. Debian epochs (`1:2.36-9+deb12u1`) and `~` ordering (`dpkg --compare-versions` sorts `~` before everything) are where simple matchers get the version range wrong by one.

The 2024 NVD CPE backlog hit container scanning hard. OS packages used the most CPE data. If your matcher depended on the CPE dictionary, coverage silently dropped with no error and no warning on the dashboard.

Same fix as the article, for containers: show where each finding came from, and rank it differently in triage.

```bash
# which matcher and which feed produced each finding?
grype myorg/api@sha256:<digest> -o json \
| jq '.matches[] | {cve: .vulnerability.id,
  severity: .vulnerability.severity,
  source: .vulnerability.dataSource,
  matcher: .matchDetails[0].matcher,
  type: .matchDetails[0].type}'
# source: https://security-tracker.debian.org/...  (distro advisory, trust it)
# source: https://nvd.nist.gov/...                 (CPE fallback, verify it)
```

### Gap 3: Whose part is it?

An image SBOM is a flat list. It cannot answer the question every fix starts with: *did this bad OpenSSL come from the base image, an `apt install` in a build stage, or our app layer?*

That answer changes the fix: update the base image, fix the Dockerfile, or upgrade the dependency.

Tools like Syft can guess the base image, but the SBOM formats barely record it. If you plan to analyze images later, store the links, not just the parts. Model the image as a component (`pkg:oci/myorg/api@sha256:...`) with a "built from" link to its base and "contains" links to its packages.

This is the same "pick the format for the graph" idea. CycloneDX's `dependencies` array and SPDX's relationship words (`CONTAINS`, `GENERATED_FROM`) are the difference between "which images contain this package" and endless spreadsheet digging.

### Gap 4: For some images, scanners see nothing at all

A `FROM scratch` image with one static Go binary *is* its entire SBOM, and file-based scanners cannot see into it. A stripped Go binary (`-ldflags "-s -w"`) loses its embedded module info.

Rust embeds nothing by default. You need `cargo auditable` to add a compressed dependency manifest into a custom ELF section. Statically linked C/C++ is invisible to scanners. The dependency list is gone, and no tool can get it back.

Distroless images have no package database. OS scanners find nothing, while the base layer adds real code and zero SBOM entries.

Your SBOM simply will not contain those parts. That is a blind spot, not a low coverage number.

## Miss #2: A CVE count is not a risk measurement

An image scan usually finds hundreds to thousands of issues. A base image is a *pile of code your app probably never runs*. Most OS packages in a distroless or Debian base are never used by your workload.

The whole job is telling the difference between "the bad code is there" and "the bad code can run."

### Reachability across the container boundary

For OS-level parts, reachability comes down to one question: *does any process in the image actually load and run this library?*

You can check part of it. Look at the entrypoints and what they depend on with `ldd` / `readelf -d` to see which shared objects are really linked. But the same limits as app-level reachability apply, and they are worse here:

- **`dlopen` at runtime** creates links no static analysis sees.
- **Interpreted runtimes** (Node, Python) load native modules as they run.
- **Multiple processes** in one image mean the entrypoint is not the only way in. Sidecars, init processes, and plugin loaders each have their own paths.

Used the right way, to sort what matters first and not to ignore findings, this removes a large share of OS-layer issues from the top of the list.

Treat "unreachable" as "probably unreachable." Never treat it as proof.

### VEX, tied to the image

The tool that saves your triage work between scans is the same as at app level, with one difference: it points at the image, not the package.

```json
{
  "@context": "https://openvex.dev/ns/v0.2.0",
  "author": "secops@myorg",
  "statements": [{
    "vulnerability": { "name": "CVE-2024-XXXXX" },
    "products": [{ "@id": "pkg:oci/myorg/api@sha256:<digest>" }],
    "status": "not_affected",
    "justification": "vulnerable_code_not_in_execute_path",
    "impact_statement": "The curl package is in the base layer, but no process in this image uses it."
  }]
}
```

There is a container shortcut most teams never take: **upstream VEX**. Wolfi and Chainguard images ship signed SBOMs *and* VEX for their base content. You get that reasoning for free instead of redoing it for every image.

The gap nobody models: when does upstream's `not_affected` still hold for your image? If you add a package that links the library the base said was unreachable, the upstream answer no longer holds. Think about how the two connect. Do not assume the base's answer still applies.

### Priority: how bad it is vs. where it runs

For images, the extra factor is **exposure**. The same image scanned in CI and deployed facing the internet are different risks.

There is also **freshness**. A base image you built six months ago has hundreds of CVEs that *did not exist at build time*. No new code has to ship for your risk to change.

The cheap feeds still apply. EPSS sorts your backlog toward what attackers actually use. A CISA KEV hit on an OS package in your base layer is a "drop everything" flag, no matter the CVSS score.

The repeat-findings problem is worse for images than for app deps: every image built from the same base shows the same OS findings again. Mark VEX once at the base level, and let it carry over. Store image SBOMs keyed by digest in a platform that keeps checking against fresh feeds (Dependency-Track is the common choice). Otherwise you re-review the same 400 findings on every scan.

## Miss #3: Proof, making sure the scanned image is the one running

This is the least done of the three, and for containers it looks different.

I covered how to sign and verify container images, plus enforcing signed images in Kubernetes with Kyverno, in an earlier post on [Signing Container Images for Trust Assurance](/signing-container-images-for-trust-assurance/). This post goes one step further: what you sign, what you check, and the control almost nobody turns on.

### Signatures tie to digests, not tags

The good news: an OCI manifest digest covers every layer digest and the image config. "Does this SBOM describe this image" becomes something a computer can prove. Attach the SBOM as a signed statement whose subject is the digest.

```bash
cosign attest --predicate api.cdx.json --type cyclonedx \
  myorg/api@sha256:<digest>
```

The bad news: checking by tag is fake security. Tags can change and point at a different image. A multi-arch index can be repointed to different platform manifests.

If your admission policy checks `myorg/api:latest` instead of a digest, a bad build (or a hacked registry) can push a different image under the same name and nobody will notice.

### The base image: the missing link

Your image's proof of origin should record *which base digest it was built from*. You should also check the base's own signed proofs *before* building on top of it.

Most pipelines pull `node:20`, a tag, the changeable name, and build on whatever moved.

```dockerfile
# never: FROM node:20
# yes: digest-pin the base
FROM node:20.19.0@sha256:5ac4b3f2f3b8... 

# and verify the base's own provenance before you build
cosign verify --certificate-identity-regexp 'https://github.com/chainguard-images/.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  cgr.dev/chainguard/node:latest
```

`org.opencontainers.image.base.digest` and `base.name` labels exist for this. But they are *labels*: plain text anyone can add.

The base digest belongs in the build's SLSA provenance or an in-toto statement, where it is signed. The chain only holds if every link holds: your image is only as safe as the base whose layers are inside it.

### The control nobody turns on: checking at admission

Making signed proofs is common. Blocking images that lack a valid proof is rare. A signed proof nobody checks is a note, not a control.

Block images at the cluster admission point, with policy-controller, Kyverno, or OPA/Gatekeeper. Check the DSSE signature, the certificate identity, the OIDC issuer, and the proof contents:

```bash
cosign verify-attestation --type cyclonedx \
  --certificate-identity-regexp 'https://github.com/myorg/.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  myorg/api@sha256:<digest>
```

Start with warnings, then block. Teams that start with blocking usually find their own base images were never signed, and they stop their own deploys.

### Reproducible builds make checking possible

If your image build gives the same result every time (`ko` for Go, `apko` for distroless-style images), you can rebuild locally and compare digests. That catches a swapped layer or a hacked builder.

apko also makes SBOMs and signatures for the image it builds. You get the SBOM at build time, no extra step.

If your build is not reproducible, you cannot spot changes by comparing digests. You can only trust whoever signed it.

### The xz-style attack, for containers

A hacked base image, a fake image with a similar name, an attacker taking over the maintainer's account. None of these is a CVE, and no SBOM entry or CVE feed would have flagged them before they were found.

The fixes are the same as app-level, applied to images: pin bases and dependencies by digest, prefer images that publish signed proof of origin, check OpenSSF Scorecard signals for the images you build on, and diff your image SBOMs between releases so nothing unexpected arrives in production.

## The real problem: one-time thinking

Every failure above has the same root cause: treating supply chain security as a one-time build check instead of an always-on thing you can search.

An image SBOM made Tuesday is already out of date by Wednesday. The base image's CVE state changes every day. A new alert against a library you shipped six months ago changes your risk instantly. Your build pipeline will never re-run to notice.

The right setup is the same as at app level, with the container as the unit:

1. **Make SBOMs from the pushed image by digest**, not the repo, not the tag.
2. **Store them keyed by digest** in a platform that keeps checking against fresh vuln/KEV feeds (Dependency-Track). An SBOM you can't search across all your images is a file, not a program.
3. **Model the links, not just the parts**. GUAC ingests SBOMs, SLSA proofs, and VEX into a graph so "which of my live images depend on `pkg:deb/.../openssl`, and which have a VEX saying not_affected" is one search.
4. **Carry VEX and priority forward** so your triage work builds up instead of starting over.
5. **Check proofs at admission**, not just make them at build.

### A more honest rating scale, for containers

| Level | What it looks like | What it buys you | The technical control that defines it |
|---|---|---|---|
| 0 | Trivy scan in CI, CVE dashboard | Compliance checkbox, too many alerts | Scan by tag, CPE fallback, no match confidence |
| 1 | SBOM of the pushed image, stored by digest | You know what's in the image | syft against the registry by `sha256:`, digest-keyed inventory |
| 2 | Reachability + VEX + EPSS/KEV + layer attribution | You know what's exploitable | Dynamic-link reachability as a prioritizer, OpenVEX tied to `pkg:oci`, know which layer each finding came from |
| 3 | Signed proofs checked at admission | You can prove what's deployed | in-toto/DSSE, SLSA L2+, base digest in provenance, cosign verify in an admission policy |
| 4 | Always-on re-checks + graph + base image health | You answer the next alert in minutes | Dependency-Track/GUAC, upstream VEX, digest-pinned bases |

Most programs that think they are "done" are at Level 0 with a nicer dashboard. The gap from 0 to 4 is not more scanning. It is parts you can trust, exploitability you can defend, and proof you can check, all tied to the thing you actually deploy: the image digest.

### Where to start

1. Move SBOM generation to the pushed image, by digest, per platform. Not the repo, not the tag.
2. Store image SBOMs keyed by digest in Dependency-Track so the next zero-day is a search, not spreadsheet digging.
3. Pin base images by digest. Check the base's signed proofs before building, and record the base digest in your proof of origin.
4. Split OS findings by where they came from. Distro advisory matches you can trust; CPE-fallback matches go to a separate queue. Instant noise cut, no new tools.
5. Add KEV + EPSS. A KEV hit in a base layer is a drop-everything flag.
6. Adopt one VEX format, subject = the image digest. Start with the upstream VEX from your base image vendor.
7. Sign images and check them at admission. Warnings first, then block.

The scanner and the SBOM generator were just the start. For containers, the goal is the same, with one change: **the container is not your app in a different box. It is an artifact with a supply chain of its own, and that supply chain is the part everyone misses.**

Till next time, Peace be on you 🤞🏽

#### References

- [Syft](https://github.com/anchore/syft)
- [Grype](https://github.com/anchore/grype)
- [Cosign / Sigstore](https://docs.sigstore.dev/)
- [SLSA Provenance](https://slsa.dev/spec/v1.0/provenance)
- [OpenVEX](https://openvex.dev/)
- [OWASP Dependency-Track](https://dependencytrack.org/)
- [GUAC](https://github.com/guacsec/guac)
- [OCI image spec annotations (org.opencontainers.image.base.*)](https://github.com/opencontainers/image-spec/blob/main/annotations.md)
- [Chainguard Images SBOMs & VEX](https://www.chainguard.dev/unchained/software-bill-of-materials)
- [ko](https://ko.build/) / [apko](https://apko.dev/)

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
