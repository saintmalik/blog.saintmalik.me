import React from 'react';
import Content from '@theme-original/BlogPostItem/Content';
import ShareButtons from '../../../components/ShareButtons';
import { useLocation } from '@docusaurus/router';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ContentWrapper(props) {
  const location = useLocation();
  const isPostPage = /^\/[^/]+\/?$/.test(location.pathname); // Matches /something/ but not / or /tags/

  return (
    <>
      {isPostPage && (
        <BrowserOnly>
          {() => <ShareButtons blogProps={props} />}
        </BrowserOnly>
      )}
      <Content {...props} />
    </>
  );
}