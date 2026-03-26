# Redemocratize

Source code for [redemocratize.org](https://redemocratize.org) -- an
open-source constitutional design project that articulates principles for
democratic governance adequate to the 21st century, invites collaborative
development of institutional proposals, and evaluates both existing and
proposed systems against those principles.

## Tech Stack

- [Astro 6](https://astro.build/) -- static site generator
- [Bun](https://bun.sh/) -- JavaScript runtime and package manager
- [Tailwind CSS v4](https://tailwindcss.com/) + [DaisyUI v5](https://daisyui.com/) -- styling
- [Cloudflare Pages](https://pages.cloudflare.com/) -- hosting and serverless functions

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Project Structure

```
src/
  content/          # Markdown/MDX content collections
    principles/     # The fifteen principles
    topics/         # Issue areas mapped to principles
    proposals/      # RFC-style institutional proposals
    models/         # Comparative examples from other democracies
    diagnosis/      # Cumulative Constitutional Crises material
    landing/        # Homepage sections
  components/       # Reusable Astro components
  layouts/          # Page layouts
  pages/            # Static and dynamic pages
  plugins/          # Remark plugins (citations, cross-references)
  styles/           # Tailwind v4 / DaisyUI configuration
functions/          # Cloudflare Pages Functions (form handlers)
docs/               # Project documentation and reference material
```

## Content Authoring

Content is written in Markdown and MDX using Astro content collections.
Two custom remark plugins are available:

- **Cross-references**: `:ref[link text]{to="collection/slug"}` links
  between documents
- **Citations**: `[@cite_key]` for Bluebook-style legal citations

Create new content files with:

```bash
bun run new-content
```

## License

Content is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Code is licensed under the [MIT License](LICENSE).
