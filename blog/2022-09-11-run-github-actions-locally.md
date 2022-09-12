---
slug: running-github-actions-locally
title: Run github action locally using act
author: Saintmalik
author_title: Pentester
author_url: https://twitter.com/saintmalik_
author_image_url: https://res.cloudinary.com/saintmalik/image/upload/e_sharpen:2000,q_74,r_0/v1641922078/saintmalik.webp
image: /bgimg/github-workflow-spammy-actions.jpg
tags: [ci/cd, appsec, devsecops]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Yeah, being doing the CI/CD implementations via github workflow lately and i am also trapped in the process of making commits to trigger the workflows or better still making empty commits, haha.

<!--truncate-->

Well, you can say why don't you just use Jenkins, CircleCi, Gitlab CI? i think this all boils down to what your org uses, i think there is no need to go the jenkins way, when my org uses github and github has the workflow to implement CI/CD.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/github-workflow-spammy-actions.webp`} alt="github spammy actions"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/github-workflow-spammy-actions.jpg`} alt="github spammy actions"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/github-workflow-spammy-actions.jpg`} alt="github spammy actions"/>
</picture>

Now, looking at the above screenshot, i am very sure that's how your Actions page looks like too, but what if you could test the workflows you write locally before pushing it to github?

That way, you can limit the spammy look of failed builds on your Actions page.

Thanks to <a href="https://github.com/nektos/" target="_blank">nektos</a> for building and open sourcing <a href="https://github.com/nektos/act" target="_blank">Act</a>.

Act is a golang tool that allows you to run your GitHub Actions locally 🚀, making the feedback process really quick for your tests.

Now let's jump into how to use this

Firstly, you will need to <a href="https://docs.docker.com/get-docker/" target="_blank">install docker</a>, Act depends fully on it,

Done with that? now lets install ```act``` on our enviroment, i use macOS, so i will be installing it using ```brew```, you can also install on linux using ```brew```

```mdx
brew install act
```

You can as well check the <a href="https://github.com/nektos/act#installation-through-package-managers" target="_blank">installation guide</a> for other installation methods.

## Time to run your github actions locally

Done with the installation of ```act``` ?  it's time to run act.

Navigate into your project folder where you have your github workflow files and run the following command on your terminal.

 ```md
 act
 ```

That should spin things up and then display some outputs where you are asked to select the image you would like to use with ```act```.

You will only see this once, because it's your first time running ```act``.

You can choose the **medium** image size, it is sufficient and okay, way better than micro option, after  selecting the image size and hitting the enter button.

It will run and spin up the **~/.actrc** file that contains the image configurations, you can always change this manually anytime.

So Immediately after selecting the image size, ```act``` also auto detect any workflow file in your **.github/workflow** folder and it will proceed with spining up a docker conatiner and run the actions workflows in it.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/act-image-selection.webp`} alt="act image selection"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/act-image-selection.jpg`} alt="act image selection"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/act-image-selection.jpg`} alt="act image selection"/>
</picture>

:::note
Whenever the github actions workflow is done, the docker container gets discarded, but there is a way around that
:::

In situations where you need to get the results/feedback of your workflow actions which are probably passed to html, json or xml files as output, you won't be able to access it because the docker container gets discarded.

But ```act``` has a subcommand to help with that, which makes your docker containers resusable.

hence you can enter the docker container to view your actions output or copy it into your local system, which everone is okay with you.

Here is the parameter to achieve that

```md
act --reuse
```

## Saving time on running your actions locally

You can also save time running this actions workflows, sure you don't want to wait all day for the local option you've choosen to take so much of your time, so if you will be running **npm install** or **yarn install** in your workflow and by chance already have a **node_modules** folder in your project root.

```act``` can feed on the **node_modules** folder and speed/skip the dependencies installation process, here is the command to get that done

```md
act -b
```
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/actions-github-worflow-skip.webp`} alt="skip dependencies in workflow actions"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/actions-github-worflow-skip.jpg`} alt="skip dependencies in workflow actions"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/actions-github-worflow-skip.jpg`} alt="skip dependencies in workflow actions"/>
</picture>

Yeah, there is more, what about the github actions secrets? will your workflows with the secrets run locally? Yes they will

## Passing secrets into your local github actions workflow

Passing github workflow secrets can be done in various ways, you can enter them manually using the ```-s``` parameter.

```md
act -s GITHUB_TOKEN=[insert token]
```

Alternatively, you can use the ```--secret-file``` parameter too, that way you can pass more workflow secrets along with your workflow, just create and open **my.secrets** file in your project root folder.

```md
touch my.secrets
```

```md
open my.secrets
```

Then add your action secrets into the file in the following formats

```md
GITHUB_TOKEN=${YOUR TOKEN}
```

then run the file with the ```secret-file``` parameter

```md
act --secret-file my.secrets
```

And thats all, there are more ```act``` options you can play with to speed up your devsecops  or devops with github action by testing workflows locally.


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