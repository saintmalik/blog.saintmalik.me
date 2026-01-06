---
slug: declarative-setup-clusters-gitops-and-argocd
title: Declarative Setup of Multiple Kubernetes Clusters with GitOps and ArgoCD
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/gitops-argocd.jpeg
tags: [gitops, devops]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

You've probably gotten to a point where you need to manage multiple clusters using GitOps, knowing that managing the argocd instance itself can be considered tedious or painful, haha, meaning you sure do not want to install new argocd instances on other new Kubernetes clusters.

<!--truncate-->

So what's the bet? you would use your existing argocd instance to manage multiple clusters, awesome right? Good! Let’s jump into how to do it with ArgoCD

## Requirements

- <a href="https://blog.saintmalik.me/argocd-on-kubernetes-cluster/" target="_blank">Existing ArgoCD instance on EKS Cluster</a>
- kubectl
- A new cluster, created using Terraform
- knowledge of terraform

To add a new Kubernetes cluster to an existing argocd instance, you could literally use the CLI route by running the following commands.

```
argocd login YOURARGOCDLOADBALANCER:80 --username admin
```

after running this command you will be asked for your argocd password, input it, hit enter, then run ``argocd app list`` to see the list of applications available on your argocd server.

the response would be one app for sure, now run the following command to add your newly created Kubernetes cluster.
```
argocd cluster add YourEksClusterARN  —name yournew-cluster-name
```

To get your EKS Cluster ARN value, run the following command, where you replace the *YOURCLUSTERNAME* and the region value with yours.

```
 aws eks describe-cluster --name YOURCLUSTERNAME --region us-east-1 | grep "arn:aws:eks"
```

Guess you see, this is so easy to achieve using the CLI route, but yes doing this in a declarative way is the best bet, so let's jump into it in a declarative way!

## Adding Multiple Clusters to ArgoCD using the Declarative Method

What you are trying to achieve here, is granting your argocd setup in the existing cluster a long-lasting authentication process coupled with authorization to deploy your deployment yaml files across the new cluster the GitOps way.

So how do you get this done? you can use both the ServiceAccount mode and the argocd-k8s-auth mode.

The ServiceAccount mode will work with all Kubernetes clusters be it GKE, EKS, AKS.

but the argocd-k8s-auth mode is more recommended, as it uses the OIDC method to authenticate the argocd instance to the new cluster.

The catch here is that the setup varies for different Kubernetes clusters, the setup for EKS is different from the setup for GKE and AKS.

But in this guide, you will be seeing the declarative setup of argocd using the ServiceAccount mode and argocd-k8s-auth mode with EKS.

## The ServiceAccount Authentication method

Service account bearer tokens are perfectly valid to use outside the cluster and can be used to create identities for long-standing jobs that wish to talk to the Kubernetes API. To manually create a service account, use the kubectl create service account (NAME) command. This creates a service account in the current namespace. <a href="https://kubernetes.io/docs/reference/access-authn-authz/authentication/#bootstrap-tokens">refrence to kubernetes docs</a>

### Setup up serviceaccount token, role, and role binding with Terraform

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

The above terraform code creates K8s ServiceAccounts, K8s secret off the ServiceAccounts, Role, and RoleBindings in the new Kubernetes cluster you want to add to the existing argocd instance.

And proceeded with retrieving the K8s secret you've just created, so we can extract the service account token, Kubernetes CA(Cluster Authority) cert, and also store the EKS cluster endpoint all together into AWS SSM Parameter Store as a SecureString.

You will still be referring back to the service account token, CA cert and EKS cluster endpoint you just stored in the Parameter Store.

:::note
You can always revise the cluster role rules and streamline the access to your specification, maybe you want the argocd to be able to deploy to the default namespace alone and more.
:::

### Connect the new kubernetes cluster to the existing ArgoCD

If you are already using terraform IaC to power your ArgoCD instance Kubernetes cluster, then it can be more relieving to spin the connection up.

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
      "bearerToken": "YOUR SERVICE ACCOUNT TOKEN created on the new cluster",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "YOUR NEW CLUSTER CA"
      }
    }
```

Then you can run the following command in your existing ArgoCD instance cluster

```
kubectl apply -f argocd-connect.yaml
```

Now you have more than one kubernetes cluster controlled by a single argocd instance, one argocd instance deployment to worry about, haha.

## The EKS Cluster secret using argocd-k8s-auth and IRSA method

### Setup up IAM role, and the IAM assumable role

First thing you will be creating here is an IAM assumable role, which will be assumed by another IAM role that will be used by the argocd instance deployment and also added to the aws-auth configmap in the new cluster.


```yaml title="argocd-instance-cluster.tf"
module "iam-assumable-role" {
  source                          = "terraform-aws-modules/iam/aws//modules/iam-assumable-role"
  create_role                     = true
  create_custom_role_trust_policy = true
  role_name                       = "argocd-role"
  custom_role_trust_policy        = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::xxxxxx:role/argocd"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF
}
```

Here you will be creating an IAM role that will assume the argocd-role, and the argocd-role will be used by the argocd instance deployment to assume the IAM role, so you can deploy your deployment yaml files across the new cluster the GitOps way.

```yaml title="argocd-instance-cluster.tf"
resource "aws_iam_role" "argocd_irsa_role" {
  name               = "argocd"
  description        = "Trusts argocd assume role "
  assume_role_policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::xxxxx:role/argocd-role"
            },
            "Action": "sts:AssumeRole"
        },
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "${module.eks.oidc_provider_arn}"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "${module.eks.oidc_provider}:sub": [
                        "system:serviceaccount:argocd:argocd-application-controller",
                        "system:serviceaccount:argocd:argocd-server"
                    ]
                },
                "StringLike": {
                    "${module.eks.oidc_provider}:aud": "sts.amazonaws.com"
                }
            }
        }
    ]
}
EOF
}
```

### Configure the argocd deployment to use the IAM role

Now you are done setting up the IAM role and the IAM assumable role, it's time to update your argocd deployment values.

By adding the created IAM Role above `arn:aws:iam::xxxxxx:role/argocd` to your controller and server deployment values of the argocd instance, you will be adding the following annotations to the deployment values ```annotations:
      eks.amazonaws.com/role-arn: "${aws_iam_role.argocd_irsa_role.arn}"
    automountServiceAccountToken: true```

Just like you can see in the code below.

```yaml title="argocd-instance-cluster.tf"
data "template_file" "values" {
  template = <<EOF
controller:
  replicas: 1
  serviceAccount:
    create: true
    name: argocd-application-controller
    annotations:
      eks.amazonaws.com/role-arn: "${aws_iam_role.argocd_irsa_role.arn}"
    automountServiceAccountToken: true
server:
  replicas: 2
  serviceAccount:
    create: true
    name: argocd-server
    annotations:
      eks.amazonaws.com/role-arn: "${aws_iam_role.argocd_irsa_role.arn}"
    automountServiceAccountToken: true

  EOF
}

```

Now deploy the argocd deployment using the helm charts and parse the values you wrote above ```values = [data.template_file.argo-values.rendered]```

```yaml title="argocd-instance-cluster.tf"
resource "helm_release" "argocd" {
  name       = "argocd"
  chart      = "argo-cd"
  repository = "https://argoproj.github.io/argo-helm"
  namespace  = "argocd"
  values = [data.template_file.argo-values.rendered]
}
```

### Deploy your new cluster on the argocd instance


Once everything is done and up, it's time to add the new cluster to your argocd instance, using the below snippet, replace the server API and the cluster CA with your new cluster API endpoint and the cluster CA.

```yaml title="argocd-instance-cluster.tf"
resource "kubectl_manifest" "your-cluster-name" {
  yaml_body = <<-EOF
apiVersion: v1
kind: Secret
metadata:
  name: your-cluster-name
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: "your-cluster-name"
  server: "https://xxxxxxxxxxx.sk1.us-east-1.eks.amazonaws.com"
  config: |
    {
      "awsAuthConfig": {
        "clusterName": "new-cluster",
        "roleARN": "${module.iam-assumable-role.iam_role_arn}"
      },
      "tlsClientConfig": {
        "insecure": false,
        "caData": "YOUR CLUSTER CA"
      }
    }
   EOF
}

```

alternatively, you can even make it more declarative by passing these values from your new cluster terraform IaC to the existing argocd instance terraform IaC, by storing the values in the AWS SSM Parameter Store, and retrieving it back in the argocd-instance-cluster.tf file.

That way you can replace your Cluster CA with  ```"caData": "${data.aws_ssm_parameter.cluster_CA.value}"``` and your cluster API endpoint with ```server: "${data.aws_ssm_parameter.cluster_api_endpoint.value}"``` and your cluster name with ```"clusterName": "${data.aws_ssm_parameter.cluster_name.value}"```

```yaml title="argocd-setup-on-new-cluster.tf"
resource "aws_ssm_parameter" "cluster_CA" {
  name      = "/argocd/cluster_CA"
  value     = module.eks.cluster_certificate_authority_data
  type      = "SecureString"
  overwrite = true
}

resource "aws_ssm_parameter" "cluster_api_endpoint" {
  name      = "/argocd/cluster_api_endpoint"
  value     = module.eks.cluster_endpoint
  type      = "SecureString"
  overwrite = true
}

resource "aws_ssm_parameter" "cluster_name" {
  name      = "/argocd/clustername"
  value     = module.eks.cluster_name
  type      = "SecureString"
  overwrite = true
}
```

### Add the IAM Assumable role to the aws-auth configmap in the new cluster

Now you have to add the IAM Assume role ```arn:aws:iam::xxxxxx:role/argocd-role``` you created in the argocd instance cluster to the aws-auth config map of the new cluster.

```yaml title="argocd-setup-on-new-cluster.tf"
resource "kubernetes_config_map" "aws_auth" {
  metadata {
    name      = "aws-auth"
    namespace = "kube-system"
  }

  data = {
    mapRoles = <<EOF
- groups:
  - system:masters
  rolearn: arn:aws:iam::xxxxxx:role/argocd-role
  username: arn:aws:iam::xxxx:role/argocd-role
EOF
  }
}
```
That's it, you are done, you can start deploying your deployment yaml files across the new cluster the GitOps way.

Well, that's it, folks! I hope you find this piece insightful and helpful.

Till next time 🤞🏽

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