---
slug: argocd-on-kubernetes-cluster
title: Installing ArgoCD on Kubernetes Cluster with Terraform
author: Abdulmalik
author_title: AppSec Engineer
author_url: https://twitter.com/saintmalik_
author_image_url: https://saintmalikme.mo.cloudinary.net/bgimg/logo.gif
image: https://saintmalikme.mo.cloudinary.net/bgimg/gitops-argocd-k8s.png
tags: [argocd, gitops, terraform, kubernetes]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

There are many tools for handling complex architecture of deploying changes of your applications from the build stage to your cluster, most times the term and process of archiving this is called GitOps only if github is being used as the single source of truth in the scenerio.
<!--truncate-->
And out of many of these tools, ArgoCD is one among the best that you can use, its also open source, and thats what we are writing about here.

## Prerequisites:
- A Running kubernetes Cluster provisioned using terraform
- Kubectl installed and your kubeconfig file is set too(~/.kube/config).
- Your deployments yaml file in your github repository, you can git clone mine, <a href="https://github.com/saintmalik/gitops-argocd" target="_blank">gitops-argocd</a>

## Install Argo CD to your cluster

Using the following terraform code, you can deploy argocd into your existing kubernetes cluster, but before you apply this code using ```terraform apply --auto-approve```, you need to create a folder named **argocd** and save the below configurations as **install.yaml** in the **argocd** folder you just created.

The below argocd configurations is not good for production, because we didnt implement HA(High Availabilty) Settings, you can check <a href="https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/#high-availability" target="_blank">argocd docs</a> to set production ready config that has HA.


```yaml title="install.yaml"
# redis-ha:
#   enabled: true

controller:
  replicas: 1

server:
  replicas: 1
  service:
    type: LoadBalancer

repoServer:
  replicas: 1

applicationSet:
  replicaCount: 1
  # replicaCount: 2
```

```yaml title="argocd.tf"
resource "kubernetes_namespace" "argocd" {
  metadata {
    name = "argocd-${var.env}"
  }
}

resource "helm_release" "argocd-staging" {
  name       = "argocd-staging"
  chart      = "argo-cd"
  repository = "https://argoproj.github.io/argo-helm"
  version    = "5.27.3"
  namespace  = "argocd-staging"
  timeout    = "1200"
  values     = [templatefile("./argocd/install.yaml", {})]
}

resource "null_resource" "password" {
  provisioner "local-exec" {
    working_dir = "./argocd"
    command     = "kubectl -n argocd-staging get secret argocd-initial-admin-secret -o jsonpath={.data.password} | base64 -d > argocd-login.txt"
  }
}

resource "null_resource" "del-argo-pass" {
  depends_on = [null_resource.password]
  provisioner "local-exec" {
    command = "kubectl -n argocd-staging delete secret argocd-initial-admin-secret"
  }
}

}
```

Here is the terraform code for the variable used, also the provider used here, copy paste this into your **variable.tf** file and **provider.tf** file

```yaml title="variable.tf"
variable "eks-name" {
  type    = string
  default = "my-cluster"
}

variable "env" {
  default = "staging"
}

```

```yaml title="provider.tf"

terraform {
  required_version = ">= 1.0"
  required_providers {
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = ">= 1.14.0"
    }
  }
```

Once you have applied the above terraform codes, Argocd will be deployed in your **argocd-staging** namespace and loadbalancer to access argocd server via UI, will be generated too, you can find it by running ```kubectl get svc -n argocd-staging```

Also the generated password to access your argocd server will be stored in the **argocd-login.txt** file for you, and you will notice the **del-argo-pass null_resource** in the terraform code.

What that section of the code does is that, after we have gotten the come along argocd server password, its security wise to delete the secret from our cluster, its mentioned in the argocd docs too.

### Argo CD Application

And here is the Application yaml file, the following yaml will help you create an application on your argocd server.

create `application.yaml` file and copy the below yaml codes there and apply using ```kubectl apply -f ./argocd/application.yaml``` and you are good to go.

```yaml title="./argocd/application.yaml"
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argo-test-app
  namespace: argocd-staging
spec:
     project: default
     source:
       repoURL: git@github.com:saintmalik/gitops-argocd.git
       targetRevision: HEAD
       path: dev
       directory:
         recurse: true
     destination:
       server: https://kubernetes.default.svc
       namespaces: default
     syncPolicy:
          syncOptions:
          - CreateNamespace=true
          automated:
            prune: true
            selfHeal: true
```

For those curious about what the above configuration does, here is the explanation.

```yaml
     source: // this is the repo you hold all your deployment yaml file, you can use either github, gitlab or bitbucket repo
       repoURL: git@github.com:saintmalik/gitops-argocd.git
       targetRevision: HEAD // to always look for the top/latest commit
       path: dev // this is the folder where my dev deployment are, folder base environment promotion is the best according to argo docs
       directory:
         recurse: true //if there appears to be a sub folder,, it should be included too and process
     destination: //this is the cluster you want does deployment yaml file to be deployed to for you
       server: https://kubernetes.default.svc // the defualt cluster dns
       namespaces: default //and the namespace they should be deployed too
     syncPolicy:
          syncOptions:
          - CreateNamespace=true //create namespace for the destination namespace set if non available
          automated: //to pull the changes in every 3 minutes, this can be overriden using configuring git webhook
            prune: true //by default auto sync will not delete resources, but to allow argocd to also delete what we have deleted, set prune to true
            selfHeal: true //auto override any manual changes made by devs or other people with cluster access
```

If everything goes well, you should see that your application will be synced and deployed in some minutes, but our's didnt, this is because i am using a private repository and this is the error i am getting.

```yaml
ComparisonError
rpc error: code = Unknown desc = error creating SSH agent: "SSH agent requested but SSH_AUTH_SOCK not-specified"
```

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-error.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-error.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-error.jpg`} alt="Okay, thats all"/>
</picture>

So lets fix this.

## Connect Argocd with private repo

### 👉 Step 1 - Generate ssh keypairs

You will need to generate a passwordless ssh keypairs, you can use either ```-P ""```, or using ```-N ''``` by, leaving the strings empty it will create our keypairs without need for cli interaction.

```yaml
ssh-keygen -t ed25519 -C blog.saintmalik.me -N '' -f argo
```
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-ssh-keypairs.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-ssh-keypairs.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-ssh-keypairs.jpg`} alt="Okay, thats all"/>
</picture>

This will generate two file for you, ```argo``` which holds the private ssh key and ```argo.pub``` which holds the public ssh key

### 👉 Step 2 - Add the ssh public key to your repository

Now goto your github repository settings and navigate to the **Deploy Keys** and click **Add deploy key** to add the public ssh key we generated earlier, its inside the **argo.pub** file.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/add-deploy-key-argocd.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/add-deploy-key-argocd.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/add-deploy-key-argocd.jpg`} alt="Okay, thats all"/>
</picture>

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/adding-public-keypair-deploy.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/adding-public-keypair-deploy.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/adding-public-keypair-deploy.jpg`} alt="Okay, thats all"/>
</picture>

### 👉 Step 3 - Configure and connect your private repo

Now that we have added the private key to your repository, its time for us to add the public key to your argocd server, so click the **settings** at the sidebar and hit the **CONNECT REPO** button and it should bring a screen just like the below image.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connect-ssh-config.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connect-ssh-config.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connect-ssh-config.jpg`} alt="Okay, thats all"/>
</picture>

This is where you will add the private ssh key from the ```argo``` file you generated earlier, the **repository URL** should be added too in the format same as the one you are seeing in the screenshot and the Project selection should be ```default```.

When you are done with the configuration, click on the **CONNECT** button and you should see a success message just like this.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/sucess-gitops.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/sucess-gitops.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/sucess-gitops.jpg`} alt="Okay, thats all"/>
</picture>

If this shows success, then your deployment argo app should be synced and healthy already and it should look just like this

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/synced-app.webp`} alt="synced repo for app"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/synced-app.jpg`} alt="synced repo for app"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/synced-app.jpg`} alt="synced repo for app"/>
</picture>

When you click on the app, you should see more details about your deployment just like this

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/success-nginx.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/success-nginx.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/success-nginx.jpg`} alt="Okay, thats all"/>
</picture>

:::note
Only YAML files available in the **dev** folder of our repository will be deployed and luckily, we only have one, and that is the single deployment that you are seeing in the above screenshot
:::

### 👉 Step 4 - Testing to see if everything works

So to confirm if all we have done works well, we can now alter the image in our deployment yaml file from our github repository, so i will edit the yaml file from github now

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/make-changes.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/make-changes.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/make-changes.jpg`} alt="Okay, thats all"/>
</picture>

So i have changed the nginx image tag from _nginx:1.14.2_ to _nginx:latest_, so once i commit the changes we should see it getting deployed real time.

And here it is, it got deployed automatically, you see it created another replica and its deploying the new update and has terminated the existing pod created.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/updated-deployment-file.webp`} alt="update deployment file"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/updated-deployment-file.jpg`} alt="update deployment file"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/updated-deployment-file.jpg`} alt="update deployment file"/>
</picture>

#### Deployment Comparison

##### first image
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/live-manifest.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/live-manifest.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/live-manifest.jpg`} alt="Okay, thats all"/>
</picture>

##### second image

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/gitops-success.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/gitops-success.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/gitops-success.jpg`} alt="Okay, thats all"/>
</picture>

<!-- <picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/desired-manifest.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/desired-manifest.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/desired-manifest.jpg`} alt="Okay, thats all"/>
</picture> -->

<!-- <picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/create-application-yaml.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/create-application-yaml.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/create-application-yaml.jpg`} alt="Okay, thats all"/>
</picture> -->

Well, that's it, folks! you have just learnt how to deploy argocd into your existing cluster that is created with terraform from the get start, likewise how to deploy your application on argocd and how to connect private repo with argocd.

Till next time ✌️

#### References
- https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/

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