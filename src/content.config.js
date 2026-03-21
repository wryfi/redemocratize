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

const topics = defineCollection({
  loader: glob({ base: "./src/content/topics", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    summary: z.string(),
    principles: z.array(z.string()).optional(),
  }),
})

const proposals = defineCollection({
  loader: glob({ base: "./src/content/proposals", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    summary: z.string(),
    status: z.enum(["draft", "review", "accepted"]).default("draft"),
    principles: z.array(z.string()).optional(),
    author: z.string().optional(),
  }),
})

const models = defineCollection({
  loader: glob({ base: "./src/content/models", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    summary: z.string(),
    country: z.string().optional(),
    principles: z.array(z.string()).optional(),
  }),
})

const diagnosis = defineCollection({
  loader: glob({ base: "./src/content/diagnosis", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    summary: z.string().optional(),
    order: z.number().optional(),
  }),
})

const landing = defineCollection({
  loader: glob({ base: "./src/content/landing", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
  }),
})

export const collections = { principles, topics, proposals, models, diagnosis, landing }
