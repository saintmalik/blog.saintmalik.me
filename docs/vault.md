---
title: 📝 Vault Hashicorp
---

import Giscus from "@giscus/react";

So vault injector isnt injecting the sidecar for your deployments, you've checked the log and you see only a log about Updating cert, webhook....

Just restart the vault-injector deployment and everything should be good, applicable to eks v1.27, vault helm chart 0.25.0

Further more, chances are your service are not communicating with each other, revise your namespace network policies.

using EKS and node security group with your cluster? chances are the ingress isnt receiving the traffic, a quick fix but not recommended is allowing everything from cluster security group

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