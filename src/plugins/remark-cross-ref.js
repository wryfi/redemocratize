/**
 * Remark Cross-Reference Plugin
 *
 * Provides cross-referencing between documents using directive syntax:
 *   :ref[link text]{to="target"}  - Reference with custom text
 *   :ref{to="target"}             - Reference with auto-generated text
 *   :anchor{#id}                  - Define a manual anchor point
 *
 * Target formats:
 *   - "principles/adaptive-capacity"         - Reference to a document
 *   - "principles/adaptive-capacity#section" - Reference to a heading/anchor
 *   - "#section"                             - Reference to heading/anchor in current document
 */

import { visit } from 'unist-util-visit';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import {
  clearRegistry,
  registerDocument,
  registerTarget,
  resolveRef,
  TargetType
} from './cross-ref-registry.js';

let registryInitialized = false;
let registryInitializing = null;

// Content collections to scan
const COLLECTIONS = ['principles', 'topics', 'proposals', 'models', 'diagnosis'];

/**
 * Recursively find all .mdx/.md files in a directory
 */
async function findContentFiles(dir, files = []) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await findContentFiles(fullPath, files);
      } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist yet, that's fine
  }
  return files;
}

/**
 * Extract heading IDs from markdown content
 */
function extractHeadings(content) {
  const headings = [];
  const headingRegex = /^(#{1,6})\s+(.+?)(?:\s+\{#([^}]+)\})?\s*$/gm;

  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const [, hashes, text, explicitId] = match;
    const id = explicitId || text.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    headings.push({ level: hashes.length, text: text.trim(), id });
  }

  return headings;
}

/**
 * Extract anchor directives from content
 */
function extractAnchors(content) {
  const anchors = [];
  const anchorRegex = /:anchor\{#([^}]+)\}/g;

  let match;
  while ((match = anchorRegex.exec(content)) !== null) {
    anchors.push({ id: match[1] });
  }

  return anchors;
}

/**
 * Initialize the registry by scanning all content collections
 */
async function initializeRegistry() {
  if (registryInitializing) return registryInitializing;
  if (registryInitialized) return;

  registryInitializing = (async () => {
    clearRegistry();

    for (const collection of COLLECTIONS) {
      const contentDir = join(process.cwd(), 'src/content', collection);

      const files = await findContentFiles(contentDir);

      for (const filePath of files) {
        try {
          const content = await readFile(filePath, 'utf-8');
          const { data: frontmatter, content: mainContent } = matter(content);

          const relativePath = relative(contentDir, filePath);
          const fileSlug = relativePath
            .replace(/\\/g, '/')
            .replace(/\.mdx?$/, '');

          const slug = frontmatter.slug || fileSlug;

          registerDocument(collection, slug, {
            title: frontmatter.title || slug,
          });

          // Register headings
          const headings = extractHeadings(mainContent);
          for (const heading of headings) {
            registerTarget(collection, slug, heading.id, {
              type: TargetType.HEADING,
              title: heading.text,
            });
          }

          // Register anchors
          const anchors = extractAnchors(mainContent);
          for (const anchor of anchors) {
            registerTarget(collection, slug, anchor.id, {
              type: TargetType.ANCHOR,
              title: anchor.id,
            });
          }
        } catch (err) {
          console.warn(`[remark-cross-ref] Error processing ${filePath}:`, err.message);
        }
      }
    }

    registryInitialized = true;
  })();

  return registryInitializing;
}

/**
 * Get the current document key (collection/slug) from the file being processed
 */
function getDocKeyFromFile(file) {
  if (!file?.history?.[0]) return null;
  const filePath = file.history[0];

  for (const collection of COLLECTIONS) {
    const match = filePath.match(new RegExp(`src/content/${collection}/(.+?)\\.mdx?$`));
    if (match) {
      return `${collection}/${match[1]}`;
    }
  }

  return null;
}

/**
 * Parse the 'to' attribute from directive attributes
 */
function parseToAttribute(attributes) {
  if (!attributes) return null;

  if (typeof attributes.to === 'string') return attributes.to;

  if (typeof attributes === 'object') {
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'to' || key.toLowerCase() === 'to') return value;
    }
  }

  return null;
}

/**
 * Main remark plugin
 */
export function remarkCrossRef() {
  return async (tree, file) => {
    await initializeRegistry();

    const currentDocKey = getDocKeyFromFile(file);
    const warnings = [];

    // Process :anchor directives
    visit(tree, 'textDirective', (node, index, parent) => {
      if (node.name !== 'anchor') return;

      const id = node.attributes?.id ||
        (node.attributes && Object.keys(node.attributes).find(k => k.startsWith('#'))?.slice(1));

      if (!id) {
        warnings.push(`[remark-cross-ref] :anchor directive missing id at ${file?.path || 'unknown'}`);
        return;
      }

      parent.children.splice(index, 1, {
        type: 'html',
        value: `<span id="${id}" class="cross-ref-anchor"></span>`
      });
    });

    // Process :ref directives
    visit(tree, 'textDirective', (node, index, parent) => {
      if (node.name !== 'ref') return;

      const to = parseToAttribute(node.attributes);

      if (!to) {
        warnings.push(`[remark-cross-ref] :ref directive missing 'to' attribute at ${file?.path || 'unknown'}`);
        return;
      }

      const target = resolveRef(to, currentDocKey);

      // Get link text
      let linkText;
      if (node.children && node.children.length > 0) {
        linkText = node.children.map(child =>
          child.type === 'text' ? child.value : ''
        ).join('');
      } else if (target) {
        linkText = target.title;
      } else {
        linkText = to;
      }

      // Generate href
      let href;
      if (to.startsWith('#')) {
        href = to;
      } else if (target) {
        href = target.fullPath;
      } else {
        href = `/${to.replace(/#/g, '#')}`;
        if (!to.startsWith('/')) href = '/' + href;
        warnings.push(`[remark-cross-ref] Broken reference: "${to}" in ${file?.path || 'unknown'}`);
      }

      parent.children.splice(index, 1, {
        type: 'link',
        url: href,
        children: [{ type: 'text', value: linkText }],
        data: {
          hProperties: {
            className: ['cross-ref-link'],
            'data-ref-target': to
          }
        }
      });
    });

    for (const warning of warnings) {
      console.warn(warning);
    }
  };
}

export { initializeRegistry, clearRegistry };
