import React from 'react';
import Head from '@docusaurus/Head';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';

/**
 * Emits FAQPage JSON-LD from frontmatter `faq:` only (no visible FAQ UI).
 * Google FAQ rich results are limited nowadays (mostly gov/health); JSON-LD still helps machines/AI.
 *
 * Frontmatter shape:
 * faq:
 *   - question: "..."
 *     answer: "..."
 */
export default function FaqJsonLd() {
  const {frontMatter, isBlogPostPage} = useBlogPost();
  if (!isBlogPostPage) {
    return null;
  }

  const faq = frontMatter?.faq;
  if (!Array.isArray(faq) || faq.length === 0) {
    return null;
  }

  const mainEntity = faq
    .filter((item) => item?.question && item?.answer)
    .map((item) => ({
      '@type': 'Question',
      name: String(item.question).trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: String(item.answer).trim(),
      },
    }));

  if (mainEntity.length === 0) {
    return null;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };

  return (
    <Head>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Head>
  );
}
