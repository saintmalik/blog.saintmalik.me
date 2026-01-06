import React from 'react';
import BlogPostPage from '@theme-original/BlogPostPage';
// import HireMeModal from '../../components/HireMeModal';
import ShareButtons from '../../components/ShareButtons';

export default function BlogPostPageWrapper(props) {
  return (
    <>
      {/* Render original blog post page with all original props intact */}
      <BlogPostPage {...props} />

      {/* <ShareButtons blogProps={props} /> */}

      {/* Render your modal */}
      {/* <HireMeModal /> */}
    </>
  );
}
