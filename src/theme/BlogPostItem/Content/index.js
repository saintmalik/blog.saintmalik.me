import React from 'react';
import Content from '@theme-original/BlogPostItem/Content';
import ShareButtons from '../../../components/ShareButtons';
import { useLocation } from '@docusaurus/router';

export default function ContentWrapper(props) {
  const location = useLocation();
  const isPostPage = /^\/[^/]+\/?$/.test(location.pathname); // Matches /something/ but not / or /tags/
  return (
    <>
      {isPostPage && <ShareButtons blogProps={props} />}
      <Content {...props} />
    </>
  );
}
