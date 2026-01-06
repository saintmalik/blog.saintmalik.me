---
title: Exposing socket io and webservice on a service in EKS, ALB
---
import Giscus from "@giscus/react";
import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

Lets say one of your microservices has both socketio and regular http service endpoints too, so how do you expose both services on EKS using AWS ALB?

Can be tricky at first because you need to make the service available via your general api domain by registering the backend in your ingress.

```bash title="alb.yaml"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: My Ingress
  annotations:
    kubernetes.io/ingress.class: alb
spec:
  rules:
    - http:
        paths:
          - path: /v1/driver/
            pathType: Prefix
            backend:
              service:
                name: driver
                port:
                  number: 80
```

At the same time you want to you want the expose the service itself on the other hand via LoadBalancer instead of using NodePort, likewise you want to make sure your healthcheck is in place to avoid spammy logs from aws target.

At first i thought it wont be possible to have both ingress and service annotation in a single deployment file, but it turns out to be true, jaw breaking to see it work 😂.

Here is what your final serive yaml file will look like.

```bash title="alb.yaml"
apiVersion: v1
kind: Service
metadata:
  annotations:
      service.beta.kubernetes.io/aws-load-balancer-healthcheck-protocol: HTTP
      service.beta.kubernetes.io/aws-load-balancer-healthcheck-port: 'traffic-port'
      service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: /v1/drivers/alive
      service.beta.kubernetes.io/aws-load-balancer-healthcheck-success-codes: "200"
      service.beta.kubernetes.io/aws-load-balancer-healthcheck-timeout: '5'
      service.beta.kubernetes.io/aws-load-balancer-healthcheck-healthy-threshold: '2'
      service.beta.kubernetes.io/aws-load-balancer-healthcheck-unhealthy-threshold: '2'
      alb.ingress.kubernetes.io/healthcheck-protocol: HTTP
      alb.ingress.kubernetes.io/healthcheck-port: traffic-port
      alb.ingress.kubernetes.io/healthcheck-path: /v1/drivers/alive
      alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '5'
      alb.ingress.kubernetes.io/success-codes: '200'
      alb.ingress.kubernetes.io/healthy-threshold-count: '2'
      alb.ingress.kubernetes.io/unhealthy-threshold-count: '2'
  name: drivers
spec:
  selector:
    app: drivers
  ports:
  - protocol: TCP
    port: 80
  type: LoadBalancer
```

You will end up having two target group for a single service, one for the socketio exposed via LoadBalancer and one for the Ingress Backend.

its not like you cant still access your HTTP endpoints from the loadbalancer too, but since you are dealing with a microservice here, thats the best way i could think off.

OFcourse if you are using a monolithic service, you are good to go with only ```service.beta.kubernetes.io``` annotation.

Wondering why i didnt use the TCP health check also? that thing just get your logs spammed with unrelated logs.

<img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/chill.gif`} alt="Chill"/>

Till next time 🤞🏽

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