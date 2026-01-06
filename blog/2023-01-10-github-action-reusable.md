---
slug: github-reusable-workflow
title: Reducing 900 lines of GitHub workflow to 200 lines 😌
authors: Saintmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/bgimg/github-workflow.webp
tags: [appsec, docker file, ci/cd, devsecops]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

hello everyone, okay, so I did something recently with GitHub action, re-wrote and optimized a workflow of 900+ lines back to 200+

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/900-lines.webp`} alt="900 lines of workflow"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/900-lines.jpg`} alt="900 lines of workflow"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/900-lines.jpg`} alt="900 lines of workflow"/>
</picture>

>>>>>>>

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/200-lines.webp`} alt="200 lines of workflow"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/200-lines.jpg`} alt="200 lines of workflow"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/200-lines.jpg`} alt="200 lines of workflow"/>
</picture>

<!--truncate-->

I was able to do that using GitHub reusable workflow, so GitHub reusable workflow allows you to declare some of your jobs as a standalone workflow and use it in every other workflow instead of you having to rewrite them each time you need them.

here is a good scenario of this, let's assume you are trying to build, tag, push, and scan a docker image for a microservice architecture, just like this

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/github-workflow.webp`} alt="github workflow"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/github-workflow.jpg`} alt="github workflow"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/github-workflow.jpg`} alt="github workflow"/>
</picture>

And then, the microservices are hosted in the folder level on a single repo under the branch "main"

so if you have three services, then you will find yourself rewriting for these services each, hence there is repetition and you would be zeroed out on DRY(do not repeat yourself).

so let's jump into it;

## Build, Tag, and Push images to ECR Workflow

we would start by writing the **build.yml** workflow file which provisions for the building, tagging, and pushing of our images to ECR.

so to write a workflow that will be called in another workflow you have to start with

```
on:
    workflow_call:
```

unlike the the ```workflow_dispatch```, the one you are familiar with.

So after defining the workflow type  ```workflow_call```.

you might need to pass some inputs or secrets into your workflow and this can be done by declaring this inputs field and secrets, like this

```yaml
    inputs:
      servicename:
        required: true
        type: string

    secrets:
      accessidaws:
        required: true
      secretkeyaws:
        required: true
      awsregion:
        required: true
```

you would notice I declare one single input value named ```servicename```, this is how I can declare the microservice folder name that I want the workflow to work with and the secrets field has three values namely, accessidaws, secretkeyaws, awsregion.

these three secrets are important since I am pushing to a private ECR repository, so whichever secrets you need in your workflow can be passed by declaring them under the secrets field

and the ```required:``` field which I set the value to true, makes sure the workflow doesn't start if the secrets are not available or passed.


so now, let's start writing the jobs field that performs the tasks we need, I believe you are familiar with GitHub workflow jobs.

if yes then nothing changes here too.

```
jobs:
  build-images:
    runs-on: ubuntu-latest

    outputs:
      sha: ${{ steps.vars.outputs.sha_short }}
      output3: ${{ steps.changed-files-specific.outputs.any_changed }}

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # OR "2" -> To retrieve the preceding commit.

      - name: Check if there are any changes made in folders
        id: changed-files-specific
        uses: tj-actions/changed-files@v31
        with:
          files: |
            ${{ inputs.microservice }}/**
      - name: Proceed if there are any changes, Start by configuring AWS credentials
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.aws_accessid }}
          aws-secret-access-key: ${{ secrets.aws_secretkey }}
          aws-region: ${{ secrets.aws_region }}

      - name: Login to Amazon ECR
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Shorten the commit SHA output
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        id: vars
        run: echo "::set-output name=sha_short::$(git rev-parse --short HEAD)"

      - name: Build, tag, and push an image to Amazon ECR
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY:  ${{ inputs.microservice }}
          IMAGE_TAG: latest-${{ steps.vars.outputs.sha_short }}
        run: |
          cd $ECR_REPOSITORY
          docker build -t $ECR_REPOSITORY .
          docker tag $ECR_REPOSITORY:latest $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
```

so you know as usual, you have to check out and that's what the **step: actions/checkout@v3** does, the **step: Check if there are any changes made in folders** is what I use in determining what service would be built.

if you don't forget, we have three microservices hosted in separate folders and not a separate repo, hence there is a need to check which of these folders has changes pushed to them.

That way we won't be running the workflow blindly, hence we would just run it against folders that have the changes alone.

Now you will see in that same step, I passed an input in ``` ${{ inputs.servicename }}/**```, the servicename is an input declared manually, so if I passed the value "shop" to it

the outcome will be 'shop/**', this means we check for changes in the shop folder deeply with the ```'/**'```

Coming to the next step **Proceed if there are any changes, Start by configuring AWS credentials**, so if there are any changes in the ```shop/``` service folder then this workflow runs and if there are no changes this workflow doesn't run.

``` if: steps.changed-files-specific.outputs.any_changed == 'true'```

In the GitHub workflow, you can pass the value of a certain step into another step, so if there are any changed files in the microservice folder.

the step returns a true value which we are comparing now to decide if the following workflow step proceeds or not.

Proceeding, you would see how I passed the secrets needed by the job step, configuring the aws credentials.

```
aws-access-key-id: ${{ secrets.accessidaws }}
aws-secret-access-key: ${{ secrets.secretkeyaws }}
aws-region: ${{ secrets.awsregion }}
```

So the secrets values we declared from the start of the workflow are getting used now, and it's passed like this ```${{ secrets.YOURSECRETVALUES }}```.

I believe you get the scope of the workflow now, after checking for changes in the folder.

If there is any, it configures aws creds, login into aws ECR, gets a shortened version of your GitHub sha and after that we build, tag, and push the image to ecr.

One more thing, we would be dealing with outputs on reusable workflows, because we need the image that we just built and push to ecr to get scanned, hence we need to pass the output of the build workflow to another.

And to do this, you have to declare the outputs outside the job's level to make them accessible to other workflows

so in the scenario of this workflow, we need to pass three outputs which are the
- GitHub sha,
- the microservice name
- the value of our folder changes check

Things are treated in stages in workflow, you are probably expecting us to pass the output straight up using jobs.steps.whateverstepid, you know.

But it doesn't work that way, so you need to first pass the outputs from the level of the steps to the job's level like this

```
jobs:
  build-push-images:
    runs-on: ubuntu-latest

    outputs:
      gitsha: ${{ steps.vars.outputs.sha_short }}
      folderchanges: ${{ steps.changed-files-specific.outputs.any_changed }}

    steps:
      - uses: actions/checkout@v3
      ......
```

So now we have the value of the GitHub sha from the steps that shorten the GitHub **sha** passed into the outputs of the job.

Which can now be referenced as jobs.build-images.outputs.gitsha and the folder changes check value too.

for the microservice name outputs, all we have to do is just add ```${{ inputs.servicename }}``` since we are passing the value manually as input.

The final look of the outputs of the reusable workflow should be like this.

```
    outputs:
      shashort:
        description: "pass the GitHub sha to the next workflow"
        value: ${{ jobs.build-images.outputs.gitsha }}
      servicename:
        description: "pass the microservice name to other workflows"
        value: ${{ inputs.servicename }}
      foldercheck:
        description: "pass the GitHub sha to the next workflow"
        value: ${{ jobs.build-images.outputs.folderchanges }}
```

:::note
Also, there is a thing with GitHub action you can't pass output from job1 to job3, to use the output of job1 in job3, you have to pass the output to job2 first and it would be accessible to job3.

You would see the usage soon, stay glued
:::

So here is the full workflow for the ```build.yml``` file

```yaml title=".github/workflows/build.yml"
on:
  workflow_call:
    inputs:
      servicename:
        required: true
        type: string

    secrets:
      accessidaws:
        required: true
      secretkeyaws:
        required: true
      awsregion:
        required: true

    outputs:
      shashort:
        description: "pass the GitHub sha to the next workflow"
        value: ${{ jobs.build-images.outputs.gitsha }}
      servicename:
        description: "pass the microservice name to other workflows"
        value: ${{ inputs.servicename }}
      foldercheck:
        description: "pass the GitHub sha to the next workflow"
        value: ${{ jobs.build-images.outputs.folderchanges }}

jobs:
  build-push-images:
    runs-on: ubuntu-latest

    outputs:
      gitsha: ${{ steps.vars.outputs.sha_short }}
      folderchanges: ${{ steps.changed-files-specific.outputs.any_changed }}

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # OR "2" -> To retrieve the preceding commit.

      - name: Check if there are any changes made in folders
        id: changed-files-specific
        uses: tj-actions/changed-files@v31
        with:
          files: |
            ${{ inputs.microservice }}/**
      - name: Proceed if there is any changes, Start by configuring AWS credentials
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.aws_accessid }}
          aws-secret-access-key: ${{ secrets.aws_secretkey }}
          aws-region: ${{ secrets.aws_region }}

      - name: Login to Amazon ECR
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Shorten the commit SHA output
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        id: vars
        run: echo "::set-output name=sha_short::$(git rev-parse --short HEAD)"

      - name: Build, tag, and push an image to Amazon ECR
        if: steps.changed-files-specific.outputs.any_changed == 'true'
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY:  ${{ inputs.microservice }}
          IMAGE_TAG: latest-${{ steps.vars.outputs.sha_short }}
        run: |
          cd $ECR_REPOSITORY
          docker build -t $ECR_REPOSITORY .
          docker tag $ECR_REPOSITORY:latest $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
```

## Scan Images Workflow

Now that we are done with the building, tagging, and pushing image reusable workflow, it's time to write the one for scanning according to the workflow diagram shared from the start.

So in this workflow, we would be needing three inputs, the servicename, the GitHub **sha** and the folder changes check and these are the values we've set as outputs from the ```build.yml``` workflow

```
    inputs:
      servicename:
        required: true
        type: string
      githubsha:
        required: true
        type: string
      foldercheck:
        required: true
        type: string

    secrets:
      accessidaws:
        required: true
      secretkeyaws:
        required: true
      awsregion:
        required: true
```
You should be wondering why we still need secrets again in this workflow, this is because our image is in a private repository, hence we can pull it and scan it.

Also, I am using the trivy image scanner here, you can choose to use anyone out here, and here is the job workflow

```
jobs:
  image-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # OR "2" -> To retrieve the preceding commit.

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'YOURIAMID.dkr.ecr.YOURAWSREGION.amazonaws.com/${{ inputs.servicename }}:latest-${{ inputs.githubsha }}'
          format: 'json'
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.accessidaws }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.secretkeyaws }}
          AWS_DEFAULT_REGION: ${{ secrets.awsregion }}

```

So as usual, you have to check out first, followed by the trivy scan step, you have to replace ```YOURIAMID``` with your own and ```YOURAWSREGION```with your repo region.

You would see I passed the value ```${{ inputs.servicename }}``` and ```{{ inputs.githubsha }}```, this are gotten from the output of my initial workflow ```build.yml```.

you would see how I will pass the values soon in the ```main.yml``` workflow.

Here is the full workflow for the scan section:

```yaml title=".github/workflows/scan.yml"
on:
  workflow_call:
    inputs:
      servicename:
        required: true
        type: string
      githubsha:
        required: true
        type: string
      foldercheck:
        required: true
        type: string

    secrets:
      accessidaws:
        required: true
      secretkeyaws:
        required: true
      awsregion:
        required: true

    outputs:
      githubSHA:
        description: "pass the GitHub sha to the next workflow"
        value: ${{ inputs.githubsha }}
      servicename:
        description: "pass the GitHub sha to the next workflow"
        value: ${{ inputs.microservice }}
      foldercheck:
        description: "pass the GitHub sha to the next workflow"
        value: ${{ inputs.foldercheck }}

jobs:
  image-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # OR "2" -> To retrieve the preceding commit.

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: '776616077494.dkr.ecr.us-west-2.amazonaws.com/${{ inputs.microservice }}:latest-${{ inputs.githubsha }}'
          format: 'json'
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.aws_accessid }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.aws_secretkey }}
          AWS_DEFAULT_REGION: ${{ secrets.aws_region }}
```

## K8s GitOps Image Update

Yeah, if you happen to do gitops, you are not going to update the images deployment yaml file manually.

So here is the workflow that handles that, here again, we are declaring some inputs, the same as the one we declared in scan.yml

This is where the notice I gave earlier makes more sense, I said we can only pass outputs from job **A** to job **B** and we can't pass outputs from job **A** to job **C**, but we can pass outputs from job **A** to job **B** and to job **C**.

That's the only way it works, so the inputs I am declaring here are passed from the outputs of scan.yml and if you notice here the secrets values changed.

yes, I will be needing the slack API token to get feedback from the pushing stage of the workflow.

Likewise ```github_token```allows my build to pull my existing deployment file to do the awesome edits, and author email, to hold someone responsible, just for metadata sake anyway.

```
    inputs:
      servicename:
        required: true
        type: string
      githubsha:
        required: true
        type: string
      foldercheck:
        required: true
        type: string

      author_email:
        required: true
      github_apitoken:
        required: true
      slack_apitoken:
        required: true
```

```yaml title=".github/workflows/k8-gitops.yml"
on:
  workflow_call:
    inputs:
      servicename:
        required: true
        type: string
      githubsha:
        required: true
        type: string
      foldercheck:
        required: true
        type: string

    secrets:
      deploy_email:
        required: true
      github_apitoken:
        required: true
      slack_apitoken:
        required: true

jobs:
  push-scanned-image:
    runs-on: ubuntu-latest
    env:
      ECR_REPOSITORY: ${{ inputs.microservice }}
      IMAGE_URI: https://raw.githubusercontent.com/YOURGITHUBUSERNAME/YOURGITHUBREPONAME/main/FOLDERNAME
      IMAGE_TAG: latest-${{ inputs.githubsha }}
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # OR "2" -> To retrieve the preceding commit.
      - name: Update Deployment file in cd-API for continuous deployment
        run: |
          cd $ECR_REPOSITORY
          curl --header "Authorization: token ${{ secrets.github_apitoken }}" \
              --header 'Accept: application/vnd.github.v3.raw' \
              --remote-name \
              --location $IMAGE_URI/$ECR_REPOSITORY-deployment.yaml
          sed -i_bkp 's/${{ env.ECR_REPOSITORY }}:.*/${{ env.ECR_REPOSITORY }}:${{ env.IMAGE_TAG }}/' ${{ env.ECR_REPOSITORY }}-deployment.yaml
      - name: Push changed docker image file
        uses: dmnemec/copy_file_to_another_repo_action@main
        env:
          API_TOKEN_GITHUB: ${{ secrets.github_apitoken }}
          DEPLOY_EMAIL: ${{ secrets.author_email }}

        with:
          source_file: '${{ github.workspace }}/${{ env.ECR_REPOSITORY }}/${{ env.ECR_REPOSITORY }}-depl.yaml'
          destination_repo: 'YOURGITHUBUSERNAME/YOURGITHUBREPONAME'
          destination_folder: 'FOLDERNAME'
          user_email: '${{ secrets.author_email }}'
          user_name: 'DevOps Eng'
          commit_message: "deploy for ${{ env.ECR_REPOSITORY }}-${{ env.IMAGE_TAG }}-${{ github.event.head_commit.message }}"

      - name: Report Status
        if: ${{ inputs.foldercheck == 'true' && always() }}
        uses: ravsamhq/notify-slack-action@v1
        with:
          status: ${{ job.status }}
          notify_when: 'failure,success'
          notification_title: 'The Workflow for ${{ inputs.microservice }}-service has {status_message} and here is the commit message: " ${{ github.event.head_commit.message }}"'
          message_format: '{emoji} *build, scan and push for ${{ inputs.microservice }} service* {status_message} in <{repo_url}|{repo}>'
          footer: 'Linked to Repo <{repo_url}|{repo}>'
          mention_users: 'UXXXXXXXX'
          mention_users_when: 'failure,warnings'
          # mention_groups: 'SXXXXXX'
          mention_groups_when: 'failure,warnings'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.slack_apitoken }}
```

Now, if you have read the github action workflow documentation, you would notice a section discussion about inheriting secrets from other workflows, like secrets from workflow A can be inherited in workflow B, without you having to rewrite.

But here it won't work, the inherent value works if the secrets are being declared in the bash format of the reusable workflow jobs, just like this ```run: echo ${{ secrets.AWS_ACCESS_KEY_ID }}```, <a href="https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idsecretsinherit" target="_blank">read more here</a> .

So that is all for the **k8-gitops.yml**, the workflow downloads the raw version of the deployment file, and then we use sed to replace the github sha, since that's what we are using for immutability and then push back to the repo and send success or failure feedback on slack.

## Main workflow file, workflow caller

And here we are, the last workflow file, the caller workflow, this workflow calls in all those reusable workflows.

so let's write the build, scan, and push k8 deployment for the shop service.

To start the caller workflow, you have to start with regular workflow triggers, either push, pull request or workflow_dispatch

```
on:
  push:
    branches:
      - main
```

After that we would start writing the jobs, the first job is building and pushing to ecr, so we would have something like this.

```
jobs:
  shops-image-build:
    name: Build & Push images for shops/
    uses: ./.github/workflows/build.yml@main
    with:
      servicename: shops
    secrets:
      accessidaws: ${{ secrets.AWS_ACCESS_KEY_ID }}
      secretkeyaws: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      awsregion: ${{ secrets.AWS_REGION }}

```

We are calling the workflow ```./.github/workflows/build.yml@main```, this is because the workflow is hosted in the same repo as the main.yml workflow.

Else you might have to input the full repo URL, something like this, ```username/repo/.github/workflows/build.yml@main```.

As you know we declared one input and three secrets in the ```build.yml``` reusable workflow, so to pass these values into the workflow, we can use the ```with``` syntax and secrets to pass in ```secrets```

So as you can see in the above workflow, I have the servicename to be ```shops```, that's the name of the microservice folder in my repository.

The servicename decides what microservice is being acted upon.

We've declared the build job, now its time for the scan job

```
  shops-image-scan:
    if: needs.shops-image-build.outputs.foldercheck == 'true'
    needs: shops-image-build
    uses: ./.github/workflows/scan.yml@main
    with:
      servicename: ${{ needs.shops-image-build.outputs.servicename}}
      githubsha: ${{ needs.shops-image-build.outputs.shashort }}
      foldercheck: ${{ needs.shops-image-build.outputs.foldercheck }}
    secrets:
      accessidaws: ${{ secrets.AWS_ACCESS_KEY_ID }}
      secretkeyawsy: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      awsregion: ${{ secrets.AWS_REGION }}
```
And here in the scan job, you would notice we declared an ```if``` statement and also a ```need``` statement.

The ```if``` takes in ```needs.shops-image-build.outputs.foldercheck == 'true'```, this output is being passed down from the ```build.yml``` workflow

Passing outputs from a reusable workflow to another workflow is different from passing output from one step to another or passing output from one job to another.

To pass outputs from one reusable workflow to another, you must have declared the output already in the workflow and then pass it in by using **needs.THEJOBNAME.outputs.OutPutNameFromReusableWorkflow**.

for the ```needs: shops-image-build``` statement, you are doing this, because, you can't scan an image that hasn't been built and pushed to ECR yet.

hence the need for making sure the jobs of **shops-image-build** gets successful before the scan job can start.

So if a certain job of yours needs another job to progress, you can always do that using ```needs: JOBNAME``` and that's it.

You can see that we have three inputs being passed into the scanning workflow and they are values passed from the build workflow which are the ```servicename```, ```githubsha``` and the ```foldercheck```

These three are essential for the scanning workflow, hence the need to pass them across, and you see I used the ```needs``` syntax to pass the values.

going to the pushing to k8 deployment jobs, here are the workflow codes

```
  push-scanned-shops-image:
    needs: shops-image-scan
    uses: ./.github/workflows/k8-gitops.yml@main
    with:
      servicename: ${{ needs.shops-image-scan.outputs.servicename }}
      githubsha: ${{ needs.shops-image-scan.outputs.githubSHA }}
      foldercheck: ${{ needs.shops-image-scan.outputs.foldercheck }}
    secrets:
      github_apitoken: ${{ secrets.API_TOKEN_GITHUB }}
      deploy_email: ${{ secrets.DEPLOY_EMAIL }}
      slack_apitoken: ${{ secrets.ACTION_MONITORING_SLACK }}
```

as you can see we passed the ```servicename```, ```githubsha```, and the ```foldercheck``` again, but this time, it's being passed from the outputs of scan.yml workflow.

That's because the outputs of job **A** cant be used in job **C** but the outputs of job **A** can be passed to job **B** and from job **B** it would be passed to job **C**.

But there is an exception, using the outputs in an ```if``` statement, just like this

```yaml
if: needs.shops-image-build.outputs.foldercheck == 'true'
```

So this way, you can use the ouput of job **A** in job **C** in this scenerio.

That is how it works here, now you should have a workflow that looks exactly like this.


```yaml title=".github/workflows/main.yml"
name: build, scan, push k8s deployment file
on:
  push:
    branches:
      - main

# In a GitHub workflow you can use env either in jobs.<job_id>.env or in jobs.<job_id>.steps[*].env.

jobs:
  shops-image-build:
    name: Build & Push images for shops/
    uses: ./.github/workflows/build.yml@main
    with:
      servicename: shops
    secrets:
      accessidaws: ${{ secrets.AWS_ACCESS_KEY_ID }}
      secretkeyaws: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      awsregion: ${{ secrets.AWS_REGION }}

  shops-image-scan:
    if: needs.shops-image-build.outputs.foldercheck == 'true'
    needs: shops-image-build
    uses: ./.github/workflows/scan.yml@main
    with:
      servicename: ${{ needs.shops-image-build.outputs.servicename}}
      githubsha: ${{ needs.shops-image-build.outputs.shashort }}
      foldercheck: ${{ needs.shops-image-build.outputs.foldercheck }}
    secrets:
    secrets:
      accessidaws: ${{ secrets.AWS_ACCESS_KEY_ID }}
      secretkeyawsy: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      awsregion: ${{ secrets.AWS_REGION }}

  push-scanned-shops-image:
    needs: shops-image-scan
    uses: ./.github/workflows/k8-gitops.yml@main
    with:
      microservice: ${{ needs.shops-image-scan.outputs.servicename }}
      githubsha: ${{ needs.shops-image-scan.outputs.githubSHA }}
      foldercheck: ${{ needs.shops-image-scan.outputs.foldercheck }}
    secrets:
      github_apitoken: ${{ secrets.API_TOKEN_GITHUB }}
      deploy_email: ${{ secrets.DEPLOY_EMAIL }}
      slack_apitoken: ${{ secrets.ACTION_MONITORING_SLACK }}
```

This workflow code, will build, scan and update the k8s deployment file for the shop service, and we can rewrite it to do the same thing for the remaining two services that we have.

Well, that's it, folks! I hope you find this useful and helpful.


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