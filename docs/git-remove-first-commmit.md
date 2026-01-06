---
title: Removing the first commit on your repo can be tricky, here is how
---
import Giscus from "@giscus/react";

If it happens that you have committed a secret value which is the first commit iin your repo, and then you've had consecutive commits after that, it would be tricky, you cant use git reset, rebase or revert, because they can only work to a certain points.

So its better to flush out the commits, starting from the first commits.

```
git update-ref -d HEAD
```

now run ```git add .``` and ```git commit -m "nice"``` and finally push a force update.

```
git push origin main -f
```

reference: <a href="https://stackoverflow.com/questions/10911317/how-to-remove-the-first-commit-in-git" target="_blank">https://stackoverflow.com/questions/10911317/how-to-remove-the-first-commit-in-git</a>

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