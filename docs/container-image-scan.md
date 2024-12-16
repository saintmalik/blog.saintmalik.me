---
title: Container image scan
---
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

There are alot of container scanning tools, trivy, clair, grype, docker-scan and all?

but whivh one should you use, well if you host your container images on aws ecr, you will know aws ecr has an in repository scanning, both basic and advanced, the advanced scanning scans both os and app.

but the advanced scanning isnt free, its paid, i also read that aws ecr uses clair within their advanced scanning tool.

so i tested trivy, grype and aws ecr in repo advanced scan and here is the results.

### AWS ECR Advanced scan

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/aws-ecr-advanced-scan.webp`} alt="AWS ECR Advanced scan"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/aws-ecr-advanced-scan.jpg`} alt="AWS ECR Advanced scan"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/aws-ecr-advanced-scan.jpg`} alt="AWS ECR Advanced scan"/>
</picture>

### Grype Scan

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/grype.webp`} alt="Grype Scan"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/grype.jpg`} alt="Grype Scan"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/grype.jpg`} alt="Grype Scan"/>
</picture>

### Trivy Scan

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/trivy-os.webp`} alt="Trivy OS Scan"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/trivy-os.jpg`} alt="Trivy OS Scan"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/trivy-os.jpg`} alt="Trivy OS Scan"/>
</picture>

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/trivy-app.webp`} alt="Trivy App Scan"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/trivy-app.jpg`} alt="Trivy App Scan"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/trivy-app.jpg`} alt="Trivy App Scan"/>
</picture>

And here is the final result, we can see that grype performed better than trivy, i didnt have the chance to test with Clair

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