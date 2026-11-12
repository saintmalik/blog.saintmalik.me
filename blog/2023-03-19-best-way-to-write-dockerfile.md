---
slug: dockerfile-best-practices
title: Best Security Practices for Dockerfile
draft: true
authors: Abdulmalik
image: /bgimg/dockerfile-security-cover.webp
tags: [appsec, dockerfile, docker, devsecops]
faq:
  - question: "What are basic Dockerfile security practices?"
    answer: >-
      Use minimal base images, run as non-root, pin versions, drop unnecessary
      packages, and avoid leaking secrets in build layers. The post is the
      checklist I wish I had on my first Dockerfile.
  - question: "Should the container process run as root?"
    answer: >-
      No, unless you have a rare reason. Create a user and USER to it so a
      breakout starts with fewer privileges.
  - question: "Does a secure Dockerfile replace runtime monitoring?"
    answer: >-
      No. Image hygiene cuts the easy paths. You still want runtime signals
      for unexpected processes and file access. I cover monitoring separately.
---

Just like everyone, i wrote my first dockerfile without having in mind any best practices or security implementations .

<!--truncate-->

The first dockerfile i wrote was for an open source project and i just wanted to dockerize the tool and see it work then.

what changed now and what would i have considered then to make sure i am not just trying to dockerize my apps but also putting in mind the follow the security recommendations.

