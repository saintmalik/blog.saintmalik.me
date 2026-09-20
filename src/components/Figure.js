import React from "react";

/**
 * Blog figure wrapper. Prefer:
 *   <Figure><picture>...</picture><p>caption</p></Figure>
 * Use root-relative /bgimg/... (or siteConfig.baseUrl + "bgimg/...") so images
 * load on yarn start and in production. Do not use siteConfig.url — that is the
 * canonical https host and breaks unpublished local assets.
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
