import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

const principles = defineCollection({
  loader: glob({ base: "./src/content/principles", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    number: z.number(),
    tier: z.enum(["structural", "substantive"]),
    summary: z.string(),
    connections: z.array(z.string()).optional(),
  }),
})

/** Shared fields for all Labs content types */
const labsBase = {
  uid: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  author: z.string().optional(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  draft: z.boolean().default(false),
  pin: z.number().optional(),
  principles: z.array(z.string()).optional(),
}

const articles = defineCollection({
  loader: glob({ base: "./src/content/articles", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    ...labsBase,
  }),
})

const topics = defineCollection({
  loader: glob({ base: "./src/content/topics", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    ...labsBase,
  }),
})

const proposals = defineCollection({
  loader: glob({ base: "./src/content/proposals", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    ...labsBase,
    status: z.enum(["draft", "review", "accepted"]).default("draft"),
  }),
})

const models = defineCollection({
  loader: glob({ base: "./src/content/models", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    ...labsBase,
    country: z.string().optional(),
  }),
})

const news = defineCollection({
  loader: glob({ base: "./src/content/news", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    ...labsBase,
  }),
})

const landing = defineCollection({
  loader: glob({ base: "./src/content/landing", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
  }),
})

export const collections = { principles, articles, topics, proposals, models, news, landing }
