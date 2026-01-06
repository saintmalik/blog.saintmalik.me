---
title: 📝 Terraform Destroy
---

So just like every other new terraform users, haha, i made some mistakes early on too.

where i tore down the whole infrastructure using ```terraform destroy --auto-approve``` just because i want to delete an helm installation.

it wasnt a nice process cause it takes alot of time to destroy and even to apply back, so you see its not a funny experience.

i got to know about ```terraform destroy --target``` later on, which allows you to delete a certain item.

so let's say i installed argocd using helm chart just like this

```yaml
resources "helm_release" "argocd" {
  name       = "argocd"
  chart      = "argo-cd"
  repository = "https://argoproj.github.io/argo-helm"
  version    = "5.19.6"
  ......
  }
```

if i want to tear down argocd alone, i would run ```terraform destroy --target=helm_release.argocd``` and it will tear down the argocd installations alone.

So proceeding i encounteered another issues too, i decided to tear down the whole infra and then some items refused to get destroy saying they **have some dependencies and cannot be deleted**, here is an example

```yaml
The vpc 'vpc-0xxxxxxxxxxxdca' has dependencies and cannot be deleted.
```

All you have to do is some manual tear down via aws console, like vpc dependencies? could be some target groups, could be some load balancers refusing to be destroyed.

So when you are done with the dependencies tear down, you can re-run the ```destroy``` command and you should be good.

check another write up on fixing <a href="/docs/terraform-destroy/" target="_blank">have some dependencies and cannot be deleted</a>

Thats all folks!