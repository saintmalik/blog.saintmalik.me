const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Generates static/llms.txt from docs/ and blog/ (the stock npm plugin only walks docs/).
 */
module.exports = function generateLlmsTxtPlugin(context, options = {}) {
  const isDev = process.env.NODE_ENV === 'development';
  const siteDir = context.siteDir;
  const docsDir = path.join(siteDir, 'docs');
  const blogDir = path.join(siteDir, 'blog');
  const staticDir = path.join(siteDir, 'static');
  const outputFile = path.join(staticDir, options.outputFile || 'llms.txt');

  function getCategoryPosition(dir) {
    const categoryFile = path.join(dir, '_category_.yml');
    if (fs.existsSync(categoryFile)) {
      const categoryData = yaml.load(fs.readFileSync(categoryFile, 'utf8'));
      return categoryData.position || null;
    }
    return null;
  }

  function getSortedFiles(dir) {
    if (!fs.existsSync(dir)) {
      return [];
    }
    const files = fs.readdirSync(dir, {withFileTypes: true});
    const items = [];

    files.forEach((file) => {
      const fullPath = path.join(dir, file.name);
      if (file.name.startsWith('.')) {
        return;
      }

      if (file.isDirectory()) {
        items.push({
          type: 'category',
          path: fullPath,
          position: getCategoryPosition(fullPath),
        });
      } else if (file.name.endsWith('.md') || file.name.endsWith('.mdx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const sidebarPositionMatch = content.match(/sidebar_position:\s*(\d+)/);
        const position = sidebarPositionMatch
          ? parseInt(sidebarPositionMatch[1], 10)
          : null;
        items.push({type: 'file', path: fullPath, position, content});
      }
    });

    return items.sort(
      (a, b) => (a.position ?? Infinity) - (b.position ?? Infinity),
    );
  }

  function shouldIncludePage(content) {
    const metadataMatch = content.match(/^---([\s\S]*?)---/);
    if (metadataMatch) {
      const metadata = metadataMatch[1];
      const isDraft = /draft:\s*true/.test(metadata);
      const isHidden =
        /hidden:\s*true/.test(metadata) || /unlisted:\s*true/.test(metadata);
      if (isHidden) return false;
      if (isDraft) return isDev;
      return true;
    }
    return true;
  }

  function cleanContent(content) {
    return content.replace(/^---[\s\S]*?---\s*/, '').trim();
  }

  function processDir(dir, rootDir, labelPrefix, contentArray) {
    const sortedItems = getSortedFiles(dir);

    sortedItems.forEach((item) => {
      if (item.type === 'file') {
        const content = item.content ?? fs.readFileSync(item.path, 'utf8');
        if (!shouldIncludePage(content)) {
          return;
        }
        const relativePath = path.relative(rootDir, item.path);
        const fileNameWithPath = relativePath.slice(
          0,
          -path.extname(relativePath).length,
        );
        contentArray.push(
          `// File: ${labelPrefix}${fileNameWithPath}\n\n${cleanContent(content)}`,
        );
      } else if (item.type === 'category') {
        processDir(item.path, rootDir, labelPrefix, contentArray);
      }
    });
  }

  async function generateContent() {
    if (!fs.existsSync(staticDir)) {
      fs.mkdirSync(staticDir, {recursive: true});
    }

    const contentArray = [];

    if (fs.existsSync(docsDir)) {
      processDir(docsDir, docsDir, '', contentArray);
    }

    if (fs.existsSync(blogDir)) {
      // Newest blog posts first (filename date prefix YYYY-MM-DD-...)
      const blogItems = getSortedFiles(blogDir)
        .filter((item) => item.type === 'file')
        .sort((a, b) => path.basename(b.path).localeCompare(path.basename(a.path)));

      blogItems.forEach((item) => {
        const content = item.content ?? fs.readFileSync(item.path, 'utf8');
        if (!shouldIncludePage(content)) {
          return;
        }
        const relativePath = path.relative(blogDir, item.path);
        const fileNameWithPath = relativePath.slice(
          0,
          -path.extname(relativePath).length,
        );
        contentArray.push(
          `// File: blog/${fileNameWithPath}\n\n${cleanContent(content)}`,
        );
      });
    }

    fs.writeFileSync(outputFile, contentArray.join('\n\n---\n\n'));
    console.log(
      `Generated: ${outputFile} (${isDev ? 'development' : 'production'} mode) — ${contentArray.length} pages`,
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
        .description('Generate the LLMs text file from docs/ and blog/')
        .action(async () => {
          await generateContent();
        });
    },
  };
};
