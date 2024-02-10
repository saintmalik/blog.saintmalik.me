---
title: Argocd-related issues and solutions
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';


<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connection-timeout.webp`} alt="argocd-connection-timeout"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connection-timeout.jpg`} alt="argocd-connection-timeout"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connection-timeout.jpg`} alt="argocd-connection-timeout"/>
</picture>


breaking port-forward issues, this is not just for argocd alone, when you encounter breaking port forward issues on kubectl

just open another terminal and put the service up regardless using the following syntax

```
while true ; do nc -vz 127.0.0.1 8080 ; sleep 10 ; done
```

so 127.0.0.1 is your localhost you are port forwarding to and the 8080 port is something you can change to any port you are trying to port forward to.

so the command is ```while true``` keeps the netcat connection on a loop non-stop, and the ```sleep 10``` is needed because the ```while true``` is a hot loop, so ```nc -vz``` host port, helps keep querying the server for you to see if the connection is dead or successful, if not it continues.

hence keeping the connection alive

## failed to replace object: Service "argocd-server"

fixed by just remove force_update = true

## Argo CD error="server.secretkey is missing"

fixed by kubectl rollout restart deploy/argocd-server -n argocd

## Argo CD error="error getting cached app resource tree: cache: key is missing"
Actually it's enough to restart only applicationController's statefulset, ie.
kubectl rollout restart statefulset -n argocd argocd-application-controller