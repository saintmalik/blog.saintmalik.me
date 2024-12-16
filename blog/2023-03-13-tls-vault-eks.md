---
slug: end-to-end-tls-vault-eks
title: Enabling End-to-End TLS for Vault HA with Integrated Storage on EKS
authors: Saintmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/bgimg/github-workflow.webp
tags: [appsec, vault, eks, devsecops]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

When you are preparing your vault environment for production, you would want to implement the end-to-end tls setup as stated in the hashicorp vault production-ready documentation.

<!--truncate-->

To make sure communications within your vault and its replicas are encrypted and secure if you have the HA(High Availability) on.

In this guide, I will work you through the process for those using Vault on EKS,  let's jump into it

## Prerequisites

You have your EKS cluster up and you have installed Vault, you have kubectl and OpenSSL installed on your local environment.

## Creating the TLS Certificate

1. You have to create the private key, do that with the following command

```
openssl genrsa -out vault.key 2048
```

The above command will create an RSA private key for you.

2. You have to prepare the CSR( Certificate Signing Request) configurations, here you put all the important vault DNS
```
 cat > vault-csr.conf <<EOF
[req]
default_bits = 2048
prompt = no
encrypt_key = yes
default_md = sha256
distinguished_name = app_serving
req_extensions = v3_req
[ app_serving ]
O = system:nodes
CN = system:node:*.vault.svc.cluster.local
[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = *.vault-internal
DNS.2 = *.vault-internal.vault.svc.cluster.local
DNS.3 = *.vault
DNS.4 = vault
DNS.5 = vault-active.vault.svc.cluster.local
IP.1 = 127.0.0.1
EOF
```

3. With the above configuration file, you can generate the CSR file using the following command

```
openssl req -new -key vault.key -out vault.csr -config vault-csr.conf
```

4. Now that you have the CSR created, you have to issue it to EKS, so you can generate and sign your vault certificates using EKS CA(Certificate Authority).

Create the CSR yaml file with the following command

```yaml
cat <<EOF >vault-csr.yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: vault.svc
spec:
  signerName: beta.eks.amazonaws.com/app-serving
  request: $(cat vault.csr | base64 | tr -d '\n')
  usages:
  - digital signature
  - key encipherment
  - server auth
EOF
```

Notice the signerName we are using here is ```beta.eks.amazonaws.com/app-serving``` instead of ```kubernetes.io/kubelet-serving``` according to other guides.

Yes, this is because from <a href="https://docs.aws.amazon.com/eks/latest/userguide/cert-signing.html" target="_blank">EKS v1.22 or later</a>, you have to use a custom signer, else you would see that your CSR would be approved but not signed.

5. It's time to apply the CSR yaml file to EKS by running the following command

```
kubectl apply -f vault-csr.yaml
```

6. Once the CSR has been deployed to your EKS, let's approve the serving cert.

```
kubectl certificate approve vault.svc
```

7. Time to check if the cert has been approved and signed

```
vault get csr vault.svc
```

You should see an output just like this if everything goes well

```
NAME       AGE         SIGNERNAME                                             REQUESTOR          CONDITION
vault.svc   1m     beta.eks.amazonaws.com/app-serving   kubernetes-admin   Approved, Issued
```

8. Since everything went well, let's retrieve the certificate that was generated and signed for us by the EKS CA

```
kubectl get csr vualt.svc -o jsonpath='{.status.certificate}'| base64 -d > vault.crt
```

9. You should have ```vault.key``` and ```vault.crt``` file by now,  let's retrieve the EKS CA, since that's what we used in generating and signing ```vault.crt```.

```
kubectl config view \
--raw \
--minify \
--flatten \
-o jsonpath='{.clusters[].cluster.certificate-authority-data}' \
| base64 -d > vault.ca
```

10. It would be great to verify the cert with the CA to check if there is any error, to avoid wasting so much time debugging your vault for the cause of errors like **Bad Certificate**.

```
openssl verify -verbose -CAfile vault.ca vault.crt
```

if it goes well, you should see the output ***vault.crt: OK***

11. Now that we are done, let's create the TLS secret in Kubernetes

```
kubectl create secret generic vault-tls \
   -n vault \
   --from-file=vault.key=vault.key \
   --from-file=vault.crt=vault.crt \
   --from-file=vault.ca=vault.ca
```

12. if the certs TLS secret creation goes well, time to mount them back into your vault override configurations.

```yaml
global:
  tlsDisable: false
server:
  extraEnvironmentVars:
    VAULT_CACERT: /vault/tls/vault.ca
    VAULT_TLSCERT: /vault/tls/vault.crt
    VAULT_TLSKEY: /vault/tls/vault.key
  volumes:
    - name: tls
      secret:
        secretName: vault-tls
  volumeMounts:
    - name: tls
      mountPath: "/vault/tls"
      readOnly: true
  ha:
    enabled: true
    raft:
      enabled: true
      setNodeId: true
      config: |
        ui = true
        disable_mlock = true
        listener "tcp" {
          tls_disable = false
          address = "[::]:8200"
          cluster_address = "[::]:8201"
          tls_cert_file      = "/vault/tls/vault.crt"
          tls_key_file       = "/vault/tls/vault.key"
          tls_client_ca_file = "/vault/tls/vault.ca"
        }
        storage "raft" {
          path = "/vault/data"

        service_registration "kubernetes" {}
        }
```

Well, that's it, folks! I hope you find this piece insightful and helpful.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/indeed.gif`} alt="Okay, thats all"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/indeed.gif`} alt="Okay, thats all"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/indeed.gif`} alt="Okay, thats all"/>
</picture>

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