---
title:  Hackthebox invite challenge
---

import Giscus from "@giscus/react";

lifeisabouttrying

Checked the source code nothing

Check the requests nothing like a parameter there

So one js caught my attention

Use a js beautifier and saw a json response which says sent a post request to api/invite/how/to/generate

Then I got a ROT13 encoded text.. decode it with

Echo “rot13 text” | tr '[A-Za-z]' '[N-ZA-Mn-za-m]'

Got an output saying send a POST request to /api/invite/generate and yeah I got another json parameter in the request response, this time around it was a base64 encoded text. But if you not sure which hash the code you get is, use “**[https://www.tunnelsup.com/hash-analyzer/](https://www.tunnelsup.com/hash-analyzer/)**" to get the hash that your code is, now that I know the hash is a base64 encoded hash. I decoded it using echo “base64 text” | base64 —decode

And here I got my invite code.

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