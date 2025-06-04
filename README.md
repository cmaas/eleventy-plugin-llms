# Eleventy Plugin: Generator for `llms.txt` and `llms-full.txt`

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

A plugin for 11ty to automatically generate `llms.txt` and `llms-full.txt` files specifically formatted for Large Language Models (LLMs):

1.  `llms.txt`: A master index of your site's content with titles and absolute URLs, perfect for providing LLMs with a sitemap.
2.  `llms-full.txt`: A concatenated corpus of all your eligible Markdown content (frontmatter stripped), ideal for fine-tuning, retrieval-augmented generation (RAG), or creating a knowledge base.

More info at [llmstxt.org](https://llmstxt.org/).

## Features

*   **Automatic `llms.txt` Generation**: Creates a Markdown-formatted list of all your live documents with links (like a Sitemap).
*   **Automatic `llms-full.txt` Generation**: Concatenates the content of all eligible Markdown files into a single text file.
*   **Configurable Header**: Add a custom header to both generated files.
*   **Draft Exclusion**: Automatically excludes draft posts (or those with `eleventyExcludeFromCollections: true`).
*   **Content Exclusion**: Fine-grained control to exclude specific pages using frontmatter (`robots: noindex` or `excludeFromLlms: true`).
*   **Absolute URLs**: Generates full, absolute URLs for `llms.txt` using your site's base URL.
*   **Source Comments (Optional)**: Include comments in `llms-full.txt` indicating the source file for each content block.

## Installation

```bash
npm install eleventy-plugin-llms --save-dev
```

## 🛠️ Usage

Open your Eleventy config file (usually `.eleventy.js`) and add the plugin:

```javascript
const eleventyPluginLlms = require('eleventy-plugin-llms');

module.exports = (eleventyConfig) => {
	eleventyConfig.addPlugin(eleventyPluginLlms, {
    	siteUrl: "https://www.example.com", // REQUIRED for absolute URLs
    	headerText: `# My Static Site - LLM Corpus

This document contains content from My Static Site, prepared for LLM consumption.

## Documents Index`,
    // See more options below!
	});

  	// Your other Eleventy configurations...
};
```

The plugin will then generate `llms.txt` and `llms-full.txt` in your output directory (e.g., `_site/`) after each Eleventy build.

## ⚙️ Configuration Options

You can pass an options object as the second argument to `addPlugin`. Here are the available options:

| Option                  | Type       | Description                                                                                                                               |
| :---------------------- | :--------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `siteUrl`               | `String`   | **Default:** `""` <br/> **REQUIRED for absolute URLs.** Your site's full base URL (e.g., "https://www.example.com"). A warning is issued if not set, and links in `llms.txt` will be relative. |
| `headerText`            | `String`   | **Default:** `"# My Site LLM Data\n\nThis file contains information about the site's content, formatted for Large Language Models.\n\n## Documents"` <br/> The header content prepended to both generated files. Supports Markdown. |
| `llmsFilename`          | `String`   | **Default:** `"llms.txt"` <br/> The filename for the document index file.                                                                   |
| `llmsFullFilename`      | `String`   | **Default:** `"llms-full.txt"` <br/> The filename for the concatenated full content file.                                                      |
| `includeDrafts`         | `Boolean`  | **Default:** `false` <br/> Set to `true` to include documents marked as drafts (e.g., `draft: true` or `eleventyExcludeFromCollections: true` in frontmatter). |
| `markdownOnly`          | `Boolean`  | **Default:** `true` <br/> If `true`, only processes files with a `.md` extension.                                                          |
| `includeSourceComment`  | `Boolean`  | **Default:** `true` <br/> If `true`, adds an HTML comment `<!-- Source: path/to/file.md -->` before each document's content in `llms-full.txt`. |
| `defaultTitleFormatter` | `Function` | **Default:** A function that takes `inputPath`, extracts the filename, replaces hyphens/underscores with spaces, and title-cases it. <br/> A function `(inputPath) => string` to generate a title if one isn't found in the document's frontmatter. |

## Excluding Content from LLM Files

Drafts are automatically excluded unless you set `includeDrafts` to true. Furthermore, you can specify in the front matter of every Markdown file whether to exclude it.

A document will be **excluded** if its frontmatter contains `robots: noindex` or `excludeFromLlms: true`

This allows you to easily omit pages like 404 error pages, private drafts, or any other content you don't want to feed to LLMs.

**Example: Excluding a 404 Page**

Let's say you have a `404.md` page:

```markdown
---
title: Page Not Found
permalink: /404.html
layout: layouts/base.njk
eleventyExcludeFromCollections: true # Already excluded from sitemaps, etc.
robots: noindex # Add this to exclude from LLM files
excludeFromLlms: true # This would also work
---
# 404 Page Not Found

The page you were looking for doesn't exist.
You might have mistyped the address, or the page may have moved.
```

By adding `robots: noindex` (or `excludeFromLlms: true`), this 404 page will not appear in `llms.txt` or have its content included in `llms-full.txt`.

Enjoy!