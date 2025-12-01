---
title: Trenches Infra - Subdomain Routing to Cloud Run (Staging Strategy)
description: Leveraging Cloudflare Workers as a lightweight reverse proxy for Cloud Run staging environments to bypass GCLB costs and propagation delays.
---
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

# Trenches Infra: Zero-Latency Staging Routing

When spinning up ephemeral or staging environments on **Google Cloud Run**, engineers often face a dilemma regarding custom domain mapping. Native Cloud Run mapping is notoriously slow (SSL provisioning can take 15+ minutes), and setting up a full Google Cloud Load Balancer (GCLB) incurs a minimum ~$18/month cost per instance plus complexity overhead.

For a staging environment where velocity and immediate feedback are paramount, neither option is ideal.

This document details a "Trenches" approach: using a **Cloudflare Worker** as a transparent reverse proxy. This allows us to route a custom subdomain (e.g., `staging-api.domain.com`) to a Cloud Run URL instantly, while forcing a **zero-caching policy** to ensure developers always interact with the latest deployment.

### The Architecture

Instead of a heavy load balancer, we use the Edge to rewrite the request headers before they hit Google's infrastructure.

<picture>
  <source type="image/webp" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/trench-infra.webp`} alt="trench-infra"/>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/trench-infra.jpg`} alt="trench-infra"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/trench-infra.jpg`} alt="trench-infra"/>
</picture>

### The Implementation

The following Worker script handles the proxying. It is specifically tuned for **Staging** environments by aggressively stripping caching layers.

**Key Technical Decisions:**

1.  **Host Header Rewriting:** Cloud Run rejects requests if the `Host` header does not match the generated `.run.app` domain. We swap this at the edge.
2.  **Aggressive Cache Busting:** We utilize `cf: { cacheTtl: -1 }` in the fetch request and inject `Cache-Control: no-store` in the response. This prevents Cloudflare, the browser, and intermediate proxies from caching stale staging data.
3.  **Header Sanitization:** We strip Cloudflare-specific headers (`cf-connecting-ip`, `cf-ray`) before forwarding to the upstream to keep the request cleaner, though this can be adjusted if the upstream needs client IP geolocation.

<!-- end list -->

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Proxies request to Cloud Run while enforcing a strict no-cache policy
 * for staging environments.
 */
async function handleRequest(request) {
  const url = new URL(request.url)

  // The upstream Cloud Run instance address
  const cloudRunHost = 'staging-nestjs-.....-uc.a.run.app'

  // 1. Prepare Headers for Upstream
  const headers = new Headers(request.headers)
  headers.set('Host', cloudRunHost) // CRITICAL: Cloud Run routing requirement

  // Optional: Clean up Cloudflare specific traces if not needed upstream
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ray')

  // 2. Reconstruct the Request
  const newRequest = new Request(`https://${cloudRunHost}${url.pathname}${url.search}`, {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : undefined,
  })

  // 3. Fetch from Cloud Run with Edge Caching Disabled
  const response = await fetch(newRequest, {
    cf: {
      cacheTtl: -1, // Force miss
      cacheEverything: false,
      scrapeShield: false,
      mirage: false,
      polish: "off"
    }
  })

  // 4. Sanitize Response Headers for the Client
  const newHeaders = new Headers(response.headers)

  // Enforce browser-side non-caching
  newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  newHeaders.set('Pragma', 'no-cache')
  newHeaders.set('Expires', '0')

  // Remove upstream CF headers to avoid confusion
  newHeaders.delete('cf-cache-status')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  })
}
```

### Deployment Strategy

Since this is infrastructure-as-code, deployment should be handled via `wrangler`.

1.  **Configuration:** Ensure your `wrangler.toml` targets the staging environment.
2.  **Routes:** Map the worker to your desired subdomain (e.g., `staging-api.yourdomain.com/*`).
3.  **Deploy:**
    ```bash
    npx wrangler deploy
    ```

### Trade-offs & Considerations

  * **Client IP Visibility:** By stripping `cf-connecting-ip` and rewriting the Host, the upstream NestJS app might lose context of the original client IP. If your application logic relies on IP rate limiting or geolocation, you should inject the `X-Forwarded-For` header explicitly in the `handleRequest` function.
  * **Cold Starts:** Unlike a GCLB which keeps connections warm, this method is subject to standard Cloud Run cold starts.
  * **Security:** This proxy effectively makes your Cloud Run instance public via the Worker. Ensure your application handles authentication (JWT/OAuth) correctly at the application layer.

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