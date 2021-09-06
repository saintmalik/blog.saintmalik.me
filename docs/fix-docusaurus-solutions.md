---
title: Solutions to Docusaurus Issues i experienced
---

## Autoreload while in localhost

Auto reload docusaurus in loaclhoste using `yarn start`

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
