---
slug: declarative-setup-clusters-gitops-and-argocd
title: Declarative Setup of Multiple Kubernetes Clusters with GitOps and ArgoCD
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/gitops-argocd.jpeg
tags: [gitops, devops]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

You've probably gotten to a point where you need to manage multiple clusters using GitOps, knowing that managing the argocd instance itself can be considered tedious or painful, haha, meaning you sure do not want to install new argocd instances on other new kubernetes clusters.

<!--truncate-->

So what's the bet? you would use your existing argocd instance to manage multiple clusters, awesome right? Good! Let’s jump into how to do it with ArgoCD

## Requirements

- <a href="https://blog.saintmalik.me/argocd-on-kubernetes-cluster/" target="_blank">Existing ArgoCD instance on EKS Cluster</a>
- kubectl
- A new cluster created using Terraform
- knowledge of terraform

To add a new kubernetes cluster to an existing argocd instance, you could literarily use the cli route by running the following commands.

```
argocd login YOURARGOCDLOADBALANCER:80 --username admin
```

after running this command you will be asked for your argocd password, input it, hit enter, then run ```argocd app list``` to see the list of applications available on your argocd server.

the response would be one app for sure, now run the following command to add your newly created kubernetes cluster.
```
argocd cluster add YourEksClusterARN  —name yournew-cluster-name
```

To get your EKS Cluster ARN value, run the following command, where you replace the *YOURCLUSTERNAME* and the region value with yours.

 ```
 aws eks describe-cluster --name YOURCLUSTERNAME --region us-east-1 | grep "arn:aws:eks"
```

Guess you see, this is so easy to achieve using the CLI route, but yes doing this in a declarative way is the best bet, so let's jump into it in a declarative way!.

## Add Multiple Cluster to ArgoCD using the Declarative Method

So basically, what you are trying to achieve here, is granting the argocd instance in the exiting instance a long-lasting authentication process coupled with authorization in order to deploy your deployment yaml files across the new cluster the GitOps way.

So which authorization method is suitable for use in this scenario? ServiceAccount!

### Why the ServiceAccount Authentication method?

Service account bearer tokens are perfectly valid to use outside the cluster and can be used to create identities for long-standing jobs that wish to talk to the Kubernetes API. To manually create a service account, use the kubectl create serviceaccount (NAME) command. This creates a service account in the current namespace. <a href="https://kubernetes.io/docs/reference/access-authn-authz/authentication/#bootstrap-tokens">refrence to kubernetes docs</a>

### Setup up serviceaccount token, role, role binding with terraform

In your existing Terraform IaC folder used for your new EKS cluster, create a new file named **argocd.tf** and add the following codes.

```yaml title="argocd.tf"
resource "kubernetes_service_account_v1" "argocd-auth-manager" {
  metadata {
    name      = "argocd-manager"
    namespace = "kube-system"
  }
}
resource "kubernetes_secret_v1" "argocd_secret" {
  metadata {
    name      = "argocd-manager-token"
    namespace = "kube-system"
    annotations = {
      "kubernetes.io/service-account.name" = "${kubernetes_service_account_v1.argocd-auth-manager.metadata.0.name}"
    }
  }
  type = "kubernetes.io/service-account-token"
}
resource "kubernetes_cluster_role_v1" "argocd_gitops" {
  metadata {
    name = "argocd-manager-role"
  }
  rule {
    api_groups = ["*"]
    resources  = ["*"]
    verbs      = ["*"]
  }
}
resource "kubernetes_cluster_role_binding_v1" "argocd_gitops" {
  metadata {
    name = "argocd-manager-role-binding"
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "argocd-manager-role"
  }
  subject {
    kind      = "ServiceAccount"
    name      = "argocd-manager"
    namespace = "kube-system"
  }
}
//Get the secrets created from the serviceaccount
data "kubernetes_secret_v1" "argocd_secret" {
  metadata {
    name  = kubernetes_secret_v1.argocd_secret.metadata.0.name
    namespace = "kube-system"
  }
}
resource "aws_ssm_parameter" "gitops-argocd-authN" {
  name      = "/gitops/argocd"
  value     = data.kubernetes_secret_v1.argocd_secret.data["token"]
  type      = "SecureString"
  overwrite = true
}
resource "aws_ssm_parameter" "gitops-argocd-authCA" {
  name      = "/gitops/argocdca"
  value     = data.kubernetes_secret_v1.argocd_secret.data["ca.crt"]
  type      = "SecureString"
  overwrite = true
}
resource "aws_ssm_parameter" "gitops-argocd-serverurl" {
  name      = "/gitops/serverurl"
  value     = module.eks.cluster_endpoint
  type      = "SecureString"
  overwrite = true
}
```

The above terraform code creates K8s ServiceAccounts, K8s secret off the ServiceAccounts, Role, and RoleBindings in the new kubernetes cluster you want to add to the existing argocd instance.

And proceeded with retrieving the K8s secret you've just created, so we can extract the serviceaccount token, kubernetes CA(Cluster Authority) cert, and also store the eks cluster endpoint all together into AWS SSM Parameter Store as a SecureString.

You will still be making reference back to the serviceaccount token, CA cert and eks cluster endpoint you just stored in the Parameter Store.

:::note
You can always revise the cluster role rules and streamline the access to your own specification, maybe you want the argocd to be able to deploy to the default namespace alone and more.
:::

### Connect the new kubernetes cluster to the existing ArgoCD

If you are already using terraform IaC to power your ArgoCD instance kubernetes cluster, then it can be more relieving to spin the connection up.

All you have to do is create a new file named **argocd-connect.tf** paste the following codes, then run ```terraform plan && terraform apply -auto-approve```

```yaml title="argocd-connect.tf"
## Here you are saying you need the values you stored in the AWS SSM Parameter Store back
data "aws_ssm_parameter" "gitops-argocd-authCA" {
  name = "/gitops/argocdca"
}
data "aws_ssm_parameter" "gitops-argocd-authN" {
  name = "/gitops/argocd"
}
data "aws_ssm_parameter" "gitops-argocd-serverurl" {
  name = "/gitops/serverurl"
}
resource "kubectl_manifest" "argocd-cluster-connect" {
  yaml_body = <<-EOF
apiVersion: v1
kind: Secret
metadata:
  name: my-new-cluster-secret
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: my-cluster-name
  server: ${data.aws_ssm_parameter.gitops-argocd-serverurl.value}
  config: |
    {
      "bearerToken": "${data.aws_ssm_parameter.gitops-argocd-authN.value}",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "${data.aws_ssm_parameter.gitops-argocd-authCA.value}"
      }
    }
```

But if it happens that you didn't use terraform IaC for your existing ArgoCD instance, you can simply create a deployment yaml file named **argocd-connect.yaml** and paste the following code there.

```yaml title="argocd-connect.yaml"
apiVersion: v1
kind: Secret
metadata:
  name: my-new-cluster-secret
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: my-cluster-name
  server: YOUR EKS CLUSTER API ENDPOINT
  config: |
    {
      "bearerToken": "YOUR SERVICE ACCOUNT TOKEN",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "YOUR CLUSTER CA"
      }
    }
```

Then you can run the following command in your existing ArgoCD instance cluster

```
kubectl apply -f argocd-connect.yaml
```

Now you have more than one kubernetes cluster controlled by a single argocd instance, one argocd instance deployment to worry about, haha.

Also, there is another recommended process of doing this using argocd-k8s-auth and IRSA, basically authenticating using the OIDC method instead of using the long-lasting serviceaccount token.

Well, that's it, folks! I hope you find this piece insightful and helpful.

Till next time ✌️

#### References
- https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#clusters
- https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#eks

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