---
title: Debug cron script
---
import Giscus from "@giscus/react";

Cron Job showing different results from what the results shown on terminal when you run the shell script.

Reasons: Cron tasks run in a shell that is started without your login scripts being run, which set up paths, environment variables etc.

When building cron tasks, prefer things like absolute paths and explicit options etc

- `env -I /pathtoyourbashscript.sh`
- `env -u root -I /pathtoyourbashscript.sh` (running as root can also help), or better still do `chmod +x /yourbashscript.sh` and use the first command instead

`trap "set +x; sleep 5; set -x" DEBUG`

making sure, each scripts runs one after the other, good for debug

Notion Split screen shift + command + n, navigate page command + ~


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