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

## What the comparison showed

From the three scanners tested against the same image, **Grype reported more findings than Trivy** for this particular image. AWS ECR Advanced Scan also surfaced issues, including application-layer findings.

That does not mean Grype is universally better. Scanners differ in:

- **Vulnerability databases** and update cadence
- **OS vs application** coverage
- **False positive rates** and severity scoring
- **CI integration** and output formats

## When to choose which

| Scenario | Sensible starting point |
|---|---|
| Images hosted in AWS ECR | AWS ECR Basic/Advanced scanning for native integration |
| Need fast, easy CI integration | Trivy or Grype via their GitHub Actions |
| Want the broadest detection on a single image | Run both Grype and Trivy and compare, then triage differences |
| Enterprise policy and reporting | Use a scanner that exports SARIF or supports policy enforcement |

## Completion criterion

After reading this, you should be able to:

1. Explain why no single scanner catches everything.
2. Pick Trivy, Grype, or AWS ECR scanning based on where your images live and your CI setup.
3. Run at least one container scan before an image reaches production.

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