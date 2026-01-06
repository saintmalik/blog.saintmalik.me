---
title: Bash Set Options to the rescue
---
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Recently worked on small bash script status validation check on github action, it was a frustrating one though, because it kept failing without a reason, tested the same script locally and it worked.

```bash
#/bin/bash

set -x
values="success success success success"

count_success=$(echo ${values[@]} | grep -o 'success' | grep -c '^')
count_failure=$(echo ${values[@]} | grep -o 'failure' | grep -c '^')

if [[ $count_success -eq 4 ]]; then
  echo "success"
elif [[ $count_failure -ge 1 ]]; then
  echo "failure"
else
  echo "undefined"
fi
```

So i did set ```set -x``` from the start, this ```set``` option is what we use in debugging a bash script, to see where the error is could be coming from, but with the below screenshot, you sure see that there isnt error here

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/bash-options.webp`} alt="bash options"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/bash-options.jpg`} alt="bash options"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/bash-options.jpg`} alt="bash options"/>
</picture>

but running this same script was returning errors in github actions, so here is what i felt happended, since i set **$count_failure** to be greater or equal to ***1*** and the value it's getting is **0**.

so i guess the error starts from there and the scripts exit with a response code of **1** instead of **0**.

but now that i dont want the command to end there, since the error isnt really an error, then we can make use of the set option ```set +e```.

This set options makes sure the command doesnt exit a sequence because of an error, so it will competely run the script without exit on the fail or error it encounters before the exit of the commands.

```bash
#/bin/bash

set +e
values="success success success success"

count_success=$(echo ${values[@]} | grep -o 'success' | grep -c '^')
count_failure=$(echo ${values[@]} | grep -o 'failure' | grep -c '^')

if [[ $count_success -eq 4 ]]; then
  echo "success"
elif [[ $count_failure -ge 1 ]]; then
  echo "failure"
else
  echo "undefined"
fi
```

And that was it, there are more other  usefull set options like, ```set -u```, ```set -v```.

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