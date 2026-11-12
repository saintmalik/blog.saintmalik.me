import React from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useBreadcrumbsStructuredData} from '@docusaurus/plugin-content-docs/client';
import {applyTrailingSlashPolicy} from '../../../utils/canonicalUrl';

export default function DocBreadcrumbsStructuredData(props) {
  const structuredData = useBreadcrumbsStructuredData({
    breadcrumbs: props.breadcrumbs,
  });
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
