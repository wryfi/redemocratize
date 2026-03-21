import { visit } from 'unist-util-visit';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import citeprocModule from 'citeproc';
const { Engine } = citeprocModule;

let cachedResources = null;

/**
 * Load bibliography and CSL engine with citeproc
 */
async function loadResources() {
  if (!cachedResources) {
    // Load bibliography file (CSL JSON format)
    const bibPath = join(process.cwd(), 'references', 'aspiration_agenda.json');
    const bibData = await readFile(bibPath, 'utf-8');
    const bibJson = JSON.parse(bibData);

    // Load CSL file
    const cslPath = join(process.cwd(), 'references', 'bluebook-law-review.csl');
    const cslData = await readFile(cslPath, 'utf-8');

    // Create a citation items retrieval function for citeproc
    const citationItems = {};
    bibJson.forEach(item => {
      citationItems[item.id] = item;
    });

    // Locale retrieval function (citeproc needs this)
    const localeData = await readFile(
      join(process.cwd(), 'references', 'locales', 'locales-en-US.xml'),
      'utf-8'
    );

    // System object for citeproc
    const sys = {
      retrieveLocale: () => localeData,
      retrieveItem: (id) => citationItems[id]
    };

    // Initialize citeproc engine
    const engine = new Engine(sys, cslData);

    cachedResources = {
      engine,
      citationItems
    };
  }

  return cachedResources;
}

/**
 * Parse a citation string like "see also @cite_key at 955" or "@cite_key p. 42"
 * Returns { prefix, citeKey, locator, suffix }
 */
function parseCitation(citationString) {
  // Match patterns like:
  // @cite_key
  // see @cite_key
  // @cite_key at 955
  // see also @cite_key at 955
  // @cite_key, pp. 33-35

  const match = citationString.match(/^(.*?)@([\w_-]+)\s*(.*)$/);

  if (!match) {
    return null;
  }

  const [, prefixPart, citeKey, suffixPart] = match;

  // Parse the suffix for locators (at, p., pp., etc.)
  let locator = null;
  let suffix = suffixPart.trim();

  // Match common locator patterns
  const locatorMatch = suffixPart.match(/^(?:at|p\.|pp\.|para\.|¶)\s*(.+?)(?:\s+and\s+(.*))?$/);
  if (locatorMatch) {
    locator = locatorMatch[1].trim();
    suffix = locatorMatch[2] ? locatorMatch[2].trim() : '';
  } else if (suffixPart.match(/^\d/)) {
    // Just a number, treat as page locator
    const numMatch = suffixPart.match(/^([\d\-,\s]+)(.*)$/);
    if (numMatch) {
      locator = numMatch[1].trim();
      suffix = numMatch[2].trim();
    }
  }

  return {
    prefix: prefixPart.trim(),
    citeKey: citeKey.trim(),
    locator: locator,
    suffix: suffix
  };
}

/**
 * Wrap text in a link if URL is available
 */
function wrapInLink(text, url) {
  if (url) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  }
  return text;
}

/**
 * Format a citation with italics and links
 * Citeproc handles prefix, suffix, and locator, so we only add italics/links here
 */
function formatCitationWithExtras(formattedCitation, parsed, entry) {
  let processedCitation = formattedCitation;

  // Determine what to italicize and link based on citation type
  const url = entry?.URL;

  // Types that should have italicized titles (cases, articles, books)
  const italicizeTypes = [
    'legal_case',
    'article-journal',
    'article-magazine',
    'article-newspaper',
    'book',
    'chapter'
  ];

  if (entry && italicizeTypes.includes(entry.type)) {
    // For most citations, title/name comes before first comma
    processedCitation = formattedCitation.replace(/^([^,]+)(,\s*.*)$/, (match, title, rest) => {
      const linked = wrapInLink(title, url);
      return `<em>${linked}</em>${rest}`;
    });
  } else if (entry && entry.type === 'legislation') {
    // For legislation/statutes, handle two cases:
    // 1. Named statutes: "Voting Rights Act, 52 U.S.C. § 10301" - italicize name, link whole thing
    // 2. Code citations: "52 U.S.C. § 10301" - no italics, just link the code reference

    processedCitation = formattedCitation.replace(/^([^,§]+)(.*)$/, (match, firstPart, rest) => {
      const trimmedFirst = firstPart.trim();

      // Check if it's a named statute (doesn't start with a digit)
      if (trimmedFirst && !trimmedFirst.match(/^\d/)) {
        // Named statute like "Voting Rights Act"
        const linked = wrapInLink(trimmedFirst, url);
        return `<em>${linked}</em>${rest}`;
      } else if (trimmedFirst && trimmedFirst.match(/^\d/)) {
        // Pure code citation like "52 U.S.C. § 10303"
        // Match the code reference including U.S.C. and section
        // Pattern: digits, then U.S.C. (or similar), then § and section number
        const codeMatch = match.match(/^([\d\s]+(?:U\.S\.C\.|USC|U\.S\. Code)(?:\s*§\s*[\d\w-]+)?)(.*?)(\.\s*)?$/i);
        if (codeMatch && url) {
          const codeRef = codeMatch[1].trim(); // e.g., "52 U.S.C. § 10303"
          const remainder = codeMatch[2]; // e.g., " (2006)"
          const period = codeMatch[3] || '';
          return wrapInLink(codeRef, url) + remainder + period;
        }
        // Fallback: link everything up to trailing period/parentheses
        const fallbackMatch = match.match(/^(.+?)(\s*\([^)]+\))?(\.\s*)?$/);
        if (fallbackMatch && url) {
          return wrapInLink(fallbackMatch[1].trim(), url) + (fallbackMatch[2] || '') + (fallbackMatch[3] || '');
        }
        // Last resort: link the whole thing
        return wrapInLink(match, url);
      }
      return match;
    });
  } else if (entry && url) {
    // For other types with URLs, link the first meaningful part (before comma or end)
    processedCitation = formattedCitation.replace(/^([^,]+)(,?\s*.*)$/, (match, firstPart, rest) => {
      return wrapInLink(firstPart, url) + rest;
    });
  }

  // Citeproc already handles prefix, suffix, and locator, so just return the processed citation
  return processedCitation;
}

/**
 * Remark plugin to process citations with Bluebook style
 * Supports Pandoc-style citation syntax with prefixes, suffixes, and locators
 */
export function remarkCitations() {
  return async (tree, file) => {
    const { engine, citationItems } = await loadResources();

    // First pass: collect all citations in document order with their parsed data
    const citationsInOrder = [];

    visit(tree, 'text', (node) => {
      const citationRegex = /\[([^\]]+)\]/g;
      let match;
      while ((match = citationRegex.exec(node.value)) !== null) {
        const parsed = parseCitation(match[1]);
        if (parsed && parsed.citeKey) {
          citationsInOrder.push({
            fullMatch: match[0],
            parsed: parsed
          });
        }
      }
    });

    if (citationsInOrder.length === 0) {
      return; // No citations in this document
    }

    // Build citation clusters for citeproc
    // Each cluster is a group of citations that appear together
    const clusters = citationsInOrder.map((citation, index) => {
      const { parsed } = citation;
      const entry = citationItems[parsed.citeKey];

      if (!entry) {
        return null;
      }

      // Build the citation item object for citeproc
      const citationItem = {
        id: parsed.citeKey
      };

      // Add locator if present
      if (parsed.locator) {
        citationItem.locator = parsed.locator;
        // Determine label type (page, section, etc.)
        citationItem.label = 'page'; // default to page
      }

      // Add prefix/suffix
      if (parsed.prefix) {
        citationItem.prefix = parsed.prefix + ' ';
      }
      if (parsed.suffix) {
        citationItem.suffix = ' ' + parsed.suffix;
      }

      return {
        citationID: `cite-${index}`,
        citationItems: [citationItem],
        properties: {
          noteIndex: index + 1 // Position in document (1-indexed)
        }
      };
    });

    // Process all citations through citeproc to get context-aware formatting
    const formattedCitations = [];
    const preCitations = []; // Citations before current one

    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];

      if (!cluster) {
        formattedCitations.push({
          text: `[Citation not found: ${citationsInOrder[i].parsed.citeKey}]`,
          citeKey: citationsInOrder[i].parsed.citeKey
        });
        continue;
      }

      // Process this citation with context of all previous citations
      const result = engine.processCitationCluster(cluster, preCitations, []);

      // Extract the formatted text
      // result is [{ bibchange: bool, citation_errors: [], citationByIndex: [[index, text, id]] }]
      const formattedText = result[1].length > 0 ? result[1][0][1] : '';

      // Apply our custom formatting (italics and links)
      const entry = citationItems[citationsInOrder[i].parsed.citeKey];
      const processedText = formatCitationWithExtras(
        formattedText,
        citationsInOrder[i].parsed,
        entry
      );

      formattedCitations.push({
        text: processedText,
        citeKey: citationsInOrder[i].parsed.citeKey
      });

      // Add this citation to the list of preceding citations for the next iteration
      preCitations.push([cluster.citationID, cluster.properties.noteIndex]);
    }

    // Second pass: replace citation markers with formatted inline citations
    let citationIndex = 0;

    visit(tree, 'text', (node, index, parent) => {
      const citationRegex = /\[([^\]]+)\]/g;

      if (!citationRegex.test(node.value)) {
        return;
      }

      const newNodes = [];
      let lastIndex = 0;

      // Reset regex
      citationRegex.lastIndex = 0;

      let match;
      while ((match = citationRegex.exec(node.value)) !== null) {
        const parsed = parseCitation(match[1]);

        // Skip if not a citation
        if (!parsed || !parsed.citeKey) {
          continue;
        }

        const offset = match.index;

        // Add text before citation
        if (offset > lastIndex) {
          newNodes.push({
            type: 'text',
            value: node.value.slice(lastIndex, offset)
          });
        }

        // Get the formatted citation
        const formatted = formattedCitations[citationIndex];
        citationIndex++;

        // Add citation with a preceding space and wrap in cite element
        newNodes.push({
          type: 'html',
          value: ` <cite class="legal-citation" data-cite-key="${formatted.citeKey}">${formatted.text}</cite>`
        });

        lastIndex = offset + match[0].length;
      }

      // Add remaining text
      if (lastIndex < node.value.length) {
        newNodes.push({
          type: 'text',
          value: node.value.slice(lastIndex)
        });
      }

      // Replace the original node with new nodes
      parent.children.splice(index, 1, ...newNodes);
    });
  };
}