---
title: 📝 Playing with TF
---
import Giscus from "@giscus/react";

well, you will always find ways to improve things, when i was first writing the tf scripts, i needed to grab the argocd load balancer url, so i can feed it into the github webhook instead of having to do it manually

so i decided to use program execution process, like using kubectl wayyyy.

```bash title="argocd.tf"
// get the load balancer url after the argocd helm deployment is done
data "external" "get_loadbalancer_url" {
  depends_on = [helm_release.argocd]
  program    = ["sh", "-c", "kubectl get services -n argocd --selector=app.kubernetes.io/name=argocd-server -o jsonpath='{\"{\"}\"minio-bucket\": \"{.items[0].status.loadBalancer.ingress[0].hostname}\"}' | jq -c"]
}

// create the github webhook using the data from the above resource, add https to it and strip off the "%" value at the end of the results

resource "github_repository_webhook" "argocd" {
  # depends_on = [data.external.get_loadbalancer_url]
  repository = "gitops-repo"
  configuration {
    url          = trimsuffix(join("", ["https://", "${values(data.external.get_loadbalancer_url.result)[0]}"]), "%")
    content_type = "json"
    secret       = var.avoid-ddos-webhook //the secrets to avoid ddos if argo link is exposed
    insecure_ssl = true
  }

  active = true

  events = ["push"]
}
```

you would agree with me, that isnt an healthy process there, but it works right, haha, yes it works, but there is always room for improvement

knowing that the loadbalancer ingress is a kubernetes service, why not pull it back using the data source of kubernetes service, that looks more healthy and doesnt depend on kubectl shell execution.

A great way and good thing for those who might be moving their IaC to pipelines.

```bash title="argocd.tf"
data "kubernetes_service" "argocd_server_service" {
  metadata {
  name      = "argocd-server"
  namespace = "argocd"
  }
}

resource "github_repository_webhook" "argocd" {
  # depends_on = [data.kubernetes_service.argocd_server_service]
  repository = "gitops-repo"
  configuration {
    url          = "https://${data.kubernetes_service.example_service.status[0].load_balancer[0].ingress[0].hostname}"
    content_type = "json"
    secret       = var.avoid-ddos-webhook //the secrets to avoid ddos if argo link is exposed
    insecure_ssl = true
  }

  active = true

  events = ["push"]
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