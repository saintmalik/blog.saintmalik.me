import React from 'react';
import Link from '@docusaurus/Link';
import {translate} from '@docusaurus/Translate';
import {PageMetadata} from '@docusaurus/theme-common';
import {useDateTimeFormat} from '@docusaurus/theme-common/internal';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

function Year({year, posts}) {
  const dateTimeFormat = useDateTimeFormat({
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const formatDate = (lastUpdated) =>
    dateTimeFormat.format(new Date(lastUpdated));
  return (
    <div className={styles.yearBlock}>
      <Heading as="h3" id={year} className={styles.yearHeading}>
        {year}{' '}
        <span className={styles.yearCount}>({posts.length})</span>
      </Heading>
      <ul className={styles.postList}>
        {posts.map((post) => (
          <li key={post.metadata.permalink}>
            <Link to={post.metadata.permalink}>
              {formatDate(post.metadata.date)} - {post.metadata.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function YearsSection({years}) {
  return (
    <section className={styles.yearsSection}>
      <div className={styles.yearsGrid}>
        {years.map((props) => (
          <Year key={props.year} {...props} />
        ))}
      </div>
    </section>
  );
}

function listPostsByYears(blogPosts) {
  const postsByYear = blogPosts.reduce((posts, post) => {
    const year = post.metadata.date.split('-')[0];
    const yearPosts = posts.get(year) ?? [];
    return posts.set(year, [post, ...yearPosts]);
  }, new Map());
  return Array.from(postsByYear, ([year, posts]) => ({
    year,
    posts,
  }));
}

export default function BlogArchive({archive}) {
  const title = translate({
    id: 'theme.blog.archive.title',
    message: 'Archive',
    description: 'The page & hero title of the blog archive page',
  });
  const description = translate({
    id: 'theme.blog.archive.description',
    message: 'Archive',
    description: 'The page & hero description of the blog archive page',
  });
  const years = listPostsByYears(archive.blogPosts);
  return (
    <>
      <PageMetadata title={title} description={description} />
      <Layout>
        <header className={`hero hero--primary ${styles.banner}`}>
          <div className="container">
            <Heading as="h1" className={`hero__title ${styles.bannerTitle}`}>
              {title}
            </Heading>
          </div>
        </header>
        <main>{years.length > 0 && <YearsSection years={years} />}</main>
      </Layout>
    </>
  );
}
