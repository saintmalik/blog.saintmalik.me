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

There are many tools for handling complex architecture of deploying changes of your applications from the build stage to your cluster, most times the term and process of archiving this is called GitOps only if GitHub is being used as the single source of truth in the scenario.
<!--truncate-->
And out of many of these tools, ArgoCD is one of the best that you can use, it's also open source, and that's what I am writing about here.

## Prerequisites:
- A Running Kubernetes Cluster provisioned using terraform
- Kubectl is installed and your kubeconfig file is set too(~/.kube/config).
- Your deployments yaml file in your GitHub repository, you can git clone mine, <a href="https://github.com/saintmalik/gitops-argocd" target="_blank">gitops-argocd</a>

## Install Argo CD to your cluster

Using the following terraform code, you can deploy argocd into your existing kubernetes cluster, but before you apply this code using ```terraform apply --auto-approve```, you need to create a folder named **argocd** and save the below configurations as **install.yaml** in the **argocd** folder you just created.

The below argocd configurations is not good for production, because this isn't implementation for HA(High Availability), you can check <a href="https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/#high-availability" target="_blank">argocd HA docs</a> to set production-ready config values.


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
    name = "argocd"
  }
}

resource "helm_release" "argocd" {
  name       = "argocd"
  chart      = "argo-cd"
  repository = "https://argoproj.github.io/argo-helm"
  version    = "6.7.11"
  timeout    = "1500"
  namespace  = kubernetes_namespace.argocd.id
  values = [data.template_file.argo-values.rendered]
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

Here is the terraform code for the variable used, as well as the provider used here, copy and paste this into your **variable.tf** file and **provider.tf** file

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
      source  = "alekc/kubectl"
      version = "2.0.4"
    }
  }
```

Once you have applied the above terraform codes, Argocd will be deployed in your **argocd** namespace and load balancer to access argocd server via UI, will be generated too, you can find it by running ```kubectl get svc -n argocd```

Also, the generated password to access your argocd server will be stored in the **argocd-login.txt** file for you, and you will notice the **del-argo-pass null_resource** in the terraform code.

What that section of the code does is that, after you have gotten the come-along argocd server password, it's security-wise to delete the secret from our cluster, it's mentioned in the argocd docs too.

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
            prune: true //by default auto sync will not delete resources, but to allow argocd to also delete what you have deleted, set prune to true
            selfHeal: true //auto override any manual changes made by devs or other people with cluster access
```

If everything goes well, you should see that your application will be synced and deployed in minutes, but our's didn't, this is because I am using a private repository and this is the error I am getting.

```yaml
ComparisonError
rpc error: code = Unknown desc = error creating SSH agent: "SSH agent requested but SSH_AUTH_SOCK not-specified"
```

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-error.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-error.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-error.jpg`} alt="Okay, thats all"/>
</picture>

So let's fix this.

## Connect Argocd with private repo manually or declaratively

### 👉 Step 1 - Generate ssh keypairs

You will need to generate a passwordless SSH key pair, you can use either ```-P ""```, or using ```-N ''``` by, leaving the strings empty it will create our keypairs without the need for CLI interaction.

```yaml
ssh-keygen -t ed25519 -C blog.saintmalik.me -N '' -f argo
```
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-ssh-keypairs.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-ssh-keypairs.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-ssh-keypairs.jpg`} alt="Okay, thats all"/>
</picture>

This will generate two files for you, ```argo``` which holds the private ssh key and ```argo.pub``` which holds the public ssh key

### 👉 Step 2 - Add the ssh public key to your repository

Now go to your GitHub repository settings and navigate to the **Deploy Keys** and click **Add deploy key** to add the public SSH key you generated earlier, it's inside the **argo.pub** file.

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

Now that you have added the private key to your repository, it's time for us to add the public key to your argocd server, so click the **settings** at the sidebar and hit the **CONNECT REPO** button and it should bring a screen just like the below image.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connect-ssh-config.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connect-ssh-config.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/argocd-connect-ssh-config.jpg`} alt="Okay, thats all"/>
</picture>

This is where you will add the private SSH key from the ```argo``` file you generated earlier, the **repository URL** should be added too in the format same as the one you are seeing in the screenshot and the Project selection should be ```default```.

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
Only YAML files available in the **dev** folder of our repository will be deployed and luckily, I only have one, and that is the single deployment that you are seeing in the above screenshot
:::

### 👉 Step 4 - Testing to see if everything works

So to confirm if all you have done works well, you can now alter the image in our deployment yaml file from our GitHub repository, so I will edit the yaml file from Github now

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/make-changes.webp`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/make-changes.jpg`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/make-changes.jpg`} alt="Okay, thats all"/>
</picture>

So I have changed the nginx image tag from _nginx:1.14.2_ to _nginx:latest_, so once I commit the changes, you can see it getting deployed real-time.

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

### Bonus step
You can also automate both steps 2 and 3 using Terraform, using terraform you can add the public key to your repository and also add the private key to your argocd server.

the catch here is that you need to add the GitHub provider to your Terraform code which also requires you to create a GitHub token.

```yaml title="provider.tf"
terraform {
  required_version = ">= 1.7.0"
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
provider "github" {
  token = "your-github-token" //e.g 1234567890"
  owner = "your-github-username" //e.g saintmalik"
}
  ```

```yaml title="argocd.tf"
resource "github_repository_deploy_key" "argocd_repo_deploykey" {
  title      = "argocd-connect"
  repository = "gitops"
  key        = "Replace this with the public key you generated in step 1"
  read_only  = "false"
}
```

```yaml title="argocd.tf"
resource "kubernetes_secret_v1" "ssh_key" {
  metadata {
    name      = "private-repo-ssh-key"
    namespace = kubernetes_namespace.argocd.id
    labels = {
      "argocd.argoproj.io/secret-type" = "repository"
    }
  }

  type = "Opaque"

  data = {
    "sshPrivateKey" = "REPLACE THIS WITH THE SSH PRIVATE KEY YOU GENERATED IN STEP 1""
    "type"          = "git"
    "url"           = "git@github.com:saintmalik/gitops-argocd.git"
    "name"          = "github"
    "project"       = "default"
  }
}
```

Additionally, for faster syncing of your argocd deployment quicker when you make a new commit, you can add a webhook to your repository to trigger argocd to sync your application when there is a new commit.

This will help you avoid the 3-minute wait time for argocd to sync your application.

```yaml title="argocd.tf"
data "kubernetes_service" "argocd_server" {
  metadata {
    name      = "argocd-server"
    namespace = "argocd"
  }
}

resource "github_repository_webhook" "argocd" {
  repository = "gitops"
  configuration {
    url          = "https://${data.kubernetes_service.argocd_server.status.0.load_balancer.0.ingress.0.hostname}"
    content_type = "json"
    secret       = "skrrskrrrii" //the secrets to avoid ddos if argo link is exposed, its just a random texts
    insecure_ssl = true
  }

  active = true

  events = ["push"]
}
```

Well, that's it, folks! you have just learned how to deploy argocd into your existing cluster that is created with terraform from the get start, likewise how to deploy your application on argocd and how to connect private repo with argocd.

If you encounter some issues in the process, here are my curated <a href="https://blog.saintmalik.me/docs/argocd-related-issues/" target="_blank">argocd issues</a>, you can look into it.

Till next time 🤞🏽

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