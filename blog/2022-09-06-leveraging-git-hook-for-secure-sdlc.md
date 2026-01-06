---
slug: leveraging-git-hook-hardcoded-secrets-codebase
title: Leveraging git hook for hardcoded secrets scanning in a codebase
author: Abdulmalik
image: /bgimg/leveraging-git-hook-hardcoded-secrets-codebase.png
tags: [gitops, devsecops, appsec]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Almost everyone knows how to use .gitignore, the git file that helps in keeping sensitive files like .env out of the tracking, commit, and pushing process, and also unwanted folders like node_modules and all.

But do you know secrets, hardcoded credentials, and API aren't easy to deal with using a .gitignore file? you don't want to keep your config.js or config.go file out of the commit process, these are essential files to your project.

<!--truncate-->

Okay, since you can't keep them out, you probably think, yes, I would use dummy creds, and sandbox API, so you are good.

Yes, but in the dev process/circle, mistakes are inevitable, you are not always perfect, and the pressure of delivering early is definitely real, hence you end up pushing secrets to the public domain via github.

So how do you automate this secret/API/hardcoded creds process to avoid mistakes like this?

That brings us to Git Hooks

discovered git hook recently also, been a git user for a while and I am just discovering git hook this month, haha

## So what is Git Hook?

Git hooks are scripts or programs that are placed in the hooks directory to trigger at a certain point in the git's execution process.

## Types of git hooks

There are many types of git hooks but here I will only be discussing two which are **pre-commit** and **pre-push**

## What's the pre-commit hook?

The pre-commit hook is the script that runs immediately after you enter the ```git commit -m "Committing my changes"```, meaning that whatever instruction is given to the pre-commit hook would initiate first before the commit.

So if the instructions fail, the commit would not take place and if the instructions are successful the commit will proceed.

### Pros:
   - Your secret/API/hardcoded keys would never make it into the commit history

### Cons:
   - It would be a blocker to the developer and can slow down the dev process

## What's the pre-push hook?

The pre-push hook is the script that runs right after you enter ```git push``` command, whatever instruction is given to the pre-push hook gets executed first before the git push command execution,

So if the instructions fail, the ```git push``` command won't get executed, but if the pre-push hook instructions are successful, the git push command will also execute.

### Pros:
 - Your secret/API/hardcoded keys won't make it to the remote repository
 - Scanning collections of commit in one go

### Cons:
  - The secret/API/hardcoded keys still remain in your git history

Well, you can always clean your git history and rebase, <a href="https://hackernoon.com/how-to-clean-your-git-history-ryzb3ydv" target="_blank">here</a> is a detailed guide on that.


So now let's jump into the implementation;

## Implementing secrets scan via pre-push hook

I would be using <a href="https://github.com/Yelp/detect-secrets" target="_blank">detect-secrets</a> as my secret scanning tool in this guide.

1.  Firstly, you need to install <a href="https://pre-commit.com/#install" target="_blank">pre-commit</a> tool.

```toml
pip install pre-commit
```

2. Navigate into your project folder, create and open the .pre-commit-config.yaml file in the root of your folder via your terminal.

```yaml
touch .pre-commit-config.yaml
```

```yaml
open .pre-commit-config.yaml
```

3. copy and paste the following hook mapping inside the file you just created above.

```yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.3.0
    hooks:
      - id: detect-secrets
```

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/pre-commit-config.webp`} alt="pre commit config"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/pre-commit-config.jpg`} alt="pre commit config"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/pre-commit-config.jpg`} alt="pre commit config"/>
</picture>


This hook mapping tells pre-commit the repo where it will get the code for the hook, here I am using detect-secrets tool for the secret scanning, but there are many other tools to use.

You have ggshield, gitleaks and <a href="https://github.com/sottlmarek/DevSecOps#secrets-management" target="_blank">more</a>.

4. Now let's install the pre-push hook.

By default if you run ```pre-commit install``` in your project folder, it will install the default **pre-commit hook**, so to install the pre-push hook, here is the command to use

```sh
pre-commit install --hook-type pre-push
```
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/pre-push.webp`} alt="pre push"/>
  <source type="image/png" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/pre-push.png`} alt="pre push"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/pre-push.png`} alt="pre push"/>
</picture>

So now that you have the pre-push hook installed, let's test it out.

5. You can create config.js, config.yaml, config.json, .env, and config.py files for the testing.

```sh
touch config.js config.yaml config.json .env config.py
```

6. Now open those files you just created and paste these dummy creds/secrets in them.

```sh
kred_herring = 'DEADBEEF'
id = 'YW1pYWx3YXlzZ2VuZXJhdGluZ3BheWxvYWRzd2hlbmltaHVuZ3J5b3JhbWlhbHdheXNodW5ncnk'

base64_secret = 'c2VjcmV0IG1lc3NhZ2Ugc28geW91J2xsIG5ldmVyIGd1ZXNzIG15IHBhc3N3b3Jk'
hex_secret = '8b1118b376c313ed420e5133ba91307817ed52c2'
basic_auth = 'http://username:whywouldyouusehttpforpasswords@example.com'

aws_access_key = 'AKIAIOSFODNN7EXAMPLE'
aws_secret_access_key = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
```

7. When you are done with adding the dummy keys into those files, add the file to git tracking and commit to saving your changes.

```sh
git add . && git commit -m "Git secret scanning using pre-commit hooks"
```
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/commit-pre-push.webp`} alt="commit pre push"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/commit-pre-push.jpg`} alt="commit pre push"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/commit-pre-push.jpg`} alt="commit pre push"/>
</picture>

8. After the commit, you can then push to your remote repository using ```git push```as you can see in the screenshot below.

Yeah, the push failed and the secrets/hardcoded APIs are being pointed out.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/failed-pre-push-hook.webp`} alt="failed pre push hook"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/failed-pre-push-hook.jpg`} alt="failed pre push hook"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/failed-pre-push-hook.jpg`} alt="failed pre push hook"/>
</picture>

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/Push-failed-pre-push.webp`} alt="push failed pre push"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/Push-failed-pre-push.jpg`} alt="push failed pre push"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/Push-failed-pre-push.jpg`} alt="push failed pre push"/>
</picture>

:::tip
Whenever you are fixing the pointed creds/API if they aren't false positive(keys you deliberately add and are not real keys).

You will need to clean your commit history else, the pointed creds/API will still show up in your remote repository if you later push to the remote repository.
:::

And that's all 😁.

In addition, if some hardcoded API or keys escape the pre-push hook.

You can then proceed to set up the github workflow of gguard or gitleak, so you can catch them there 😁.

Layering does help when doing shift-left in SDLC.

## What else can you do with git hooks?

I think you can also do some SAST testing, like the Golang security checker, they have a pre-commit hook, see <a href="https://github.com/TekWizely/pre-commit-golang" target="_blank">here</a>.

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