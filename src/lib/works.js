/**
 * Shared configuration and helpers for the Democracy Works section.
 *
 * The ledger treatment uses:
 *   - a single-letter "coin" glyph per collection (A / T / P / M / N)
 *   - the existing --color-badge-{collection} palette
 *   - a consistent role label ("Article", "Topic", ...)
 *   - a base path to each collection's index
 */

export const COLLECTIONS = ["articles", "topics", "proposals", "models", "news"]

export const COLLECTION_CONFIG = {
  articles: {
    label: "Articles",
    labelSingular: "Article",
    letter: "A",
    href: "/works/articles",
    bgVar: "var(--color-badge-article)",
    fgVar: "var(--color-badge-article-content)",
  },
  topics: {
    label: "Topics",
    labelSingular: "Topic",
    letter: "T",
    href: "/works/topics",
    bgVar: "var(--color-badge-topic)",
    fgVar: "var(--color-badge-topic-content)",
  },
  proposals: {
    label: "Proposals",
    labelSingular: "Proposal",
    letter: "P",
    href: "/works/proposals",
    bgVar: "var(--color-badge-proposal)",
    fgVar: "var(--color-badge-proposal-content)",
  },
  models: {
    label: "Models",
    labelSingular: "Model",
    letter: "M",
    href: "/works/models",
    bgVar: "var(--color-badge-model)",
    fgVar: "var(--color-badge-model-content)",
  },
  news: {
    label: "News",
    labelSingular: "News",
    letter: "N",
    href: "/works/news",
    bgVar: "var(--color-badge-news)",
    fgVar: "var(--color-badge-news-content)",
  },
}

/** Per-collection hero copy used on /works and /works/{collection}. */
export const HERO_COPY = {
  all: {
    eyebrow: "Democracy Works",
    title: "Where the principles meet the world.",
    lede: "Essays, topical analysis, institutional proposals, comparative models, and project news. The ongoing work of translating fifteen principles into democratic design.",
  },
  articles: {
    eyebrow: "Democracy Works / Articles",
    title: "Essays and analysis.",
    lede: "Extended arguments applying the Redemocratize principles to contemporary political and institutional questions.",
  },
  topics: {
    eyebrow: "Democracy Works / Topics",
    title: "Issue areas, principled.",
    lede: "Problems people care about, mapped to the structural and substantive principles that bear on them.",
  },
  proposals: {
    eyebrow: "Democracy Works / Proposals",
    title: "Institutional proposals.",
    lede: "RFC-style proposals for specific institutional designs, each grounded in the principles and open to critique.",
  },
  models: {
    eyebrow: "Democracy Works / Models",
    title: "Comparative models.",
    lede: "Examples from other democracies, examined for what they teach about the principles in practice.",
  },
  news: {
    eyebrow: "Democracy Works / News",
    title: "Project dispatches.",
    lede: "Updates on the development of the Redemocratize framework and the project around it.",
  },
}

/** Format a date as "06 Apr" (day + short month). */
export function formatLedgerDate(date) {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, "0")
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
  return { day, month, year: d.getFullYear() }
}

/** Format a date as "March 2026" for month group headers. */
export function formatMonthGroup(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  })
}

/** Format a date as "March 25, 2026" for detail page bylines. */
export function formatLongDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Sort items into featured (pinned) and chronological groups.
 * Featured: sorted by pin ascending.
 * Chronological: grouped by YYYY-MM, each group sorted desc; groups themselves sorted desc.
 */
export function organizeItems(entries) {
  const pinned = entries
    .filter((e) => e.data.pin != null)
    .sort((a, b) => a.data.pin - b.data.pin)

  const unpinned = entries
    .filter((e) => e.data.pin == null)
    .sort(
      (a, b) =>
        new Date(b.data.pubDate).getTime() -
        new Date(a.data.pubDate).getTime(),
    )

  const groupMap = new Map()
  for (const entry of unpinned) {
    const d = new Date(entry.data.pubDate)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        label: formatMonthGroup(entry.data.pubDate),
        sortDate: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
        items: [],
      })
    }
    groupMap.get(key).items.push(entry)
  }

  const groups = Array.from(groupMap.values()).sort(
    (a, b) => b.sortDate - a.sortDate,
  )

  return { featured: pinned, groups }
}

/**
 * Extract a short summary from an item: use the `summary` field if present,
 * otherwise pull the first paragraph out of the body.
 */
export function getExcerpt(entry, maxLength = 240) {
  if (entry.data.summary) return entry.data.summary
  const body = entry.body || ""
  const cleaned = body
    .replace(/^import\s+.+$/gm, "")
    .replace(/<[^>]+\/>/g, "")
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "")
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/^#+\s+.+$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[_*`~]/g, "")
    .trim()
  const firstParagraph =
    cleaned.split(/\n\n+/).find((p) => p.trim().length > 0) || ""
  if (firstParagraph.length <= maxLength) return firstParagraph
  return firstParagraph.slice(0, maxLength).replace(/\s+\S*$/, "") + "…"
}
