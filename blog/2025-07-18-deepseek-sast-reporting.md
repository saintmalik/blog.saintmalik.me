---
slug: sast-recommendations-with-llm
title: DeepSeek + DevSecOps Scaling Secure Code Recommendations from SAST Scans
authors: Abdulmalik
image: https://saintmalikme.mo.cloudinary.net/bgimg/passwordless-rds.png
tags: [DevSecOps, SAST, LLM, DeepSeek, Cloudflare D1, GitHub Actions]
---

import Figure from '../src/components/Figure';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";

## Scaling DevSecOps: From One Engineer to Enabling Every Product Team

Scaling DevSecOps without burnout: how I moved from manual security reviews to AI-assisted recommendations that empower product teams.

<!--truncate-->

In the past, I was working on just a handful of products. When a static application security testing (SAST) scan returned findings, I could review each one, write remediation advice, and even work directly with developers.

But as I started supporting multiple product teams each shipping fast, each with its own codebase that manual approach quickly became unsustainable.

**SAST findings ballooned from dozens to hundreds, then thousands.**
Developers wanted actionable advice, fast. I needed a way to scale security recommendations **without burning out** or sacrificing quality.

---

## Why Not Just Use LLMs for Everything?

I turned to Large Language Models (LLMs) pecifically [DeepSeek](https://deepseek.com/) to generate remediation advice. The results were impressive:
- Recommendations were specific
- Contextual
- Often included actionable links

But there was a catch: **LLM APIs are rate-limited and can be expensive at scale.**
If I made an API call for every finding in every scan across all teams, I’d hit the limit fast (and rack up a big bill).

---

## Caching with Cloudflare D1: Never Repeat Yourself

So I built a caching layer using [Cloudflare D1](https://developers.cloudflare.com/d1/), a serverless SQLite database. Here’s my approach:

- **Normalize every SAST finding** (by rule, title, description)
- **Hash it** to create a deterministic cache key
- **Check D1 first:** If an identical finding has been seen before, retrieve the cached recommendation
- **Otherwise:** Ask DeepSeek for a new recommendation, then cache it to D1 for future scans

This meant:
- No duplicate API calls, no wasted quota
- Teams working on similar stacks get consistent advice
- My security pipeline is fast, reliable, and cost-effective

---

## The Technical Flow

### llmhelper.js (AI Recommendation + Caching)

```js name=llmhelper.js
const fetch = require("node-fetch");
const crypto = require("crypto");
const OpenAI = require("openai/index.js");

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const D1_DATABASE_ID = process.env.D1_DATABASE_ID;
const D1_API_KEY = process.env.D1_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const D1_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: DEEPSEEK_API_KEY,
});

function normalize(str) {
  return (str || "").trim().replace(/\s+/g, " ");
}

function makeCacheKey(finding) {
  const rule = normalize(finding.rule);
  const title = normalize(
    finding.title?.replace(/function argument `[^`]+`/, "function argument `<VAR>`")
  );
  const description = normalize(finding.description);
  const keyInput = `${rule}|${title}|${description}`;
  const hash = crypto.createHash("sha256").update(keyInput).digest("hex");
  return hash;
}

async function d1Query(sql, params = []) {
  const res = await fetch(D1_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${D1_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`D1 error: ${data.errors?.[0]?.message || res.statusText}`);
  return data.result?.[0]?.results || [];
}

async function ensureTable() {
  await d1Query(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cache_key TEXT UNIQUE,
      recommendation TEXT
    );
  `);
}

async function getAIRecommendation(finding, temperature = 0.0, maxRetries = 5) {
  await ensureTable();
  const cacheKey = makeCacheKey(finding);
  const rows = await d1Query(
    `SELECT recommendation FROM recommendations WHERE cache_key = ? LIMIT 1`,
    [cacheKey]
  );
  if (rows.length > 0 && rows[0].recommendation) {
    console.log(`✅ Cache hit: ${finding.rule}`);
    return rows[0].recommendation;
  }
  // Not cached: ask DeepSeek
  const prompt = `
You are a senior DevSecOps assistant.
For the following security issue, provide a short, actionable remediation recommendation and a reference link if possible.

Rule: ${finding.rule}
Title: ${finding.title}
Description: ${finding.description}

Recommendation:
`;
  let lastError;
  let recommendation;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature,
      });
      recommendation = response.choices[0].message.content.trim();
      await d1Query(
        `INSERT INTO recommendations (cache_key, recommendation) VALUES (?, ?) ON CONFLICT(cache_key) DO NOTHING`,
        [cacheKey, recommendation]
      );
      return recommendation;
    } catch (err) {
      lastError = err;
      if (err.status === 429) await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
      else break;
    }
  }
  throw lastError;
}

module.exports = { getAIRecommendation };
```

---

### reports.js (Findings Processing & Report Generation)

This script deduplicates findings, enriches them with recommendations, and outputs a summary markdown.

```js name=reports.js
const fs = require("fs");
const { getAIRecommendation } = require("./llmhelper");

class SecurityReportParser {
  normalizeSeverity(raw) {
    const level = (raw || "").toUpperCase();
    if (level === "ERROR") return "high";
    if (level === "WARNING") return "medium";
    if (level === "INFO") return "low";
    return "medium";
  }
  normalizeTitle(title) {
    return title.replace(/function argument `[^`]+`/, 'function argument `<VAR>`');
  }
  mergeFindings(findings) {
    const map = new Map();
    for (const f of findings) {
      const normalizedTitle = this.normalizeTitle(f.title);
      const key = `${f.rule}|${normalizedTitle}|${f.severity}`;
      const codeSnippets = [f.codeSnippets].flat().filter(Boolean);
      const lineNumbers = Array(codeSnippets.length).fill(f.lineNumbers ?? "?");
      const codeFiles = Array(codeSnippets.length).fill(f.file ?? "?");
      if (!map.has(key)) {
        map.set(key, {
          ...f,
          title: normalizedTitle,
          lineNumbers,
          codeSnippets,
          codeFiles,
          originalCount: 1,
        });
      } else {
        const existing = map.get(key);
        existing.lineNumbers.push(...lineNumbers);
        existing.codeSnippets.push(...codeSnippets);
        existing.codeFiles.push(...codeFiles);
        existing.originalCount++;
      }
    }
    return Array.from(map.values());
  }
  async enrichFindings(findings) {
    for (const finding of findings) {
      if (finding.severity === "high" || finding.severity === "medium") {
        try {
          finding.recommendation = await getAIRecommendation(finding);
        } catch (err) {
          finding.recommendation = "No recommendation available.";
        }
      } else {
        finding.recommendation = "No recommendation available.";
      }
    }
    return findings;
  }
  generateSummary(findings, originalFindings) {
    const originalSeverityCounts = {
      high: originalFindings.filter(f => f.severity === "high").length,
      medium: originalFindings.filter(f => f.severity === "medium").length,
      low: originalFindings.filter(f => f.severity === "low").length,
    };
    return {
      total: findings.length,
      high: originalSeverityCounts.high,
      medium: originalSeverityCounts.medium,
      low: originalSeverityCounts.low,
      files: new Set(findings.map(f => f.file)),
    };
  }
  displayFindingsMarkdown(findings, summary, rawTotal) {
    let report = `# Security Scan Report\n\n`;
    report += `## Summary\n`;
    report += `- Total Raw Findings: ${rawTotal}\n`;
    report += `- Unique Issues: ${summary.total}\n`;
    report += `- High: ${summary.high}\n`;
    report += `- Medium: ${summary.medium}\n`;
    report += `- Low: ${summary.low}\n`;
    report += `- Files Affected: ${summary.files.size}\n\n`;
    report += `---\n\n## Findings\n\n`;
    const sortedFindings = findings.sort((a, b) => {
      const order = { high: 3, medium: 2, low: 1 };
      return order[b.severity] - order[a.severity];
    });
    sortedFindings.forEach((finding, index) => {
      report += `### ${index + 1}. ${finding.title}\n`;
      report += `- **Severity:** ${finding.severity.toUpperCase()}\n`;
      report += `- **Rule:** ${finding.rule}\n`;
      if (finding.originalCount > 1) report += `- **Occurrences:** ${finding.originalCount}\n`;
      report += `- **Line(s):** ${[...new Set(finding.codeFiles.map((f, i) => `${f}:${finding.lineNumbers[i] ?? "?"}`))].join(", ")}\n`;
      if (finding.codeSnippets?.length > 0) {
        report += `- **Code:**\n\n`;
        report += "```js\n";
        for (let i = 0; i < finding.codeSnippets.length; i++) {
          const file = finding.codeFiles[i] || finding.file || "?";
          const line = finding.lineNumbers[i] ?? "?";
          const lineLabel = `${file}:${line}`.padEnd(25);
          report += `${lineLabel} | ${finding.codeSnippets[i].trim()}\n`;
        }
        report += "```\n";
      }
      if (finding.recommendation) report += `- **Recommendation:** ${finding.recommendation}\n`;
      report += `\n---\n\n`;
    });
    return report;
  }
  async processReport(reportFilePath, outputFilePath = null) {
    const raw = fs.readFileSync(reportFilePath, "utf8");
    const data = JSON.parse(raw);
    const findings = data.results.map(res => ({
      severity: this.normalizeSeverity(res.extra.severity),
      rule: res.check_id,
      title: res.extra.message || res.check_id,
      file: res.path,
      lineNumbers: res.start?.line ?? "?",
      codeSnippets: res.extra?.lines || "",
      description: res.extra.metadata?.short_description || "",
      cwe: Array.isArray(res.extra.metadata?.cwe)
        ? res.extra.metadata.cwe[0]
        : res.extra.metadata?.cwe || "",
    }));
    const mergedFindings = this.mergeFindings(findings);
    const enrichedFindings = await this.enrichFindings(mergedFindings);
    const summary = this.generateSummary(enrichedFindings, findings);
    const markdownReport = this.displayFindingsMarkdown(enrichedFindings, summary, findings.length);
    if (outputFilePath) fs.writeFileSync(outputFilePath, markdownReport, "utf8");
    else console.log(markdownReport);
    return { findings: enrichedFindings, summary };
  }
}

module.exports = SecurityReportParser;
```

---

### GitHub Action: Tying It All Together

Now, whenever a PR or scheduled workflow runs, we automatically generate a security report fast and with zero redundant LLM calls.

```yaml
- name: Generate SAST Report
  uses: saintmalik/opengrep-ai-report@v1.0
  with:
    scan-json-path: 'opengrep-report.json'
    output-path: 'sast-report.md'
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    d1-database-id: ${{ secrets.D1_DATABASE_ID }}
    d1-api-key: ${{ secrets.D1_API_KEY }}
    deepseek-api-key: ${{ secrets.DEEPSEEK_API_KEY }}
```

Till next time, Peace be on you 🤞🏽


#### References
- [DeepSeek](https://deepseek.com/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)

<br/>
<h2>Comments</h2>
<Giscus
id="comments"
repo="saintmalik/blog.saintmalik.me"
repoId="MDEwOlJlcG9zaXRvcnkzOTE0MzQyOTI="
category="General"
categoryId="DIC_kwDOF1TQNM4CQ8lN"
mapping="title"
term="Comments"
reactionsEnabled="1"
emitMetadata="0"
inputPosition="top"
theme="preferred_color_scheme"
lang="en"
loading="lazy"
crossorigin="anonymous"
    />