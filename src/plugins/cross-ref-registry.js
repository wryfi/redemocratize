/**
 * Cross-Reference Registry
 *
 * Stores and manages cross-reference targets (headings, anchors)
 * across all documents. Generalized for multiple content collections.
 */

// Global registry instance
let registry = new Map();

// Document metadata cache
let documentMeta = new Map();

/**
 * Target types that can be referenced
 */
export const TargetType = {
  HEADING: 'heading',
  ANCHOR: 'anchor',
  DOCUMENT: 'document'
};

/**
 * Clear the registry (useful for rebuilds)
 */
export function clearRegistry() {
  registry.clear();
  documentMeta.clear();
}

/**
 * Register a document's metadata
 * @param {string} collection - Collection name (e.g., 'principles', 'topics')
 * @param {string} slug - Document slug within the collection
 * @param {object} meta - Document metadata (title, etc.)
 */
export function registerDocument(collection, slug, meta) {
  const key = normalizeKey(`${collection}/${slug}`);
  documentMeta.set(key, { collection, slug, ...meta });

  registry.set(key, {
    type: TargetType.DOCUMENT,
    collection,
    slug,
    id: null,
    title: meta.title,
    fullPath: `/${collection}/${slug}`
  });
}

/**
 * Register a reference target
 * @param {string} collection - Collection name
 * @param {string} slug - Document slug
 * @param {string} id - Element ID (e.g., 'section-1', 'my-anchor')
 * @param {object} options - Target options
 */
export function registerTarget(collection, slug, id, options = {}) {
  const { type = TargetType.HEADING, title = id } = options;
  const docKey = `${collection}/${slug}`;
  const key = id ? normalizeKey(`${docKey}#${id}`) : normalizeKey(docKey);

  registry.set(key, {
    type,
    collection,
    slug,
    id,
    title,
    fullPath: id ? `/${collection}/${slug}#${id}` : `/${collection}/${slug}`
  });
}

/**
 * Look up a reference target
 * @param {string} ref - Reference string (e.g., 'principles/adaptive-capacity#section')
 * @param {string} currentDocKey - Current document key (collection/slug) for resolving local refs
 * @returns {object|null} Target info or null if not found
 */
export function resolveRef(ref, currentDocKey = null) {
  // Handle local references (start with #)
  if (ref.startsWith('#')) {
    if (!currentDocKey) return null;
    const id = ref.slice(1);
    const key = normalizeKey(`${currentDocKey}#${id}`);
    return registry.get(key) || null;
  }

  // Handle full references
  const key = normalizeKey(ref);
  return registry.get(key) || null;
}

/**
 * Get document metadata
 */
export function getDocumentMeta(collection, slug) {
  const key = normalizeKey(`${collection}/${slug}`);
  return documentMeta.get(key) || null;
}

/**
 * Get all registered documents
 */
export function getAllDocuments() {
  return Array.from(documentMeta.entries());
}

// --- Internal helpers ---

function normalizeKey(key) {
  return key.toLowerCase().replace(/^\/+/, '');
}
