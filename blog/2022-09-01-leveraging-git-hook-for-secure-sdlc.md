---
slug: leveraging-git-hook-hardcoded-secrets-codebase
title: Leveraging git hook for hardcoded secrets scanning in codebase
author: Saintmalik
author_title: Pentester
author_url: https://twitter.com/saintmalik_
author_image_url: https://res.cloudinary.com/saintmalik/image/upload/e_sharpen:2000,q_74,r_0/v1641922078/saintmalik.webp
image: /bgimg/leveraging-git-hook-hardcoded-secrets-codebase.png
tags: [gitops, devsecops, appsec]
---

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Almost everyone knows how to use .gitignore, the git file that helps you keep sensitive files like .env out of the tracking, commit and pushing process and also unwanted folders like node_modules and all.

But do you know secrets, hardcoded credentials and API aren't easy to deal with using .gitignore file? you dont want to keep your config.js or config.go file out of the commit process, this are essential files to your project.

<!--truncate-->

Okay, since you can't keep them out, you probably thinking, yes, i would use dummy creds, sandbox api, so you are good.

Yes, but in the dev process/circle, mistakes are inevitable, you are not always perfect, the pressure of delivering early is definately real, hence you end up pushing secrets to the public domain via github.

So how do we automate this secret/api/hardcoded creds process to avoid mistakes like this.

That brings us to Git Hooks

discovered git hook recently also, been a git user for a while and i am just discovering git hook this month, haha

## So what is git hook?

git hook are script or program that are placed in the hooks directory to trigger at certain point's in the git's execution process.

## Types of git hooks

There are many types of git hooks but here i will only be discussing about two which are "pre-commit" and "pre-push"

## What's the pre-commit hook?

The pre-commit hook is the script that runs immediately you enter the "git commit -m "Commiting my chnages", meaning that whatever instruction that is given to the pre-commit hook would initiate first before the commit.

So if the instructions fails, the commit would not take place and if the instructions is successful the commit will proceed.

### Pros:
   - Your secret/api/hardcoded keys would never make it into the commit history

### Cons:
   - It would be a blocker to the developer and can slow down the dev process

## What's the pre-push hook?

The pre-push hook is the script that runs right after you enter "git push", what ever instruction that is in the pre-push hook get executed first before the git push command, so if the instructions fails, the git push command wont get executed

But if the pre-push hook instructions is successful, the git push command will also execute.

### Pros:
 - Your secret/api/hardcoded keys wont make it to the remote repository
 - Scanning collections of commit in one go

### Cons:
  - The secret/api/hardcoded keys still remains in your git history

well, you can always clean your git history and rebase, <a href="https://hackernoon.com/how-to-clean-your-git-history-ryzb3ydv" target="_blank">here</a> is a detailed guide on that.


Now lets jump into the implementation;

I would be using <a href="https://github.com/Yelp/detect-secrets" target="_blank">detect-secrets</a> as my secret scanning tool in this guide.

Firstly, you need to install <a href="https://pre-commit.com/#install" target="_blank">pre-commit</a> tool

```toml
pip install pre-commit
```

then navigate into your project folder and create and .pre-commit-config.yaml in the root of your folder in your terminal

```yaml
touch .pre-commit-config.yaml
```

```yaml
open .pre-commit-config.yaml
```

then paste the following hook mapping inside the file you just created above

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


This hook mppaing tells pre-commit where to get the code for the hook from, so we would be using detect-secrets tool for our secret scanning, there are many other that you can use.

We have ggshield, gitleaks and <a href="https://github.com/sottlmarek/DevSecOps#secrets-management" target="_blank">more</a>.

Now lets install the pre-push hook

By default if you run "pre-commit install" in your project folder, it will install the default hook which is "pre-commit hook", so to install the pre-push hook, here is the command to use

```sh
pre-commit install --hook-type pre-push
```
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/pre-push.webp`} alt="pre push"/>
  <source type="image/png" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/pre-push.png`} alt="pre push"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/pre-push.png`} alt="pre push"/>
</picture>

So now that we have the pre-push hook install, lets test it out.

you can create config.js, config.yaml, config.json, .en, config.py

```sh
touch onfig.js config.yaml config.json .env config.py
```

now open those files and paste this dummy creds/secret in them

```sh
kred_herring = 'DEADBEEF'
id = 'YW1pYWx3YXlzZ2VuZXJhdGluZ3BheWxvYWRzd2hlbmltaHVuZ3J5b3JhbWlhbHdheXNodW5ncnk'

base64_secret = 'c2VjcmV0IG1lc3NhZ2Ugc28geW91J2xsIG5ldmVyIGd1ZXNzIG15IHBhc3N3b3Jk'
hex_secret = '8b1118b376c313ed420e5133ba91307817ed52c2'
basic_auth = 'http://username:whywouldyouusehttpforpasswords@example.com'

aws_access_key = 'AKIAIOSFODNN7EXAMPLE'
aws_secret_access_key = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
```

When you are done, add the file to git tracking and commit also

```sh
git add . && git commit -m " Git secret scanning using pre-commit hooks"
```
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/commit-pre-push.webp`} alt="commit pre push"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/commit-pre-push.jpg`} alt="commit pre push"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/commit-pre-push.jpg`} alt="commit pre push"/>
</picture>

after the commit, then you can push using "git push" and yes the push failed and the secrets/hardcoded apis are being pomited out.

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

So now when you fix the pointed creds/api if they are not false postivie(keys you delibrstely add and are not real keys), you will need to clen your commit history else, the pointed creds/api will still show up in your remote repository if you later push.

So thats all, but what if some hardcoded api or keys excape the pre-push hook, then you can set github workflow of gguard or gitleak.

Layering do help when doing shiftleft in SDLC.

What else can you do with git hooks? i think you can also do some SAST testing, like the Golang security checker, they have a pre-commit hook, see <a href="https://github.com/TekWizely/pre-commit-golang" target="_blank">here</a>



<br></br>
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