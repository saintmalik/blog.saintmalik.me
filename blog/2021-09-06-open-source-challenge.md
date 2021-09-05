---
slug: open-source-challenge
title: My Open Source Challenge 2021 Experince
description: "Here is my OSCA Africa Open Source Challenge 2021."
author: Saintmalik
author_title: OSS Contributor
author_url: https://github.com/saintmalik
author_image_url: https://raw.githubusercontent.com/saintmalik/saintmalik.me/master/static/images/saintmalik2.jpeg
image: /bgimg//bgimg/open-source-challenge-2021.jpg
tags: [open source, oss]
---

import Figure from '../src/components/Figure';

I joined the OSCA Africa Open Source Challenge 2021 which Kick-Started on 16th of August 2021.

<!--truncate-->

<picture>
  <source type="image/webp" srcset="/bgimg/open-source-challenge-2021.webp"/>
  <source type="image/jpeg" srcset="/bgimg/open-source-challenge-2021.jpeg"/>
  <img src="/bgimg/open-source-challenge-2021.jpg"/>
</picture>


Yeah the challenge is great way to learn and contribute to Open Source, there was collaborations within with other colleagues from the OSCA Ado Ekiti who are also participating in the challenge.

I meet with new individuals and we shared ideas also.

So i revisted Open source projects that i have made attempts to get a pull request of mine merged into the OSS Project before in 2020.

And this time around, i got it, its really awesome knowing you are also a contributor of an OSS project that is used by alot of people.

I made my first contribution to [GitHub Docs](https://docs.github.com/) Last Year during the hacktoberfest program.

Although my PR was valid and it adds value, but it wasn't merged because the fix can't be applied in the public repo.

<Figure>
<picture>
  <source type="image/webp" srcset="/bgimg/github-broken.webp"/>
  <source type="image/jpg" srcset="/bgimg/github-broken.jpg"/>
  <img src="/bgimg/github-broken.jpg"/>
</picture>
  <a href="https://github.com/github/docs/pull/637">https://github.com/github/docs/pull/637</a>
  </Figure>

But not withstanding, it was awarded the hackertofest-accepted label, so i moved on, before coming back again to the GitHub Docs in this Challenge and i finally got a merged PR in GitHub Docs.

<picture>
  <source type="image/webp" srcset="/bgimg/github-merged.webp"/>
  <source type="image/jpg" srcset="/bgimg/github-merged.jpg"/>
  <img src="/bgimg/github-merged.jpg"/>
</picture>

This time around i was making corrections to typos which i found in the GitHub Docs, and yeah it was accepted and it got merged.

Moving to the next OSS Project which is [gohugo](https://gohugo.io/), i used Hugo Site Generator for building my folio page, so i have been to their docs page almost everytime to find solutions to error or how i can implement something.

So you know how it feels like to contribute to a project used by yourself and many people, i looked for something to contribute, but it wasnt merged, so i left it.

<picture>
  <source type="image/webp" srcset="/bgimg/gohugo-notmerged.webp"/>
  <source type="image/jpg" srcset="/bgimg/gohugo-notmerged.jpg"/>
  <img src="/bgimg/gohugo-notmerged.jpg"/>
</picture>

So now i came back to it in this challenge and i finally got a merged PR into [gohugo docs](https://github.com/gohugoio/hugoDocs).

<picture>
  <source type="image/webp" srcset="/bgimg/gohugo-merged.webp"/>
  <source type="image/jpg" srcset="/bgimg/gohugo-merged.jpg"/>
  <img src="/bgimg/gohugo-merged.jpg"/>
</picture>

Something awesome also happened to me in this challenge, i got mentioned and thanked for contributing to two OSS project.

<Figure>
<picture>
  <source type="image/webp" srcset="/bgimg/cli mention.webp"/>
  <source type="image/jpg" srcset="/bgimg/cli mention.jpg"/>
  <img src="/bgimg/cli mention.jpg"/>
</picture>
  <a href="https://github.com/cli/cli/discussions/4183">https://github.com/cli/cli/discussions/4183</a>
  </Figure>
<Figure>
<picture>
  <source type="image/webp" srcset="/bgimg/prisma-mention.webp"/>
  <source type="image/jpg" srcset="/bgimg/prisma-mention.jpg"/>
  <img src="/bgimg/prisma-mention.jpg"/>
</picture>
  <a href="https://github.com/prisma/prisma/discussions/8892">https://github.com/prisma/prisma/discussions/8892</a>
  </Figure>

Moving forward, i crossed path with docker in the process of creating a DockerFile for a GoLang Cli based project, so i learnt about docker containers, docker images.

So i wrote my first Dockerfile and submited the PR, but its yet to be merged, will update this post, if it gets merged.

I also learnt how to implement github workflows so well, it saves maintainers alot of stress, so they can implement checks for any PR submitted.

In my own case i implemented the awesome linting and broken Links check for this [Awesome OSS Docs](https://github.com/saintmalik/awesome-oss-docs)(📚 A curated list of awesome open source documentations for people whole love contributing to docs.)

The workflow saves my time of running `npx awesome-lint` everytime i merge a contribution, so if the changes that is been submitted isnt abiding by the awesome-lint rules.

It will raise the red X for the pull request, also the broken linke workflow rules will test those urls for inaccessible urls or dead links, to avoid adding docs links that isnt accessible.

So i learnt more about the workflows process and i implemented workflows for some other repo i own.