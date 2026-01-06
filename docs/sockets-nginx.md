---
title: Exposing socket io and webservice on a service in EKS, Nginx Ingress
---
import Giscus from "@giscus/react";
import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

Haha, i remembered dealing with getting socket io endpoints up on thier own domain in the past [Exposing socket io and webservice on a service in EKS, ALB](https://blog.saintmalik.me/docs/sockets-service-alb)

This solution worked then, lol, but it wasn't the perfect solution, why? there is more loadbalancer and ingress to deal with, cost? yes all the ingress and alb bears their own cost.

But what if i tell you, you can have a single ingress that serves many endpoints and service and still have socket io on it?

yeah, with nginx ingress

```bash title="nginx.yaml"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: My Ingress
  namespace: socketiiiiiing
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/force-ssl-redirect: "false"
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "server: hide";
spec:
  rules:
      http:
        paths:
          - path: /v1/driver/
            pathType: Prefix
            backend:
              service:
                name: driver
                port:
                  number: 8080
  ingressClassName: nginx
```

At the same time you want to you want the expose the service itself on the other hand via LoadBalancer instead of using NodePort, likewise you want to make sure your healthcheck is in place to avoid spammy logs from aws target.

At first i thought it wont be possible to have both ingress and service annotation in a single deployment file, but it turns out to be true, jaw breaking to see it work 😂.

Here is what your final serive yaml file will look like.

```bash title="nginx.yaml"
apiVersion: v1
kind: Service
metadata:
  name: driver
  namespace: socketiiiiiing
spec:
  type: NodePort
  selector:
    app: drivers
  ports:
  - protocol: TCP
    port: 8080
    targetPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: drivers-socketiiiing
  namespace: socketiiiiiing
spec:
  selector:
    app: drivers
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: drivers-ingress
  namespace: socketiiiiiing
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/server-name: "driverssocket.example.com"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      if ($http_upgrade != "websocket") {
        return 444;
      }
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
    nginx.ingress.kubernetes.io/proxy-set-header-upgrade: "$http_upgrade"
    nginx.ingress.kubernetes.io/proxy-set-header-connection: "upgrade"
    nginx.ingress.kubernetes.io/proxy-set-header-host: "$host"
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-buffering: "off"
spec:
  rules:
    - host: driverssocket.example.com
      http:
        paths:
        - path: /(socket.io|ws)(/|$)(.*)
          pathType: ImplementationSpecific
          backend:
            service:
              name: drivers-socketiiiing
              port:
                number: 80
  ingressClassName: nginx
```

Here you see, with a single node app that has both normal service and socket, we are able to expose the normal endpoint and also expose the socket service in it.

But yeah for this to work, you are definately using nginx ingress controller in your cluster already

Thats it.

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