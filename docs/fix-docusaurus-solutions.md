---
title: Solutions to Docusaurus Issues i experienced
---
import Giscus from "@giscus/react";

## Autoreload while in localhost

Auto reload docusaurus in loaclhost using `yarn start` and `npm start`

## Add captions to blog images

Create Figure.js in your src/components and add this code snippet.

```jsx title="/src/components/Figure.js"
import React from "react";

export default function Figure({ children, src }) {
  return (
    <figure style={{ textAlign: "center",  }}>
        <img src={src} />
    <figcaption style={{ color: "gray", fontSize: "small" }}>
    {children}
  </figcaption>
</figure>
    );
}
```

and now go into your markdown file  and import it

```
import Figure from '../src/components/Figure';
```

and wrap your image with this

```
<Figure>
  <img src=""/>
  Your Caption
</Figure>
```

Module not found : Error after updating Docusaurus everytime, Module not found: Error: Can't resolve '@theme/BlogPostAuthors' in '/blog.saintmalik.me/src/theme/BlogPostItem'


Just run

```
yarn run swizzle theme component
```

e.g

```
yarn run swizzle @docusaurus/theme-classic BlogPostItem --danger
```

since i use @docusaurus/theme-classic, thats why i used this example, if you use something else like @docusaurus/preset-classic, change yours to that.

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