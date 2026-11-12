import React from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useBlogPostStructuredData} from '@docusaurus/plugin-content-blog/client';
import {applyTrailingSlashPolicy} from '../../../utils/canonicalUrl';

export default function BlogPostStructuredData() {
  const structuredData = useBlogPostStructuredData();
  const {siteConfig} = useDocusaurusContext();
  const normalized = applyTrailingSlashPolicy(
    structuredData,
    siteConfig.trailingSlash === true,
  );

  return (
    <Head>
      <script type="application/ld+json">{JSON.stringify(normalized)}</script>
    </Head>
  );
}
