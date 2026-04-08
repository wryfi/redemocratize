#!/usr/bin/env bun

/**
 * Scaffold a new content file with a generated cuid2 ID.
 *
 * Usage:
 *   bun run new-content <type> <slug>
 *
 * Examples:
 *   bun run new-content article voting-rights-analysis
 *   bun run new-content topic healthcare
 *   bun run new-content proposal ranked-choice-voting
 *   bun run new-content model german-parliamentary
 *   bun run new-content news launch-announcement
 */

import { init } from "@paralleldrive/cuid2";
const createId = init({ length: 10 });
import { existsSync } from "node:fs";

const VALID_TYPES = ["article", "topic", "proposal", "model", "news"];

const TYPE_TO_COLLECTION = {
  article: "articles",
  topic: "topics",
  proposal: "proposals",
  model: "models",
  news: "news",
};

const [type, slug] = process.argv.slice(2);

if (!type || !slug) {
  console.error("Usage: bun run new-content <type> <slug>");
  console.error(`Types: ${VALID_TYPES.join(", ")}`);
  process.exit(1);
}

if (!VALID_TYPES.includes(type)) {
  console.error(`Invalid type: ${type}`);
  console.error(`Valid types: ${VALID_TYPES.join(", ")}`);
  process.exit(1);
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error(`Invalid slug: ${slug}`);
  console.error("Slugs must be lowercase alphanumeric with hyphens (e.g. my-article-slug)");
  process.exit(1);
}

const collection = TYPE_TO_COLLECTION[type];
const contentDir = `src/content/${collection}`;
const filePath = `${contentDir}/${slug}.mdx`;

if (existsSync(filePath)) {
  console.error(`File already exists: ${filePath}`);
  process.exit(1);
}

const uid = createId();
const today = new Date().toISOString().split("T")[0];

const frontmatter = [
  "---",
  `uid: "${uid}"`,
  `title: ""`,
  `summary: ""`,
  `author: ""`,
  `pubDate: ${today}`,
  `draft: true`,
];

if (type === "proposal") {
  frontmatter.push(`status: "draft"`);
}
if (type === "model") {
  frontmatter.push(`country: ""`);
}
if (["topic", "proposal", "model", "article"].includes(type)) {
  frontmatter.push(`principles: []`);
}

frontmatter.push("---", "", "");

await Bun.write(filePath, frontmatter.join("\n"));

console.log(`Created ${filePath}`);
console.log(`  uid: ${uid}`);
console.log(`  type: ${type}`);
console.log(`  URL: /works/${collection}/${slug}`);
