---
slug: dockerfile-best
title: Container Security Monitoring
author: Abdulmalik
draft: true
image: https://saintmalikme.mo.cloudinary.net/bgimg/peace-of-mind.webp
tags: [appsec, container, monitoring, devsecops]
---

After the whole container hardening, dockerfile security practices implementation.

You still need a monitoring/feedbacks process which gives you more detailed update of what is going on in your container.

who is trying to access the /etc/passwd file, is someone trying to breakout of the container?.

<!--truncate-->

did someone just launched a network process in your container?, what's happening to your application on runtime?

In this guide, i will walk you through how to use Falco to monitor your container security.

Falco can be used for monitoring kubernetes and containers at runtime and it also allows logging which would help you to audit things that has happened.

Falco need access to read kernel events and it uses eBPF to

falco works on rules, its a rule based tools and the rules can be written in yaml file

Some of the example of malicious activities are:

Privilege escalation using privileged containers
Executing shell binaries such as sh, bash, csh, zsh, etc inside a container
Installing the packages on a running container
Executing SSH binaries such as ssh, scp, sftp, listeners etc.