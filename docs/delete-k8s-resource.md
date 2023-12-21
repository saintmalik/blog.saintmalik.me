---
title: forcefully delete resources
---
import Giscus from "@giscus/react";

Lets say you have a CRD resources hanging and not getting deleted

Get the crds

```bash
kubectl get crd
```

Get the CRD

```bash
kubectl get YOURCRD NAME
```
Edit  the CR

```bash
kubectl edit customresource/YOURCR NAME
```

Locate the finalizer and empty it

```bash
finalizers: []
```

Then delete again

```bash
kubectl delete customresource/YOURCR NAME
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