const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Generates a curated /llms.txt index (title + URL + one-line description).
 *
 * Google Search does not use llms.txt for ranking or AI feature eligibility
 * (AI optimization guide). This file is optional for non-Google assistants.
 * Do NOT dump full markdown bodies here (previous generator did; 800KB+ of
 * JSX noise). Keep it a short map of high-signal pages.
 */
module.exports = function generateLlmsTxtPlugin(context, options = {}) {
  const isDev = process.env.NODE_ENV === 'development';
  const siteDir = context.siteDir;
  const docsDir = path.join(siteDir, 'docs');
  const blogDir = path.join(siteDir, 'blog');
  const staticDir = path.join(siteDir, 'static');
  const siteUrl = (context.siteConfig && context.siteConfig.url) || 'https://blog.saintmalik.me';
  const outputFile = path.join(staticDir, options.outputFile || 'llms.txt');
  const maxBlog = options.maxBlog || 40;
  const maxDocs = options.maxDocs || 40;

  function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    try {
      return yaml.load(match[1]) || {};
    } catch {
      return {};
    }
  }

  function shouldInclude(fm) {
    if (!fm || typeof fm !== 'object') return true;
    if (fm.hidden === true || fm.unlisted === true) return false;
    if (fm.draft === true) return isDev;
    return true;
  }

  function oneLine(text) {
    if (!text) return '';
    return String(text)
      .replace(/\s+/g, ' ')
      .replace(/["']/g, '')
      .trim()
      .slice(0, 180);
  }

  function blogUrl(fm, filePath) {
    if (fm.slug) return `${siteUrl}/${String(fm.slug).replace(/^\/|\/$/g, '')}/`;
    const base = path.basename(filePath).replace(/\.mdx?$/, '');
    // 2026-09-20-foo -> foo (Docusaurus default when no slug)
    const withoutDate = base.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    return `${siteUrl}/${withoutDate}/`;
  }

  function docsUrl(fm, filePath) {
    if (fm.slug === '/') return `${siteUrl}/docs/`;
    if (fm.slug) {
      const s = String(fm.slug).replace(/^\/|\/$/g, '');
      return `${siteUrl}/docs/${s}/`;
    }
    const base = path.basename(filePath).replace(/\.mdx?$/, '');
    return `${siteUrl}/docs/${base}/`;
  }

  function collectMarkdown(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith('.md') || name.endsWith('.mdx'))
      .map((name) => path.join(dir, name));
  }

  function entry(title, url, description) {
    const desc = oneLine(description);
    return desc
      ? `- [${title}](${url}): ${desc}`
      : `- [${title}](${url})`;
  }

  async function generateContent() {
    if (!fs.existsSync(staticDir)) {
      fs.mkdirSync(staticDir, {recursive: true});
    }

    const lines = [
      '# Abdulmalik / saintmalik blog',
      '> AppSec, DevSecOps, Kubernetes, and supply-chain notes from lived infra work.',
      '',
      `Site: ${siteUrl}`,
      'Author: Abdulmalik (AppSec Engineer) - https://saintmalik.me',
      '',
      '## Priority posts',
    ];

    const blogFiles = collectMarkdown(blogDir)
      .map((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        const fm = parseFrontmatter(content);
        return {filePath, fm, content};
      })
      .filter((item) => shouldInclude(item.fm) && item.fm.title)
      .sort((a, b) => path.basename(b.filePath).localeCompare(path.basename(a.filePath)))
      .slice(0, maxBlog);

    for (const item of blogFiles) {
      const title = oneLine(item.fm.title);
      lines.push(
        entry(title, blogUrl(item.fm, item.filePath), item.fm.description || ''),
      );
    }

    lines.push('', '## Notes / docs');

    const docFiles = collectMarkdown(docsDir)
      .map((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        const fm = parseFrontmatter(content);
        return {filePath, fm};
      })
      .filter((item) => shouldInclude(item.fm) && item.fm.title)
      .sort((a, b) => {
        const pa = a.fm.sidebar_position ?? 999;
        const pb = b.fm.sidebar_position ?? 999;
        if (pa !== pb) return pa - pb;
        return String(a.fm.title).localeCompare(String(b.fm.title));
      })
      .slice(0, maxDocs);

    for (const item of docFiles) {
      const title = oneLine(item.fm.title);
      lines.push(
        entry(title, docsUrl(item.fm, item.filePath), item.fm.description || ''),
      );
    }

    lines.push(
      '',
      '## Optional',
      '- Google Search does not require llms.txt for AI Overviews or AI Mode.',
      '- Prefer the live HTML pages above as the source of truth.',
      '',
    );

    fs.writeFileSync(outputFile, lines.join('\n'));
    console.log(
      `Generated curated llms.txt: ${outputFile} (${blogFiles.length} posts, ${docFiles.length} docs)`,
    );
  }

  return {
    name: 'generate-llms-txt-plugin',
    generateContent,
    async loadContent() {
      await generateContent();
    },
    async contentLoaded() {},
    extendCli(cli) {
      cli
        .command('generate-llms-txt')
        .description('Generate a curated llms.txt index from docs/ and blog/')
        .action(async () => {
          await generateContent();
        });
    },
  };
};
