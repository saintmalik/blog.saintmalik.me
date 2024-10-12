---
slug: iac-security-with-state-file-aws-signerion
title: Signing container image with AWS Signer and Notation using GitHub Action
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/encryption.webp
tags: [IaC, opentofu, encryption]
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

In the past, I have leveraged using cosign, rekor for <a href="https://blog.saintmalik.me/signing-container-images-for-trust-assurance/" target="_blank">container signing and verification</a>, and since the project is private, there is no way I am using the sigstore publicly hosted record verification store.

<!--truncate-->

I will have to use a private Rekor instance, which is not a bad thing, but I have to maintain it, make sure it is always available, and make sure there are enough resources for it to work,

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/aws-signer.webp`} alt="container signing logic private and public repo"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/aws-signer.png`} alt="container signing logic private and public repo"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/aws-signer.png`} alt="container signing logic private and public repo"/>
</picture>
<p style={{ color: 'green' }}>Credit: GitHub Blog</p>
</Figure>

best bet, there are days the private rekor instances would be down, meaning the signing of container images would be down too, haha.

following <a href="https://cep.dev/posts/every-infrastructure-decision-i-endorse-or-regret-after-4-years-running-infrastructure-at-a-startup/#aws-vpnhttpsawsamazoncomvpn" target="_blank"> Jack's mantra</a> “simplicity is preferable”, so why not go for something simpler that works the same way,

That led me to the AWS signer and notary project, the Azure equivalent is Azure Vault and Notary.

So Let's jump into it;

## Prerequisite

- GitHub Action
- AWS Account and your AWS ecr repository
- Your Dockerfile for the container image


```
name: Build and Sign Container Image

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Proceed if there is any changes, Start by configuring AWS credentials
        uses: aws-actions/configure-aws-credentials@v4

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1

      - name: Build container image
        id: build
        run: |
          docker buildx build \
            --platform linux/amd64 \
            --file Dockerfile \
            --tag my-image:latest .

      - name: Get image SHA
        id: digestval
        run: echo "::set-output name=image_sha::$(docker inspect --format='{{index .RepoDigests 0}}' my-image)"

  sign-and-validate:
    needs: build
    runs-on: ubuntu-latest

    steps:
      - name: setup Notation CLI
        uses: notaryproject/notation-action/setup@v1
        with:
          version: 1.0.0

      - name: Keyless signing of image
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        run: |
          PROFILE_NAME="supplychain_signing_profile"
          SIGNING_PLATFORM_ID="Notation-OCI-SHA384-ECDSA"

          if ! aws signer list-signing-profiles --query "profiles[?profileName=='${PROFILE_NAME}']" --output text | grep -q ${PROFILE_NAME}; then
            echo "Profile does not exist. Creating profile ${PROFILE_NAME}."
            aws signer put-signing-profile --profile-name ${PROFILE_NAME} --platform-id ${PLATFORM_ID}
          else
            echo "Profile ${PROFILE_NAME} already exists."
          fi

      - name: Set up Notation AWS Signer plugin
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        run: |
          wget https://d2hvyiie56hcat.cloudfront.net/linux/amd64/installer/deb/latest/aws-signer-notation-cli_amd64.deb
          sudo dpkg -i aws-signer-notation-cli_amd64.deb
        shell: bash

      - name: Sign image
        if: steps.build.outputs.image_sha
        run: |
          notation sign ${{ steps.digestval.outputs.image_sha }} \
            --plugin "com.amazonaws.signer.notation.plugin" \
            --id "arn:aws:signer:YOUR_AWS_REGION:YOUR_AWS_ACCOUNT_ID:/signing-profiles/supplychain_signing_profile"
        shell: bash

      - name: Validate signature of image
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        run: |
          ls -l
          echo "${{ secrets.aws_signer_trust_policy }}" | base64 -d > $GITHUB_WORKSPACE/$ECR_REPOSITORY/signerpolicy.json
          notation policy import $GITHUB_WORKSPACE/$ECR_REPOSITORY/signerpolicy.json --force
          notation verify ${{ steps.digestval.outputs.image_sha }}
        shell: bash
```


#### References
- https://opentofu.org/docs/language/state/encryption/

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