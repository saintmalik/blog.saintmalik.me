---
title: Automate FInding and Fixing typos in large scale documentation
---
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Good day guys, so i decided to write a  bash script to automate, find  and fix typos in large documentations either as a contributor or as a project maintainer.

Well i will like to say, this shouldnt be abused, Always make quality contribution and not quantity contribution to OSS Projects.

So lets get started;

Git clone the script from my github gist

```bash
git clone https://gist.github.com/b194aa4aba5bdaab8b74011fe9379ad3.git bulk-typos
```

Now navigate into the folder "bulk-typo"

```bash
cd bulk-typo
ls
```

Next give the scriopt an executing right using the below command

```bash
chmod +x bulk-typo-check.sh
```

Create a url file to add all the link of the github documentation repos

```bash
touch urls.txt
```

Then open the file to add the docs github repo urls.

```bash
nano urls.txt
```

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/edit-github-urls.webp`} alt="Add Github URLs"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/edit-github-urls.jpg`} alt="Add Github URLs"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/edit-github-urls.jpg`} alt="Add Github URLs"/>
</picture>

After adding the links, press CNTRL + x, and then enter Y, and click enter.

When you are done, run the script and add the file where you want the output of your typos and the file that contains the github url of the documentation repos.

```bash
./bulk-typo-check.sh OUTPUTFILE.txt urls.txt
```

e.g

```bash
./bulk-typo-check.sh mytypos.txt urls.txt
```

When the script is done running, you can find all the typos in the mytypos.txt file, just run

```bash
cat mytypos.txt
```

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/bulk-typo.webp`} alt="Bulk Typo Result"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/bulk-typo.jpg`} alt="Bulk Typo Result"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/bulk-typo.jpg`} alt="Bulk Typo Result"/>
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