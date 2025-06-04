const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url'); // For constructing absolute URLs

module.exports = (eleventyConfig, options = {}) => {
	try {
		eleventyConfig.versionCheck('>=3.0');
	} catch (e) {
		console.log(`[eleventy-plugin-llms] WARN Eleventy plugin compatibility: ${e.message}`);
	}
	const defaults = {
		headerText: "# My Site LLM Data\n\nThis file contains information about the site's content, formatted for Large Language Models.\n\n## Documents",
		siteUrl: '', // Important: Set this to your site's full base URL (e.g., "https://www.example.com")
		llmsFilename: 'llms.txt',
		llmsFullFilename: 'llms-full.txt',
		includeDrafts: false, // Set to true to include drafts
		markdownOnly: true, // Only process .md files
		includeSourceComment: true, // Add <!-- Source: [Title](https://www.example.com/url) --> in llms-full.txt
		// Function to generate a title if not found in front matter
		defaultTitleFormatter: (inputPath) => {
			return path
				.basename(inputPath, path.extname(inputPath))
				.replace(/[_-]/g, ' ')
				.replace(/\b\w/g, (char) => char.toUpperCase());
		},
	};

	const pluginOptions = { ...defaults, ...options };

	if (!pluginOptions.siteUrl) {
		console.warn('[eleventy-plugin-llms] Warning: `siteUrl` option is not set. URLs in llms.txt will be relative. For absolute URLs, please provide the `siteUrl` in plugin options.');
	}

	let allCollectionItems = [];

	eleventyConfig.addCollection('llmsPluginCollector', (collectionApi) => {
		allCollectionItems = collectionApi.getAll();
		return [];
	});

	eleventyConfig.on('eleventy.after', async ({ dir, results, runMode, outputMode }) => {
		// Made this async
		if (!allCollectionItems || allCollectionItems.length === 0) {
			console.warn('[eleventy-plugin-llms] No collection items found. Ensure content exists and is processed by Eleventy.');
			return;
		}

		// Stage 1: Synchronous pre-filtering
		const preFilteredItems = allCollectionItems.filter((item) => {
			// Filter 1: Must have an output URL
			if (!item.url) {
				return false;
			}
			// Filter 2: Markdown only (if option is set)
			if (pluginOptions.markdownOnly && (!item.inputPath || !item.inputPath.endsWith('.md'))) {
				return false;
			}
			// Filter 3: Drafts
			if (!pluginOptions.includeDrafts && (item.data.draft || item.data.eleventyExcludeFromCollections)) {
				return false;
			}
			// Filter 4: Robots and LLM-specific exclusion in front matter
			if (item.data.robots === 'noindex' || item.data.excludeFromLlms) {
				return false;
			}
			// Filter 5: Ensure template and inputContent property exist (even if it's a Promise)
			if (!item.template || typeof item.template.inputContent === 'undefined') {
				return false;
			}
			return true;
		});

		if (preFilteredItems.length === 0) {
			console.log('[eleventy-plugin-llms] No items found after initial synchronous filtering.');
			return;
		}

		// Stage 2: Asynchronously resolve content and build the final list
		const eligibleItemsWithContent = [];
		for (const item of preFilteredItems) {
			try {
				const content = (await item.template.readingPromise).content; // AWAIT here
				if (typeof content === 'string') {
					eligibleItemsWithContent.push({
						item: item, // Keep the original item for its metadata
						content: content, // Store the resolved content
					});
				} else {
					// Optional: Log if content, after awaiting, is still not a string or is empty
					if (typeof content !== 'undefined' && content !== null && content.toString().trim() === '') {
						// console.log(`[eleventy-plugin-llms] Content for ${item.inputPath} resolved to an empty string. Skipping.`);
					} else {
						console.warn(`[eleventy-plugin-llms] Content for ${item.inputPath} did not resolve to a string (type: ${typeof content}). Skipping.`);
					}
				}
			} catch (error) {
				console.warn(`[eleventy-plugin-llms] Error resolving inputContent for ${item.inputPath}. Skipping. Error:`, error.message);
			}
		}

		if (eligibleItemsWithContent.length === 0) {
			console.log('[eleventy-plugin-llms] No eligible items with valid content found to generate LLM files.');
			return;
		}

		const outputBaseDir = dir.output;

		// --- Generate llms.txt ---
		let llmsTxtContent = pluginOptions.headerText;
		if (eligibleItemsWithContent.length > 0) {
			llmsTxtContent += '\n';
		}

		for (const { item } of eligibleItemsWithContent.reverse()) {
			const title = item.data.title || pluginOptions.defaultTitleFormatter(item.inputPath);
			const itemUrl = item.url.replace('.html', '');
			const fullUrl = pluginOptions.siteUrl ? new URL(itemUrl, pluginOptions.siteUrl).href : itemUrl;
			llmsTxtContent += `- [${title}](${fullUrl})\n`;
		}

		const llmsTxtPath = path.join(outputBaseDir, pluginOptions.llmsFilename);
		try {
			fs.mkdirSync(path.dirname(llmsTxtPath), { recursive: true });
			fs.writeFileSync(llmsTxtPath, '\uFEFF' + llmsTxtContent, 'utf8');
			console.log(`[eleventy-plugin-llms] Generated ${pluginOptions.llmsFilename} at ${llmsTxtPath} with ${eligibleItemsWithContent.length} items.`);
		} catch (err) {
			console.error(`[eleventy-plugin-llms] Error writing ${pluginOptions.llmsFilename}:`, err);
		}

		// --- Generate llms-full.txt ---
		let llmsFullTxtContent = pluginOptions.headerText + '\n\n';

		for (const { item, content } of eligibleItemsWithContent) {
			// Destructure item and its resolved content
			const rawMarkdownContent = content; // Use the already resolved content
			const itemUrl = item.url.replace('.html', '');
			const fullUrl = pluginOptions.siteUrl ? new URL(itemUrl, pluginOptions.siteUrl).href : itemUrl;
			if (rawMarkdownContent && rawMarkdownContent.trim()) {
				if (pluginOptions.includeSourceComment) {
					llmsFullTxtContent += `<!-- Source: [${item.data.title}](${fullUrl}) -->\n`;
				}
				llmsFullTxtContent += rawMarkdownContent.trim() + '\n\n\n';
			}
		}

		const llmsFullTxtPath = path.join(outputBaseDir, pluginOptions.llmsFullFilename);
		try {
			fs.mkdirSync(path.dirname(llmsFullTxtPath), { recursive: true });
			fs.writeFileSync(llmsFullTxtPath, '\uFEFF' + llmsFullTxtContent.trimEnd(), 'utf8');
			console.log(`[eleventy-plugin-llms] Generated ${pluginOptions.llmsFullFilename} at ${llmsFullTxtPath}.`);
		} catch (err) {
			console.error(`[eleventy-plugin-llms] Error writing ${pluginOptions.llmsFullFilename}:`, err);
		}
	});
};
