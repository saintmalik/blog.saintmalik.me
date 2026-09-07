import React, {useMemo, useState} from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  PageMetadata,
  HtmlClassNameProvider,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import BlogLayout from '@theme/BlogLayout';
import SearchMetadata from '@theme/SearchMetadata';
import BlogPostItems from '@theme/BlogPostItems';
import BlogListPageStructuredData from '@theme/BlogListPage/StructuredData';
import styles from './styles.module.css';

const INITIAL_COUNT = 15;
const LOAD_MORE_COUNT = 15;

function BlogListPageMetadata(props) {
  const {metadata} = props;
  const {
    siteConfig: {title: siteTitle},
  } = useDocusaurusContext();
  const {blogDescription, blogTitle, permalink} = metadata;
  const isBlogOnlyMode = permalink === '/';
  const title = isBlogOnlyMode ? siteTitle : blogTitle;
  return (
    <>
      <PageMetadata title={title} description={blogDescription} />
      <SearchMetadata tag="blog_posts_list" />
    </>
  );
}

function BlogListPageContent(props) {
  const {items, sidebar} = props;
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );
  const hasMore = visibleCount < items.length;
  const remaining = items.length - visibleCount;

  return (
    <BlogLayout sidebar={sidebar}>
      <BlogPostItems items={visibleItems} />
      {hasMore && (
        <div className={styles.showMoreWrap}>
          <button
            type="button"
            className={styles.showMoreButton}
            onClick={() =>
              setVisibleCount((count) =>
                Math.min(count + LOAD_MORE_COUNT, items.length),
              )
            }>
            Show more
            <span className={styles.showMoreMeta}>
              ({Math.min(LOAD_MORE_COUNT, remaining)} of {remaining})
            </span>
          </button>
        </div>
      )}
    </BlogLayout>
  );
}

export default function BlogListPage(props) {
  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogListPage,
      )}>
      <BlogListPageMetadata {...props} />
      <BlogListPageStructuredData {...props} />
      <BlogListPageContent {...props} />
    </HtmlClassNameProvider>
  );
}
