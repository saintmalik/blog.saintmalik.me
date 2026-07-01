---
title: Bash Set Options to the rescue
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

A small bash script worked locally in GitHub Actions. The script counted successes and failures from a string, then branched on the result. Local run was fine; the CI run failed with exit code 1.

```bash
#!/bin/bash

set -x
values="success success success success"

count_success=$(echo ${values[@]} | grep -o 'success' | grep -c '^')
count_failure=$(echo ${values[@]} | grep -o 'failure' | grep -c '^')

if [[ $count_success -eq 4 ]]; then
  echo "success"
elif [[ $count_failure -ge 1 ]]; then
  echo "failure"
else
  echo "undefined"
fi
```

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/bash-options.webp`} alt="bash options"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/bash-options.jpg`} alt="bash options"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/bash-options.jpg`} alt="bash options"/>
</picture>

## Why it fails in CI

The value of `count_failure` is `0`, which is expected. The problem is not the final branch; it is the pipeline that produces `count_failure`.

When `grep -o 'failure'` finds no matches it exits with status `1`. GitHub Actions runs shell steps with `set -e` and often `set -o pipefail` enabled by default, so a failing command in a pipeline aborts the whole script even though the output you care about (`count_failure = 0`) is correct.

`set -x` only prints each command; it does not change how the shell reacts to a failing command.

## The fix: `set +e`

`set +e` tells the shell to keep running even when a command returns a non-zero exit status. Use it around the pipeline that is expected to produce zero matches:

```bash
#!/bin/bash

set +e
values="success success success success"

count_success=$(echo ${values[@]} | grep -o 'success' | grep -c '^')
count_failure=$(echo ${values[@]} | grep -o 'failure' | grep -c '^')
set -e

if [[ $count_success -eq 4 ]]; then
  echo "success"
elif [[ $count_failure -ge 1 ]]; then
  echo "failure"
else
  echo "undefined"
fi
```

A safer alternative is to make the pipeline itself robust so it never fails:

```bash
count_failure=$(echo ${values[@]} | grep -o 'failure' | grep -c '^' || true)
```

`|| true` forces the substitution to return `0` regardless of whether `grep` found a match.

## The four `set` options you reach for first

| Option | Shorthand | What it does | When you need it |
|---|---|---|---|
| `set -e` | exit on error | Aborts the script when any command returns non-zero | CI pipelines; default in GitHub Actions |
| `set +e` | disable exit on error | Keeps the script running after a non-zero command | Around commands where failure is expected data |
| `set -u` | unset variable guard | Exits if an undefined variable is expanded | Catching typos in variable names |
| `set -x` | xtrace | Prints each command before executing it | Debugging: seeing exactly what runs and with what values |
| `set -o pipefail` | pipefail | A pipeline fails if any command in it fails, not just the last | CI pipelines with multiple-stage pipes |

## Completion criterion

After reading this, you should be able to:

1. Explain why a script that works locally can fail in GitHub Actions.
2. Choose between `set +e`, `|| true`, and `set -o pipefail` to handle a pipeline that legitimately produces no matches.
3. Use `set -x` for debugging and `set -u` to catch unset variables.

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
