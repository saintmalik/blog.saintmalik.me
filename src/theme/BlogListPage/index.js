import React from 'react';
import BlogListPage from '@theme-original/BlogListPage';
import ConsultingAd from '../../components/ConsultingAd';

export default function BlogListPageWrapper(props) {
  return (
    <>
      <BlogListPage {...props} />
      <ConsultingAd />
    </>
  );
}
