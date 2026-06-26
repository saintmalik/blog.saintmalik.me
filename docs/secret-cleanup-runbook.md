---
title: Secret cleanup is not done after the commit rewrite
---

import Giscus from "@giscus/react";

Most teams discover exposed secrets, panic, rewrite commit history, rotate the credentials, and close the ticket. That feels like resolution. It isn't.

Every rewritten commit that had an open or merged PR still has the secret sitting in the PR diff. Visible. Indexed. Anyone with repo access can pull it up right now. GitHub caches that diff independently of your commit history. Rewriting commits does not touch it.

The fix is a support ticket to GitHub. Submit the affected PR URLs, they scrub the cached diffs on their end. That step is not in most secret cleanup runbooks. Which means most cleanups are incomplete.

But that is still reactive. You are mopping the floor with the tap still running.

## What actually needs to happen

Treat secret cleanup as three phases, in order:

1. **Contain** — rotate or revoke the exposed credential immediately
2. **Remove** — rewrite git history *and* get GitHub to scrub PR diffs
3. **Prevent** — two gates so it does not happen again

Skipping step 2 leaves the secret in PR history. Skipping step 3 guarantees a repeat.

## Phase 1: Rotate first

History rewrite does not invalidate a leaked API key, database password, or private key. Assume the secret is compromised the moment it hit the remote.

Rotate before or in parallel with git cleanup. If you rewrite history but forget rotation, the old credential may still be live somewhere an attacker already copied it.

## Phase 2: Rewrite history (necessary, not sufficient)

Use the approach that fits your situation:

- [`git filter-repo`](https://github.com/newren/git-filter-repo) for removing a file or string across all branches
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) for bulk secret removal
- GitHub's own guide: [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

Force-push every affected branch. Tell collaborators to re-clone or hard reset. Forks do not get cleaned automatically; you may need to contact fork owners.

That clears the secret from current commit trees. It does **not** clear PR diffs.

## Phase 2b: Scrub GitHub PR diffs (the step everyone skips)

If the secret ever appeared in a pull request (opened, closed, or merged), the diff can still show it under the PR's **Files changed** tab even after you rewrite `main`.

Open a [GitHub Support](https://support.github.com/) ticket and ask them to remove sensitive data from cached pull request diffs. Include:

- Repository name (`org/repo`)
- Full URLs of every affected PR
- Approximate date the secret was exposed
- Confirmation that credentials are rotated

Reference GitHub's doc: [About secret scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning-and-push-protection) and their sensitive data removal process.

Without this step, anyone with read access to the repo can still find the secret in old PRs. Security researchers and bots scrape this surface too.

## Phase 3: Two gates (prevent recurrence)

Neither gate alone is enough.

| Gate | Covers | Misses |
|---|---|---|
| Pre-commit hook (local) | Secrets before they leave your machine | Contributors who skip hooks, new clones without setup |
| Push/PR scan (CI) | Everything that reaches the remote | Nothing retroactive; needs workflow maintenance |

You need both running together before the posture is solid.

### Gate 1: Pre-commit hook with Gitleaks

Install [Gitleaks](https://github.com/gitleaks/gitleaks) and wire it into [pre-commit](https://pre-commit.com/).

`.pre-commit-config.yaml` at the repo root:

```yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks
```

Install and enable:

```bash
brew install gitleaks pre-commit   # or pip install pre-commit
pre-commit install
pre-commit run --all-files         # baseline scan once
```

[TruffleHog](https://github.com/trufflesecurity/trufflehog) is a valid alternative. Same idea: block the commit locally if a secret pattern matches.

The hook only works on machines where it is installed. Document it in your contributing guide and enforce it in CI as gate 2.

### Gate 2: Secret scan on every push and PR

Example GitHub Actions workflow (`.github/workflows/secret-scan.yml`):

```yaml
name: secret-scan

on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`fetch-depth: 0` matters. A shallow checkout can miss secrets in older commits on the branch.

Enable [GitHub push protection](https://docs.github.com/en/code-security/secret-scanning/working-with-secret-scanning-and-push-protection/working-with-push-protection-from-the-command-line) for supported partners if your org plan allows it. That blocks many patterns before the push lands.

Also scan workflow files themselves. CI tokens and deploy keys get hardcoded in `.github/workflows/` more often than people admit.

## Checklist (print this)

```
[ ] Credential rotated / revoked
[ ] Secret removed from all branches (filter-repo / BFG)
[ ] Force-push completed; team notified to re-clone
[ ] GitHub Support ticket filed with affected PR URLs
[ ] Fork owners contacted if applicable
[ ] pre-commit + gitleaks (or trufflehog) installed repo-wide
[ ] CI secret scan on push and PR
[ ] Contributing doc updated with hook install steps
[ ] Incident ticket closed only after PR scrub confirmed
```

## Closing

Rewriting git history is necessary. It is just not the finish line most teams think it is.

PR diffs outlive your rewrite. Support tickets and two scanning gates are what turn a panic response into an actual cleanup. Do all three phases, then close the ticket.

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
