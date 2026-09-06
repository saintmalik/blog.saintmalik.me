---
slug: helm-gitops-supply-chain-checks
title: "Do you know the supply chain risk your Helm charts carry?"
authors: Abdulmalik
date: 2026-09-06
image: /bgimg/helm-gitops-supply-chain-checks-cover.webp
tags: [devsecops, helm, gitops, argo-cd, supply-chain, sbom, grype, eks]
description: Most teams scan app images in CI and ignore the Helm charts Argo syncs. That is a real supply-chain blind spot. Render what would land, Syft the images, Grype fixable High/Criticals, and push chart bumps instead of hand-editing containers.
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Do you even know the supply chain risk your Helm charts carry? I bet you don't.

<!--truncate-->

Your app images get SCA in CI. Your GitOps repo still pins `ingress-nginx@4.x` from the public chart repo. Argo syncs it. Whatever containers that chart renders land in the cluster. Nobody looked. That is not a tooling gap. That is risk you are shipping on every sync.

I already wrote about [SBOMs beyond generation](/sbom-supply-chain-beyond-generation/) and [hardening GitHub Actions](/github-actions-supply-chain-hardening/). This one is the missing middle: the ops repo. Argo Applications, Helm `targetRevision` pins, Kustomize bundles that yank GitHub release YAMLs. That tree is how third-party containers enter the cluster. If your scanners only run on application build pipelines, you are blind there.

So from that gap, this is what I did. Not chart cosign. Not a shiny product. A composite action that renders what Argo would sync, inventories the images, runs Syft + Grype, then tells you which chart pin to bump.

## The gap

App image CI and chart-render supply chain are not the same control. Confusing them is how infra teams sleep well while the cluster stays soft.

App pipelines usually look like: build → SBOM → SCA → maybe sign → push to ECR. Fine for *your* code.

Platform charts are different:

- The "source" is an Argo `Application` with `chart` + `repoURL` + `targetRevision`
- Images come from upstream defaults, or from `helm.values` overrides you forgot about
- Tags are often mutable (`:latest`, `:v1.2`) with no digest
- CVEs show up months after you pinned the chart, and the fix is almost never "edit the Deployment image by hand"

If you only scan the generic chart folder with `helm lint`, you never see the rendered image set for staging vs production. You never see the risk either.

## What I wired

On PRs to the GitOps ops repo, matrix over environments (staging / production apps trees):

1. **Render** every Argo `Application` (and nested apps inside Kustomize) the same way the cluster would see it
2. **Inventory** deployments into a CycloneDX SBOM that maps app → chart/repo/revision → images
3. **Syft** each unique image (prefer SBOM later for Grype)
4. **Grype** with `--only-fixed`, High/Critical only for the gate noise
5. **Enrich** findings (EPSS / KEV / match confidence where the shared SCA enrich step runs)
6. **Warn** if image refs lack `@sha256:`
7. **Recommend chart / upstream bumps** by comparing current pin vs latest upstream render

## Render first, or you are lying to yourself

The interesting part is not "run Grype." It is forcing the scan target to match sync.

For remote Helm Applications the helper does the boring thing Argo does:

```bash
helm template "$release" "$chart" \
  --repo "$repo_url" \
  --version "$target_revision" \
  -f <inline-values> \
  --skip-tests
```

OCI charts become `oci://$repo/$chart`. Local charts use the path + `releaseName`. Kustomize paths get `kubectl kustomize`, and nested `Application` docs inside the bundle get rendered too.

Local chart deps: if `charts/*.tgz` already exists, use them. Otherwise try `helm dependency build` and keep going with a warning if that fails. CI should not pretend vendored deps are optional forever, but a hard fail on every transient chart museum blip is also how people disable the whole job.

If nothing renders, the job exits. Empty scan = false green is worse than a red PR.

## Two SBOMs, different jobs

I generate:

1. **Deploy inventory** (`inventory.cdx.json`): one component per Argo app, with properties for source file, chart, repo, revision, path. Child components are the container images that came out of render.
2. **Per-image CycloneDX** under `images/`: Syft against the actual image (with ECR login when the runner already has AWS creds).

Grype prefers `grype sbom:$file`. If Syft could not pull a private image, fall back to scanning the image ref directly and warn. Private registry auth is the usual failure mode; understated CVE counts beat silent success.

The inventory is what makes the Slack report useful. Finding is not "CVE in nginx." It is "this staging Application YAML, this chart pin, this image."

## What the gate actually fails on

Fixable High/Critical from Grype (`--only-fixed`). If upstream has not published a fixed version, I do not pretend a PR block helps.

Mutable tags get a warning, not a fail (yet). Digest pinning is the right end state. Most ops repos do not get there in one PR.

Slack posts before the fail so people see the report even when the check is red.

## Chart bumps, not image surgery

This is the bit teams get wrong after the first Grype dump.

For external charts, bump `targetRevision` (or the Kustomize GitHub release URL), not chase container tags inside rendered YAML. The recommend step:

- Finds apps that showed up in the supply-chain summary (or remote Helm / trackable Kustomize pins)
- Resolves "latest" via `helm search repo`, `helm show chart`, or Artifact Hub
- Re-templates current pin and latest pin
- Scores fixable High/Critical on both image sets
- Says **bump** only when the newer chart actually improves the count
- Calls out values that override `tag` / `repository` / `registry`, because a chart bump alone will not move those images
- For vendored operator images in Kustomize (e.g. RabbitMQ operators), checks GitHub latest release tags instead of pretending there is a Helm chart

Actions look like `bump-recommended`, `bump-may-not-fix`, `bump-available-unverified`, `upstream-image-bump`, `track-internally` for self-hosted ECR. That last one matters: your own base images are not fixed by bumping Bitnami.

Cap how many apps you re-score per run. Full fleet Grype of every "maybe newer" chart on every PR will melt the runner.

## Adjacent layer: signing your own images

App build pipelines still sign what *you* push (Notation + AWS Signer in my setup). That is a different control: authenticity of internal images.

It does not tell you that the ingress-nginx chart you pinned six months ago still renders a controller image with a fixable Critical. Keep both. Do not confuse chart provenance theater with "what is about to run."

I am not verifying Helm chart signatures in this path today. If your threat model needs that, add it. This path answers a blunter question: given the pins in git, what CVEs ship on sync?

## Tradeoffs

**Pros**

- Scans the same rendered surface Argo syncs
- Maps CVEs back to Application files humans can edit
- Pushes remediation toward chart/release pins

**Cons / sharp edges**

- Needs network to chart repos and registries during CI
- Private images without auth under-report
- Chart "latest" lookup heuristics (Artifact Hub mapping) are imperfect
- Upgrade recommend is expensive; keep it bounded
- Mutable tags are warned, not blocked
- Render failures are skipped with warnings; a broken Application can disappear from the scan until you watch the logs

Also: this is PR-time on the ops repo. Runtime drift (someone `helm upgrade` outside GitOps) is out of scope. That is a different detector.

## Minimal shape if you rebuild it

You do not need my composite action names. The pattern is small:

```text
PR to ops repo
  → render Applications (helm template / kustomize)
  → extract image: lines
  → syft → cyclonedx
  → grype sbom:… --only-fixed
  → gate on High/Critical fixable
  → optional: compare targetRevision vs upstream and re-score
```

Pin tool versions. Upload the inventory SBOM as an artifact. Fail closed on actionable findings after Slack (or whatever your team actually reads).

## Conclusion

GitOps did not remove your Helm supply chain. It moved it into YAML that looks too boring to scan.

Render it. Inventory it. Grype the images. Tell people which pin to bump. Then argue about digests and chart signatures once the boring path is green.

Till next time, Peace be on you 🙏🏽

#### References

- https://github.com/anchore/syft
- https://github.com/anchore/grype
- https://blog.saintmalik.me/sbom-supply-chain-beyond-generation/
- https://blog.saintmalik.me/github-actions-supply-chain-hardening/

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
