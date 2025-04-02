---
title: 📝 Images can’t contain alpha channels or transparencies.
---
import Giscus from "@giscus/react";

The error ``Images can’t contain alpha channels or transparencies``, experienced it while trying to update the screenshots of our app via appstore connect interface.

But using ImageMagick’s mogrify command, was able to resolve it

```bash
/opt/homebrew/bin/magick mogrify -alpha off -format png /abdulmalik/downloads/ios/*.png
```

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