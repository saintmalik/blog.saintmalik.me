import React from "react";

export default function Figure({ children, src }) {
  return (
    <figure style={{ textAlign: "center",  }}>
    <picture>
        <source type="image/webp" srcset={src} />
        <source type="image/jpeg" srcset={src} />
        <img src={src} />
    </picture>
    <figcaption style={{ color: "gray", fontSize: "small" }}>
    {children}
  </figcaption>
</figure>
    );
}