---
title: Debug cron script
---

import Giscus from "@giscus/react";

Cron jobs often behave differently from the same script run in an interactive shell because cron starts a minimal environment: no login scripts, no familiar PATH, and no loaded dotfiles.

## When this applies

Use this runbook when a script works in your terminal but produces different output or fails as a cron job.

## Diagnostic steps

### 1. Reproduce the cron environment

Run the script with a stripped environment to confirm the issue:

```bash
env -i /path/to/your/script.sh
```

Or run it as root if the crontab is owned by root:

```bash
sudo env -i /path/to/your/script.sh
```

A better default is to make the script executable and call it directly:

```bash
chmod +x /path/to/your/script.sh
env -i /path/to/your/script.sh
```

### 2. Harden the script

Inside the script itself:

- Use absolute paths for every command and file.
- Export the PATH you need explicitly.
- Do not rely on `~` expansion or aliases.

```bash
#!/bin/bash
export PATH=/usr/local/bin:/usr/bin:/bin
LOG_FILE=/var/log/my-job.log
/usr/local/bin/my-command >> "$LOG_FILE" 2>&1
```

### 3. Trace execution

Add a debug trap to see each command as it runs:

```bash
#!/bin/bash
set -x
trap "set +x; sleep 5; set -x" DEBUG
```

The `sleep 5` gives you time to read the trace between commands. Remove it once the bug is found.

### 4. Inspect cron logs

Most systems log cron output to `/var/log/syslog` or `/var/log/cron`. Check there for the exact error and exit code.

## Completion criterion

The cron job is fixed when:

1. The script runs successfully under `env -i`.
2. The script uses absolute paths and explicit environment variables.
3. The cron entry matches the user and path you tested.
4. A test run in cron produced the expected output or log entry.

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
