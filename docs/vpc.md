---
title: Access internal assets access, aws
---
import Giscus from "@giscus/react";


Don’t make it public. Give it a private IP address.
Put it behind SSO and VPN
Easiest option will be to modify the subnet inbound settings and white list whoever u want accessing the service
I mean whitelisting their IP
Another option will be to use a vpc tunnel(https://support.perimeter81.com/docs/configuring-a-site-to-site-ipsec-tunnel-to-aws-virtual-gateway)


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