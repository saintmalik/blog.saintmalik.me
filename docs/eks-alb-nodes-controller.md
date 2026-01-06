---
title: AWS EKS LB controller can’t register Worker nodes to Target Group
---
import Giscus from "@giscus/react";

So i had deployments which had loadbalancer and ingress, but yes they got created succefully and what happen to then, they are not working, so whats the cause.

I checked the the through the console the loadbalancer, target groups found nothing pointing to the error, so i checked the alb contoller logs, what i should have done at first, haha.

```bash
kubectl logs deployment/aws-load-balancer-controller -n kube-system
```
 and after checking the logs, i found the error saying this

```bash
"error":"expect exactly one securityGroup taggedwith kubernetes.io/cluster/clustername: owned for eni eni-0e11cbc41dd583bec, got: [sg-0xxxxxxx sg-0xxxxxx]"
```

So it means two cluster security group are having this tag ```kubernetes.io/cluster/clustername: owned```, so what happened? i created a single cluster security group using using eks module.

So i learnt that eks will create a cluster security group by default, totally irrelevant to the eks module, so now we are left with the option to remove the tag  ```kubernetes.io/cluster/clustername: owned``` from the default security group eks created

But well you can do it the other way too, sinces this are tags, they are harmles, its just a means of identification and selection.

You can make sure too override the tags using the following code, that if you have provisioned your cluuster using terraform

```bash title="eks.tf"
  tags = {
    Environment = "${var.env}"
    "kubernetes.io/cluster/${var.eks-name}" = "shared"
    Terraform = "true"
  }
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