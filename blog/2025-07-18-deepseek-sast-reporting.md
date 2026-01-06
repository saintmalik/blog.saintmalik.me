---
slug: sast-recommendations-with-llm
title: Optimizing Semantic Remediation, Using LLMs and Deterministic Caching to Scale SAST Analysis
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

<picture>
  <source type="image/jpeg" srcset={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/ai-reports.png`} alt="DeepSeek + DevSecOps Scaling Secure Code Recommendations from SAST Scans"/>
  <img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/ai-reports.png`} alt="DeepSeek + DevSecOps Scaling Secure Code Recommendations from SAST Scans"/>
</picture>

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
const OpenAI = require("openai");

let openai = null;

function getOpenAIClient() {
  if (!openai) {
    const MODEL_PROVIDER = (process.env.MODEL_PROVIDER || "openai").toLowerCase();

    if (MODEL_PROVIDER === "deepseek") {
      const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
      if (!DEEPSEEK_API_KEY) {
        throw new Error("DEEPSEEK_API_KEY environment variable is missing or empty");
      }
      openai = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: DEEPSEEK_API_KEY,
      });
      openai._modelName = "deepseek-chat";
    } else if (MODEL_PROVIDER === "openai") {
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY environment variable is missing or empty");
      }
      openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
      });
      openai._modelName = "gpt-4.1"
    } else {
      throw new Error("Unsupported MODEL_PROVIDER. Use 'deepseek' or 'openai'.");
    }
  }
  return openai;
}

function getD1Endpoint() {
  const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const D1_DATABASE_ID = process.env.D1_DATABASE_ID;

  if (!CLOUDFLARE_ACCOUNT_ID || !D1_DATABASE_ID) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID or D1_DATABASE_ID environment variables are missing");
  }

  return `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
}

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
  const D1_API_KEY = process.env.D1_API_KEY;
  if (!D1_API_KEY) {
    throw new Error("D1_API_KEY environment variable is missing or empty");
  }

  const D1_ENDPOINT = getD1Endpoint();

  const res = await fetch(D1_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${D1_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`D1 error: ${data.errors?.[0]?.message || res.statusText}`);
  }

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

  const ruleDisplay = `${finding.rule}`;
  const titlePreview = finding.title?.substring(0, 60) + (finding.title?.length > 60 ? "..." : "");

  console.log(`\nProcessing: ${ruleDisplay}`);
  console.log(`Title: ${titlePreview}`);
  console.log(`Cache: ${cacheKey.substring(0, 8)}...`);

  const rows = await d1Query(
    `SELECT recommendation FROM recommendations WHERE cache_key = ? LIMIT 1`,
    [cacheKey]
  );

  if (rows.length > 0 && rows[0].recommendation) {
    console.log(`Cache HIT - Using stored recommendation`);
    return rows[0].recommendation;
  }

  console.log(`API HIT - Generating new recommendation`);

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
      const openaiClient = getOpenAIClient();
      const modelName = openaiClient._modelName;

      const response = await openaiClient.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature,
      });

      recommendation = response.choices[0].message.content.trim();

      await d1Query(
        `INSERT INTO recommendations (cache_key, recommendation) VALUES (?, ?) ON CONFLICT(cache_key) DO NOTHING`,
        [cacheKey, recommendation]
      );

      console.log(`Stored in cache successfully`);
      return recommendation;
    } catch (err) {
      lastError = err;
      console.log(`API attempt ${attempt + 1} failed: ${err.message}`);

      if (err.status === 429) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.log(`   ⏳ Retrying in ${Math.floor(delay)}ms...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        break;
      }
    }
  }

  console.log(`Failed to get recommendation after ${maxRetries} attempts`);
  throw lastError;
}

module.exports = { getAIRecommendation };
```

---

### reports.js (Findings Processing & Report Generation)

This script deduplicates findings, enriches them with recommendations, and outputs a summary markdown.

```js name=reports.js
const fs = require("fs");
const path = require("path");
const { getAIRecommendation } = require("./llmhelper");

class SecurityReportParser {
  constructor() {}

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
        });
      } else {
        const existing = map.get(key);
        existing.lineNumbers.push(...lineNumbers);
        existing.codeSnippets.push(...codeSnippets);
        existing.codeFiles.push(...codeFiles);
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
          console.warn(`Failed to fetch AI recommendation: ${err.message}`);
          finding.recommendation = "No recommendation available.";
        }
      } else {
        finding.recommendation = "No recommendation available.";
      }
    }
    return findings;
  }

  generateSummary(findings) {
    return {
      total: findings.length,
      high: findings.filter(f => f.severity === "high").length,
      medium: findings.filter(f => f.severity === "medium").length,
      low: findings.filter(f => f.severity === "low").length,
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

      if (finding.recommendation) {
        let rec = finding.recommendation.trim();
        rec = rec.replace(/^\*{2}recommendation:\*{2}\s*/i, "");

        report += `- **Recommendation:** ${rec}\n`;
      }

      report += `\n---\n\n`;
    });

    return report;
  }

  async processReport(reportFilePath, outputFilePath = null) {
    try {
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

      const summary = this.generateSummary(enrichedFindings);
      const markdownReport = this.displayFindingsMarkdown(enrichedFindings, summary, findings.length);

      if (outputFilePath) {
        fs.writeFileSync(outputFilePath, markdownReport, "utf8");
        console.log(`Report written to ${outputFilePath}`);
      } else {
        console.log(markdownReport);
      }

      return { findings: enrichedFindings, summary };
    } catch (error) {
      console.error("Error processing report:", error.message);
      throw error;
    }
  }
}

module.exports = SecurityReportParser;
```

---

### GitHub Action: Tying It All Together

Now, whenever a PR or scheduled workflow runs, we automatically generate a security report fast and with zero redundant LLM calls.

```yaml
- name: Generate AI Security Report (OpenAI, default)
  uses: saintmalik/opengrep-ai-report@v1.0
  with:
    scan-json-path: 'opengrep-reports.json'
    output-path: 'security-report.md'
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    d1-database-id: ${{ secrets.D1_DATABASE_ID }}
    d1-api-key: ${{ secrets.D1_API_KEY }}
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    model-provider: 'deepseek' # Uses deepseek-chat
    # model-provider: 'openai' # OpenAI (gpt-4.2) is default
```

---

## Which Model is Used?

- **OpenAI (default):** Uses `gpt-4.2` if no `model-provider` is set.
- **DeepSeek:** Uses `deepseek-chat` if you set `model-provider: 'deepseek'` and provide the API key.

#### References
- [DeepSeek](https://deepseek.com/)
- [OpenAI](https://openai.com/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)

Till next time, Peace be on you 🤞🏽

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