---
title: 📝 Solution to Docker err exec "docker-credential-desktop" executable file not found in $PATH, out
---

import Giscus from "@giscus/react";

```bash
accessing entity: error getting credentials - err: exec: "docker-credential-desktop": executable file not found in $PATH, out:
```

just edit your **~/.docker/config.json** and remove the ```"credsStore" : "desktop"``` and leave the ```"credStore" : "desktop"```

Thats all

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