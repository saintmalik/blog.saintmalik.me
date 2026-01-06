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
        background: '#0d1117',
        border: '1px solid #30363d',
        borderRadius: '12px',
        padding: '20px',
        margin: '32px 0',
      }}
    >
      <p
        style={{
          color: '#e6edf3',
          fontSize: '15px',
          fontWeight: '600',
          marginBottom: '16px',
          marginTop: 0,
        }}
      >
        Enjoyed this? Share it 👇
      </p>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#1DA1F2',
            color: 'white',
            padding: '12px 20px',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            flex: '1 1 auto',
            minWidth: '100px',
          }}
          aria-label="Share on X (Twitter)"
        >
          Share on 𝕏
        </a>

        <a
          href={shareLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#0A66C2',
            color: 'white',
            padding: '12px 20px',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            flex: '1 1 auto',
            minWidth: '100px',
          }}
          aria-label="Share on LinkedIn"
        >
          LinkedIn
        </a>

        <a
          href={shareLinks.reddit}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#FF4500',
            color: 'white',
            padding: '12px 20px',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            flex: '1 1 auto',
            minWidth: '100px',
          }}
          aria-label="Share on Reddit"
        >
          Reddit
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