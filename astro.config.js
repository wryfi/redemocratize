import { defineConfig, fontProviders } from "astro/config"
import { remarkDefinitionList, defListHastHandlers } from "remark-definition-list"
import remarkGfm from "remark-gfm"
import remarkDirective from "remark-directive"
import tailwindcss from "@tailwindcss/vite"
import icon from "astro-icon"
import mdx from "@astrojs/mdx"
import sitemap from "@astrojs/sitemap"
import { remarkCitations } from "./src/plugins/remark-citations.js"
import { remarkCrossRef } from "./src/plugins/remark-cross-ref.js"

// https://astro.build/config
export default defineConfig({
  site: "https://redemocratize.org",

  fonts: [
    {
      provider: fontProviders.google(),
      name: "Literata",
      cssVariable: "--font-family-body",
    },
    {
      provider: fontProviders.google(),
      name: "Exo 2",
      cssVariable: "--font-family-heading",
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    remarkPlugins: [remarkGfm, remarkDefinitionList, remarkDirective, remarkCrossRef, remarkCitations],
    remarkRehype: { handlers: defListHastHandlers },
  },

  integrations: [icon(), mdx(), sitemap()],

  build: {
    inlineStylesheets: "auto",
  },

  compressHTML: true,
})
