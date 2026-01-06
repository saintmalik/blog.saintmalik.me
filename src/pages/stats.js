import React from 'react';
import Layout from '@theme/Layout';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <Layout
      title="Analytics Dashboard"
      description="Cloudflare Traffic and Performance Analytics"
      noFooter={true}
    >
      <main>
        <AnalyticsDashboard />
      </main>
    </Layout>
  );
}
