---
slug: helm-gitops-supply-chain-checks
title: "Do you know the supply chain risk your Helm charts carry?"
authors: Abdulmalik
date: 2026-09-06
image: /bgimg/helm-gitops-supply-chain-checks-cover.webp
tags: [devsecops, helm, gitops, argo-cd, supply-chain, sbom, grype, eks]
description: Most teams scan app images in CI and ignore the Helm charts GitOps syncs. That is a real supply-chain blind spot. Render what would land, inventory the images, Syft + Grype fixable High/Criticals, gate the ops repo.
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Do you even know the supply chain risk your Helm charts carry? I bet you don't.

<!--truncate-->

Your app images get scanned in CI. Your GitOps repo still pins `ingress-nginx@4.x` from the public chart repo. Argo syncs it. Whatever containers that chart renders land in the cluster. Nobody looked. That is not a tooling gap. That is risk you are shipping on every sync.

I already wrote about [SBOMs beyond generation](/sbom-supply-chain-beyond-generation/) and [hardening GitHub Actions](/github-actions-supply-chain-hardening/). This one is the missing middle: the ops repo. Argo Applications, Flux `HelmRelease`s, Helm `targetRevision` pins, Kustomize bundles that yank GitHub release YAMLs. That tree is how third-party containers enter the cluster. If your scanners only run on application build pipelines, you are blind there.

So I open-sourced the path I use: render what GitOps would sync, inventory the images, run Syft + Grype, gate on fixable High/Critical. That is **supply chain security on the images the ops repo would deploy**, not another app-CI image scan.

## The gap

App image CI and chart-render supply chain are not the same control. Confusing them is how infra teams sleep well while the cluster stays soft.

App pipelines usually look like: build → SBOM → scan → maybe sign → push to ECR. Fine for *your* code.

Platform charts are different:

- The "source" is an Argo `Application` (or Flux `HelmRelease`) with `chart` + `repoURL` + `targetRevision`
- Images come from upstream defaults, or from `helm.values` overrides you forgot about
- Tags are often mutable (`:latest`, `:v1.2`) with no digest
- CVEs show up months after you pinned the chart, and the fix is almost never "edit the Deployment image by hand"

If you only scan the generic chart folder with `helm lint`, you never see the rendered image set for staging vs production. You never see the risk either.

## What I open-sourced

Two repos, same job:

- CLI: [`saintmalik/helm-sca`](https://github.com/saintmalik/helm-sca) (release `v0.0.1`)
- GitHub Action: [`saintmalik/helm-sca-action`](https://github.com/saintmalik/helm-sca-action) ([Marketplace](https://github.com/marketplace/actions/helm-sca))

Modes: `argo`, `flux`, `gitops` (Argo + Flux), `manifests`, `chart`, `terraform`. `inventory` scopes what would deploy. `scan` is the gate (Syft → Grype, `--only-fixed` by default).

Minimal Action workflow (pin the commit SHA):

```yaml
name: ops supply chain

on:
  pull_request:
    paths:
      - "environments/**"

jobs:
  supply-chain:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan Argo Application pins
        uses: saintmalik/helm-sca-action@6debf2d90e156822a8944b548eb8fd42acf1d5ae # v0.0.3
        with:
          mode: argo
          argo-apps: ./environments
          command: scan
          fail-on: high
```

Flux is the same shape with `mode: flux` and `flux: ./clusters/prod`. More examples live under the [action repo](https://github.com/saintmalik/helm-sca-action/tree/main/examples).

CLI if you want it on a laptop or a non-Actions runner:

```bash
curl -sSfL \
  "https://github.com/saintmalik/helm-sca/releases/download/v0.0.1/helm-sca_linux_amd64.tar.gz" \
  | tar -xz -C /usr/local/bin helm-sca

helm-sca inventory --argo-apps ./apps --repo-root .
helm-sca scan --flux ./clusters --repo-root . --out-dir ./out --fail-on high
```

Needs `helm` on PATH for chart/GitOps/Terraform paths. `scan` needs Syft and Grype (the Action installs those). Kustomize sources need `kubectl` or `kustomize`.

## What the pipeline does

Against the ops repo (PRs or a scheduled job over staging / production trees):

1. **Render** Argo `Application`s / Flux releases (and nested apps inside Kustomize) the same way the cluster would see them
2. **Inventory** into a CycloneDX SBOM that maps app → chart/repo/revision → images
3. **Syft** each unique image
4. **Grype** with `--only-fixed`, fail on High/Critical when you set `fail-on`
5. **Warn** if image refs lack `@sha256:`

Chart pin-bump **recommend** is still a stub in CLI v1. The remediation idea below is still the right one; the auto-scorer is not shipped yet.

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

1. **Deploy inventory** (`inventory.cdx.json`): one component per app, with properties for source file, chart, repo, revision, path. Child components are the container images that came out of render.
2. **Per-image CycloneDX** under the scan out-dir: Syft against the actual image (with registry login when the runner already has creds).

Grype prefers `grype sbom:$file`. If Syft could not pull a private image, fall back to scanning the image ref directly and warn. Private registry auth is the usual failure mode; understated CVE counts beat silent success.

The inventory is what makes the report useful. Finding is not "CVE in nginx." It is "this staging Application YAML, this chart pin, this image."

## What the gate actually fails on

Fixable High/Critical from Grype (`--only-fixed`). If upstream has not published a fixed version, a PR block does not magically create one. Tune `fail-on` (`none` / `low` / `medium` / `high` / `critical`) to how loud you want the check.

Mutable tags get a warning, not a fail (yet). Digest pinning is the right end state. Most ops repos do not get there in one PR.

Upload the scan out-dir as an artifact. Fail closed on actionable findings after your team actually reads the report.

## Chart bumps, not image surgery

This is the bit teams get wrong after the first Grype dump.

For external charts, bump `targetRevision` (or the Flux chart version / Kustomize GitHub release URL), not chase container tags inside rendered YAML. A useful recommend step would:

- Find apps that showed up in the supply-chain summary (or remote Helm / trackable Kustomize pins)
- Resolve "latest" via `helm search repo`, `helm show chart`, or Artifact Hub
- Re-template current pin and latest pin
- Score fixable High/Critical on both image sets
- Say **bump** only when the newer chart actually improves the count
- Call out values that override `tag` / `repository` / `registry`, because a chart bump alone will not move those images
- For vendored operator images in Kustomize (e.g. RabbitMQ operators), check GitHub latest release tags instead of pretending there is a Helm chart

That path is designed, not shipped. `helm-sca recommend` prints a stub today. Until it lands, do the pin math by hand: re-render a candidate revision, inventory, scan, compare.

Also: your own base images in ECR are not fixed by bumping Bitnami. Track those internally.

## Adjacent layer: signing your own images

App build pipelines still sign what *you* push (Notation + AWS Signer in my setup). That is a different control: authenticity of internal images.

It does not tell you that the ingress-nginx chart you pinned six months ago still renders a controller image with a fixable Critical. Keep both. Do not confuse chart provenance theater with "what is about to run."

I am not verifying Helm chart signatures in this path today. If your threat model needs that, add it. This path answers a blunter question: given the pins in git, what CVEs ship on sync?

## Tradeoffs

**Pros**

- Scans the same rendered surface GitOps syncs
- Maps CVEs back to Application / HelmRelease files humans can edit
- Pushes remediation toward chart/release pins

**Cons / sharp edges**

- Needs network to chart repos and registries during CI
- Private images without auth under-report
- Chart "latest" lookup heuristics (when recommend lands) will be imperfect
- Mutable tags are warned, not blocked
- Render failures are skipped with warnings; a broken Application can disappear from the scan until you watch the logs

Also: this is CI-time on the ops repo. Runtime drift (someone `helm upgrade` outside GitOps) is out of scope. That is a different detector.

## Conclusion

GitOps did not remove your Helm supply chain. It moved it into YAML that looks too boring to scan.

Render it. Inventory it. Grype the images. Gate the ops repo. Then argue about digests, chart signatures, and auto pin-bumps once the boring path is green.

Till next time, Peace be on you 🙏🏽

#### References

- https://github.com/saintmalik/helm-sca
- https://github.com/saintmalik/helm-sca-action
- https://github.com/marketplace/actions/helm-sca
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
