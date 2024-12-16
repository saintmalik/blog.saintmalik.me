---
slug: keyless-signing-container-images-github-oidc
title: Keyless Signing of Container Images using GitHub Actions
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/peace-mind.webp
tags: [appsec, container security, devsecops]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

In my past article about <a href="https://blog.saintmalik.me/signing-container-images-for-trust-assurance/" target="_blank">signing container images</a>, got some comments which led me to dig into the keyless signing of container images.

<picture>
<a href="https://x.com/1azunna">
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/keyless-signing-tweet-comment.webp`} alt="tweet about keyless signing"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/keyless-signing-tweet-comment.jpg`} alt="tweet about keyless signing"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/keyless-signing-tweet-comment.jpg`} alt="tweet about keyless signing"/>
  </a>
</picture>

<!--truncate-->
<br/><br/>
You will be walked through the process of keyless signing of container images using GitHub Actions.

## Prerequisite
- GitHub Account
- Knowledge about GitHub Action

So Let's jump into it;

### 👉 How does the keyless signing work?

keyless signing works by verifying the signer's identity by using identity providers like Google, Email and GitHub and it puts the signer's identity into the artifact signing certificate.

When the signing is done, the signing certificate gets thrown away after 10 minutes, and the only metadata from the whole act is the public key stored inside the Rekor tlog.

- <u>Cosign</u>: a tool that signs software artifacts, this brings trust and provenance to the software and helps prevent tampering.

 - <u>And fulcio</u>: on the other hand is a free code signing certificate authority based on an OpenID Connect Email address, Fulcio signs X.509 certificates valid for 10 minutes.

- <u>Rekor</u>: also known as a transparency log that holds metadata generated within a software project’s supply chain signing and allows other users of the software to query the logs to see if the signature is valid and signed by the authorized software owners.

You can host your private rekor instance instead of using the public one if your container images are private and you don't want to have it uploaded to the public sigstore rekor instance.

### 👉 Keyless Signing of Container image with GitHub Actions

You need to create a GitHub Action YAML file named **keyless.**yaml** in your GitHub repository in the folder path **.github/workflows** and write the following syntax in it.

You have to start with the permission section, the workflow will need the following permissions.

```yaml title=".github/workflows/keyless.yaml"
name: keyless signing container images
on: push

jobs:
   build-keyless-signing-container-image::
    runs-on: ubuntu-latest
    permissions:
        contents: read
        id-token: write

```

The ```id-token: write``` enables the GitHub Actions OIDC tokens for your workflow, so that way Fulcio will be able to do its job without needing you to hit the auth verification URL manually to select the OIDC method you want to use.

You still have to be care and make sure the permission isnt available on the pull request based run for that action, you can read more from the <a href="https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#updating-your-actions-for-oidc" target="_blank">github security hardening</a>

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/fulcio-token.webp`} alt="keyless signing error"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/fulcio-token.jpg`} alt="keyless signing error"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/fulcio-token.jpg`} alt="keyless signing error"/>
</picture>

Now, you write the actions to build your container images from your Dockerfile, the Dockerfile used in this guide is below, you can use it too for practical sake.

```yaml title="Dockerfile"
FROM
FROM alpine
RUN apk update
RUN apk add git
```

So here are the actions to build the container image from the Dockerfile and push the container image to a Docker registry

```yaml title=".github/workflows/keyless.yaml"
    steps:
      - name: "checkout"
        uses: actions/checkout@v3

      - name: Generate uuid from shortened commit SHA
        id: uuid
        run: echo "::set-output name=sha_short::$(git rev-parse --short HEAD)"

      - name: Build and push
        env:
          IMAGE_TAG: signed-test-${{ steps.uuid.outputs.sha_short }}
        run: |
          docker build -t ttl.sh/${IMAGE_TAG}:1h .
          docker push ttl.sh/${IMAGE_TAG}:1h
```

in the above workflow, I am using the <a href="https://ttl.sh" target="_blank">ttl.sh</a> container repositories which is an Anonymous & ephemeral Docker image registry, you can always use any container repository you want.

The next step in the workflow is getting the image digest of the container image built in the above step using the below actions in your workflow.

now you have to install Cosign, add the following YAML config in your workflow

```yaml title=".github/workflows/keyless.yaml"
      - name: Install cosign
        uses: sigstore/cosign-installer@v3.1.1
        with:
          cosign-release: 'v2.1.1'
```

The next step is the most important in our workflow, signing the container image we've built and pushed with the following actions.

```yaml title=".github/workflows/keyless.yaml"
      - name: Keyless signing of image
        run: |
          cosign sign --yes --rekor-url "https://rekor.sigstore.dev/" ${{ steps.digest.outputs.image_sha }}
```
The ```${{ steps.digest.outputs.image_sha }}``` is the output of the step where you ran the actions to grab your container image digest, you will also notice I did specify the ```--rekor-url``` flag, this is needed for when you have your private rekor instance.

So it's a must to set the rekor-url and fulcio-url flag if you have hosted your own private rekor and fulcio server.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/github-actions-keyless.webp`} alt="github-actions-keyless"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/github-actions-keyless.jpg`} alt="github-actions-keyless"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/github-actions-keyless.jpg`} alt="github-actions-keyless"/>
</picture>

If everything goes well, your signing workflow tlog output should look just like this, with information about the rekor tlog indexing number, the container image, SHA value of our image tag.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/tlog-signed-keyless.webp`} alt="tlog-signed-keyless"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/tlog-signed-keyless.jpg`} alt="tlog-signed-keyless"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/tlog-signed-keyless.jpg`} alt="tlog-signed-keyless"/>
</picture>

### 👉 Verifying and enforcing signed container images policies

#### Verifying

Now it's time to verify and enforce that only verified images are used in our environments, to verify your just-built container image.

Run the following cosign verify command on your local system.

```bash
cosign verify  --rekor-url "https://rekor.sigstore.dev/" ttl.sh/signed-test-89b280e@sha256:9cbba3d51f93e5ccaea502009a72bfb88985cc9c179982574f012394f45edd4d --certificate-identity "https://github.com/your-github-username/your-github-repo.github/workflows/keyless.yaml@refs/heads/main" --certificate-oidc-issuer "https://token.actions.githubusercontent.com" | jq .
```

Replace **ttl.sh/signed-test-89b280e@sha256:9cbba3d51f93e5ccaea502009a72bfb88985cc9c179982574f012394f45edd4d** with your container image URL, likewise **your-github-username** with your github username and **your-github-repo** with your repo name.

Or better still run it in your GitHub actions workflow.

```yaml title=".github/workflows/keyless.yaml"
      - name: Verify the image signing
        run: |
          cosign verify  --rekor-url "https://rekor.sigstore.dev/" ${{ steps.digest.outputs.image_sha }} --certificate-identity "https://github.com/your-github-username/your-github-repo/.github/workflows/keyless.yaml@refs/heads/main" --certificate-oidc-issuer "https://token.actions.githubusercontent.com" | jq .
```

And your output should look something like this.

Your final workflow should look like this

```yaml title=".github/workflows/keyless.yaml"
name: keyless signing container images
on: push

jobs:
 build-sign-container-image:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - name: "checkout"
        uses: actions/checkout@v3

      - name: Generate uuid from shortened commit SHA
        id: uuid
        run: echo "::set-output name=sha_short::$(git rev-parse --short HEAD)"

      - name: Build and push
        env:
          IMAGE_TAG: signed-test-${{ steps.uuid.outputs.sha_short }}
        run: |
          docker build -t ttl.sh/${IMAGE_TAG}:1h .
          docker push ttl.sh/${IMAGE_TAG}:1h

      - name: Get image digest
        env:
          IMAGE_TAG: signed-test-${{ steps.uuid.outputs.sha_short }}
        id: digest
        run: |
          echo "image_sha=$(docker inspect --format='{{index .RepoDigests 0}}' ttl.sh/${IMAGE_TAG}:1h)" >> $GITHUB_OUTPUT

      - name: Install cosign
        uses: sigstore/cosign-installer@v3.1.1
        with:
          cosign-release: 'v2.1.1'

      - name: Keyless signing of image
        run: |
          echo ${{ steps.digest.outputs.image_sha }}
          cosign sign --yes --rekor-url "https://rekor.sigstore.dev/" ${{ steps.digest.outputs.image_sha }}

      - name: Verify the image signing
        run: |
          cosign verify  --rekor-url "https://rekor.sigstore.dev/" ${{ steps.digest.outputs.image_sha }} --certificate-identity "https://github.com/saintmalik/sign-container-images/.github/workflows/keyless.yaml@refs/heads/main" --certificate-oidc-issuer "https://token.actions.githubusercontent.com" | jq .
```
#### Enforce Policy

Enforcing the policy of using only signed container images can be done at any level, you can enforce it at the GitOps level using OPA, making sure only signed image makes it through to your GitOps repo or even using <a href="https://docs.sigstore.dev/policy-controller/overview/" target="_blank">Kubernetes Policy Controller</a> for the Kubernetes users.

I prefer <a href="https://kyverno.io/policies/" target="_blank">kyverno</a> though, you can simply enforce a cluster-wide policy to make sure in whatever namespace a deployment is, the image matches the one you are enforcing the policy for.

It must check if it's signed based on the attestors you've given it, else don't allow the deployment to make it through, here is a sample.

```yaml title="signed-image-deployment.yaml"
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: check-signed-image
spec:
  validationFailureAction: enforce
  background: false
  webhookTimeoutSeconds: 30
  failurePolicy: Fail
  rules:
    - name: check-image
      match:
        any:
        - resources:
            kinds:
              - Pod
      verifyImages:
      - imageReferences:
        - "ttl.sh/*:*"
        verifyDigest: false
        required: false
        mutateDigest: false
        attestors:
        - entries:
          - keyless:
              # verifies issuer and subject are correct
              issuer: https://token.actions.githubusercontent.com
              subject: https://github.com/saintmalik/sign-container-images/.github/workflows/keyless.yaml@refs/heads/main
              rekor:
                url: https://rekor.sigstore.dev
```

```yaml title="signed-image-deployment.yaml"
      resources:
        limits:
          memory: 384Mi
        requests:
          cpu: 100m
          memory: 128Mi
      volumeMounts:
        - name: public-keys
          mountPath: /public-keys
        - name: sigstore
          mountPath: /.sigstore

  volumes:
    - name: sigstore
      emptyDir: {}
    - name: public-keys
      configMap:
        name: public-keys
```

Well, that's it, folks! I hope you find this piece insightful and helpful.

Till next time 🤞🏽

#### References
- https://docs.sigstore.dev/
- https://flxw.de/integrating-kyverno-with-a-private-sigstore-deployment
- https://edu.chainguard.dev/open-source/sigstore/how-to-keyless-sign-a-container-with-sigstore/


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