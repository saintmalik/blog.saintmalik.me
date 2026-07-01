---
title: Delete recent commits from any git branch locally and remotely
---

import Giscus from "@giscus/react";

Use this to remove the most recent commits from a branch. It rewrites history, so it is only appropriate for branches where you can coordinate with everyone who has a copy.

:::warning
This is destructive. Anyone else working on the branch will need to reset their local copy. If the commits contain secrets, use the [secret cleanup runbook](/docs/secret-cleanup-runbook) instead so the PR diffs and forks are also handled.
:::

## Steps

1. Find the commit id of the last good state before the commits you want to remove:

```bash
git log --oneline
```

2. Reset the branch to that commit:

```bash
git reset --hard COMMIT_ID
```

3. Force-push the rewritten branch to the remote:

```bash
git push origin main -f
```

Replace `main` with the branch you are rewriting.

## Completion criterion

- [ ] `git log` locally shows only the commits you want to keep.
- [ ] The remote branch matches the local branch after `git push -f`.
- [ ] Other contributors have been told to reset their local branches (`git fetch origin && git reset --hard origin/main`).
- [ ] If the removed commits contained secrets, the [secret cleanup runbook](/docs/secret-cleanup-runbook) was followed instead.

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
