---
id: cron-scripting-issues
title: Debug cron script
---

## Debug cron script

Cron Job showing different results from what the results shown on terminal when you run the shell script.

Reasons: Cron tasks run in a shell that is started without your login scripts being run, which set up paths, environment variables etc.

When building cron tasks, prefer things like absolute paths and explicit options etc

- `env -I /pathtoyourbashscript.sh`
- `env -u root -I /pathtoyourbashscript.sh` (running as root can also help), or better still do `chmod +x /yourbashscript.sh` and use the first command instead

`trap "set +x; sleep 5; set -x" DEBUG`

///making sure, each scripts runs one after the other, good for debug

