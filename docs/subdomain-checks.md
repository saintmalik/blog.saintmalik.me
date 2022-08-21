---
title: How i go about my Subdomain Gathering
---
import Giscus from "@giscus/react";

Gather subdomain from GitHub

Gather subdomain from asset finder

Gather subdomain from findomain

Gather subdomain from amass

Gather subdomain from subfinder

Gather subdomain from

-------
------
-----

assetfinder -subs-only target.com > assetfinderdom.txt 

subl -d target.com  -o subl.txt 

subfinder -d target.com  -o subf.txt

github-subdomains.py -t GITHUB TOKEN -d $1 > domainfromgit.txt

gau -subs target.com | awk -F[/:] '{print $4}' | sort -u > gaudomains.txt

findomain -t target.com

Amass enum -d target.com

amass enum -passive -d target.com-o na.txt -config /home/saintmalik/config.ini -o np.txt

amass enum -passive -d target.com-o na.txt

amass enum -active -d target.com

amass enum -passive -d target.com-config /home/saintmalik/config.ini -o np.txt

#checking for alive domains

**echo** **"\n\n[+] Checking for alive domains..\n"**

**cat** domains.txt | httpx -status-code | tee **-a** alive.txt

4668 > 4800

200 > 225

amass passives With subsister 225 > 232 >242 > 336 > 327

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