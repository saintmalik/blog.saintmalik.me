---
slug: eks-private-apiserver
title:  "Managing multiple EKS clusters access using Private EKS API Endpoint with OpenVPN"
authors: Abdulmalik
draft: true
image: /bgimg/eks-private-openvpn.webp
tags: [devops, devsecops, appsec]
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

Well, it really doesn’t matter to lot of people though, but being in the security space as a DevSecOps Engineer, i get that body itch, come on, why will you expose your kubernetes cluster ApiServer public endpoint especially for production cluster.

I get it gives that easy get go and access, but bet you, just little more effort from you and me, we can have a reduced attack surface and we would both sleep well at night, atleast to some extent .

A win for you as the DevOps/Infra Engineer and win for me who is putting the Sec into your existing process.
<!--truncate-->

Here is what it looks like if you enable public apiserver endpoint

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/public-apiserver.webp`} alt="EKS Public APIServer"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/public-apiserver.png`} alt="EKS Public APIServer"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/public-apiserver.png`} alt="EKS Public APIServer"/>
</picture>
<p style={{ color: 'green' }}>Credit: jaanhio.me Blog</p>
</Figure>


And what it looks like when you have it disabled and enabled private apiserver endpoint

<Figure>
<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/private-apiserver.webp`} alt="EKS Private APIServer"/>
  <source type="image/jpg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/private-apiserver.png`} alt="EKS Private APIServer"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/private-apiserver.png`} alt="EKS Private APIServer"/>
</picture>
<p style={{ color: 'green' }}>Credit: jaanhio.me Blog</p>
</Figure>

Let's jump right in,


Take care guys 🤞🏽.

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
