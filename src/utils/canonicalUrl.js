/**
 * Docusaurus metadata.permalink omits the trailing slash even when
 * trailingSlash:true. HTML rel=canonical and the sitemap add it; BlogPosting /
 * BreadcrumbList JSON-LD do not — so Google sees a no-slash URL in schema, crawls
 * it, and classifies that URL as "Page with redirect".
 */
function isAssetUrl(url) {
  return /\.(?:webp|png|jpe?g|gif|svg|pdf|ico|xml|txt|js|css|woff2?)$/i.test(url);
}

function ensureTrailingSlash(url) {
  if (!url || typeof url !== 'string') {
    return url;
  }
  if (!/^https?:\/\//i.test(url) || url.includes('#') || url.includes('?')) {
    return url;
  }
  if (isAssetUrl(url) || url.endsWith('/')) {
    return url;
  }
  return `${url}/`;
}

const PAGE_URL_KEYS = new Set(['@id', 'url', 'mainEntityOfPage', 'item']);

function applyTrailingSlashPolicy(value, enabled) {
  if (!enabled) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyTrailingSlashPolicy(item, enabled));
  }
  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, child] of Object.entries(value)) {
      if (PAGE_URL_KEYS.has(key)) {
        next[key] = ensureTrailingSlash(child);
      } else if (child && typeof child === 'object') {
        next[key] = applyTrailingSlashPolicy(child, enabled);
      } else {
        next[key] = child;
      }
    }
    return next;
  }
  return value;
}

module.exports = {
  ensureTrailingSlash,
  applyTrailingSlashPolicy,
};
