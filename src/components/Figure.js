import React from "react";

/**
 * Blog figure wrapper. Prefer:
 *   <Figure><picture>...</picture><p>caption</p></Figure>
 * Use siteConfig.url for /bgimg/* so webp→png/jpeg fallback works.
 * Legacy: <Figure src="...">caption</Figure>
 */
export default function Figure({ children, src, alt = "" }) {
  return (
    <figure className="blog-figure">
      {src ? (
        <picture>
          <source type="image/webp" srcSet={src} />
          <img src={src} alt={alt} loading="lazy" />
        </picture>
      ) : null}
      {children}
    </figure>
  );
}
