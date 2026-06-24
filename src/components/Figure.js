import React from "react";

export default function Figure({ children, src }) {
  return (
    <figure style={{ textAlign: "center",  }}>
    <picture>
        <source type="image/webp" srcSet={src} />
        <source type="image/jpeg" srcSet={src} />
        <img src={src} />
    </picture>
    <figcaption style={{ color: "gray", fontSize: "small" }}>
    {children}
  </figcaption>
</figure>
    );
}