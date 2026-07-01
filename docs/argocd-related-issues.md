---
title: ArgoCD-related issues and solutions
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connection-timeout.webp`} alt="argocd-connection-timeout"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connection-timeout.jpg`} alt="argocd-connection-timeout"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connection-timeout.jpg`} alt="argocd-connection-timeout"/>
</picture>

A quick reference for ArgoCD problems I have hit and the fix that worked.

<!--truncate-->

| Symptom | Cause | Fix |
|---|---|---|
| `kubectl port-forward` drops or breaks after a few minutes | Idle connection timeout | Keep the tunnel alive with a looped `nc` probe |
| `failed to replace object: Service "argocd-server"` | Helm chart is forcing an immutable service update | Remove `force_update = true` from the Helm release |
| `server.secretkey is missing` | ArgoCD server secret was reset or not initialized | `kubectl rollout restart deploy/argocd-server -n argocd` |
| `error getting cached app resource tree: cache: key is missing` | Application controller cache is stale | `kubectl rollout restart statefulset -n argocd argocd-application-controller` |

## Keeping a port-forward alive

`kubectl port-forward` can drop when the connection goes idle. Open a second terminal and keep probing the local port:

```bash
while true; do nc -vz 127.0.0.1 8080; sleep 10; done
```

Replace `8080` with the port you forwarded.

## Completion criterion

The ArgoCD issue is resolved when:

1. The UI or CLI is reachable and stays reachable.
2. The application resource tree loads without cache errors.
3. Any service-related error is gone after removing `force_update = true`.

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
