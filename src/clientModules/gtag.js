const GA4_ID = 'G-LYQVDXF79Z';

function sendPageView(path) {
  if (typeof window.gtag !== 'function') {
    return;
  }
  window.gtag('set', 'page_path', path);
  window.gtag('event', 'page_view');
}

export function onRouteDidUpdate({location, previousLocation}) {
  if (!previousLocation) {
    return;
  }

  const path = location.pathname + location.search + location.hash;
  const prevPath =
    previousLocation.pathname +
    previousLocation.search +
    previousLocation.hash;

  if (path === prevPath) {
    return;
  }

  // Defer until react-helmet-async updates document.title (Docusaurus #7420)
  setTimeout(() => sendPageView(path));
}

// Ensure stub exists before gtag.js loads; ad blockers may still remove it later
if (typeof window !== 'undefined') {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, {anonymize_ip: true});
}
