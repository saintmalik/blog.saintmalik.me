import React from 'react';
import PropTypes from 'prop-types';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

export default function ShareButtons({ title, url, blogProps }) {
  // Fallback to blogProps only if title or url are not provided
  const childrenProps = blogProps?.children?.props;
  const metadata = childrenProps?.metadata;
  const finalTitle = title || blogProps?.children?.type?.metadata?.title || blogProps?.children?.type?.frontMatter?.title || 'Check this out!';

  // Use ExecutionEnvironment to safely access window
  const permalink = url || metadata?.permalink || (ExecutionEnvironment.canUseDOM ? window.location.pathname : '') || '';
  const cleanPermalink = permalink.startsWith('/') ? permalink : `/${permalink}`;
  const finalUrl = url || `https://blog.saintmalik.me${cleanPermalink}`;

  const encodedTitle = encodeURIComponent(finalTitle);
  const encodedUrl = encodeURIComponent(finalUrl);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
  };

  return (
    <div
      style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        padding: '20px',
        margin: '30px 0',
        textAlign: 'center',
      }}
    >
      <h4
        style={{
          marginBottom: '15px',
          color: '#495057',
          fontSize: '16px',
          fontWeight: '600',
        }}
      >
        Share this post:
      </h4>

      {process.env.NODE_ENV !== 'production' && (
        <div
          style={{
            fontSize: '12px',
            color: '#666',
            marginBottom: '10px',
            backgroundColor: '#fff3cd',
            padding: '8px',
            borderRadius: '4px',
          }}
        >
          "{finalTitle}"
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: '#1DA1F2',
            color: 'white',
            padding: '10px 16px',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#0d8bd9')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#1DA1F2')}
          aria-label="Share on X (Twitter)"
        >
          Share on X
        </a>

        <a
          href={shareLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: '#0077b5',
            color: 'white',
            padding: '10px 16px',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#005582')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#0077b5')}
          aria-label="Share on LinkedIn"
        >
          Share on LinkedIn
        </a>

        <a
          href={shareLinks.reddit}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: '#FF4500',
            color: 'white',
            padding: '10px 16px',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#cc3700')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#FF4500')}
          aria-label="Share on Reddit"
        >
          Share on Reddit
        </a>
      </div>
    </div>
  );
}

ShareButtons.propTypes = {
  title: PropTypes.string,
  url: PropTypes.string,
  blogProps: PropTypes.shape({
    children: PropTypes.shape({
      props: PropTypes.shape({
        frontMatter: PropTypes.shape({
          title: PropTypes.string,
        }),
        metadata: PropTypes.shape({
          permalink: PropTypes.string,
        }),
      }),
    }),
  }),
};