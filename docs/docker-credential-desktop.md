---
title: Fix docker-credential-desktop executable file not found in $PATH
description: Resolve Docker "error getting credentials - err: exec docker-credential-desktop executable file not found in $PATH" by fixing ~/.docker/config.json credsStore on macOS.
---

import Giscus from "@giscus/react";

You hit something like:

```bash
error getting credentials - err: exec: "docker-credential-desktop": executable file not found in $PATH, out:
```

or the sibling `exec format error` when Docker tries to run `docker-credential-desktop.exe`.

Docker is trying to call a credential helper named `desktop` (from Docker Desktop). That binary is not on your `PATH`, or you are in a Linux/WSL/CI context where the Desktop helper does not exist. Login, pull, and BuildKit then fail on credential lookup.

## Fix: edit `~/.docker/config.json`

Open `~/.docker/config.json` and look for **`credsStore`** (with an **s**).

Docker Desktop often leaves:

```json
{
  "credsStore": "desktop"
}
```

That is the line that triggers `docker-credential-desktop`. Remove `"credsStore": "desktop"` (or change it to a helper you actually have, like `"osxkeychain"` on macOS).

Leave alone if you still have a separate `"credStore"` key without the **s**. That is a different, older field; the helper that breaks people is almost always **`credsStore`**.

Example after the edit:

```json
{
  "auths": {}
}
```

or, on macOS with the keychain helper:

```json
{
  "credsStore": "osxkeychain"
}
```

Retry `docker login` / `docker pull`. That is usually enough.

## Why this shows up

- Config was written by Docker Desktop, then you use the CLI from a shell where Desktop's helper is not installed (Homebrew Docker, Colima, remote builders, CI).
- WSL or Linux containers see a Windows `.exe` helper path and die with `exec format error`.
- A copied `~/.docker/config.json` from another machine still points at `desktop`.

## If it still fails

1. Confirm you edited the config your CLI actually reads: `echo $DOCKER_CONFIG` (defaults to `~/.docker`).
2. Search for leftover helpers: `grep -n credsStore ~/.docker/config.json`.
3. On WSL, prefer a Linux-side Docker/engine config, not a Windows Desktop `credsStore` pointing at `.exe`.

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
