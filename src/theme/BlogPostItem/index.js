import React from 'react';
import Link from '@docusaurus/Link';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import {useDateTimeFormat} from '@docusaurus/theme-common/internal';
import BlogPostItem from '@theme-original/BlogPostItem';
import styles from './styles.module.css';

function SlimListItem({children}) {
  const {metadata} = useBlogPost();
  const {permalink, title, date, description, hasTruncateMarker} = metadata;
  const dateTimeFormat = useDateTimeFormat({
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const formattedDate = dateTimeFormat.format(new Date(date));
  const showTruncateExcerpt = hasTruncateMarker && children;
  const showDescription = !showTruncateExcerpt && description;

  return (
    <article className={styles.listItem}>
      <time className={styles.listDate} dateTime={date}>
        {formattedDate}
      </time>
      <div className={styles.listBody}>
        <h2 className={styles.listTitle}>
          <Link to={permalink}>{title}</Link>
        </h2>
        {showTruncateExcerpt && (
          <div className={styles.listExcerpt}>{children}</div>
        )}
        {showDescription && (
          <p className={styles.listExcerptText}>{description}</p>
        )}
      </div>
    </article>
  );
}

export default function BlogPostItemWrapper(props) {
  const {isBlogPostPage} = useBlogPost();

  if (!isBlogPostPage) {
    return <SlimListItem>{props.children}</SlimListItem>;
  }

  return (
    <div style={{position: 'relative'}}>
      <BlogPostItem {...props} />
    </div>
  );
}
