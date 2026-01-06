import React from 'react';
import BlogPostItem from '@theme-original/BlogPostItem';

export default function BlogPostItemWrapper(props) {
  return (
    <div style={{ position: 'relative' }}>
      <BlogPostItem {...props} />
      {/* <ShareButtons blogProps={props} /> */}
    </div>
  );
}