# Contributing to Wazoo Docs

This guide explains how to configure your environment, run the docs site
locally, and submit pull requests.

## Quick start

### Prerequisites

- **Node.js and npm** — required for Mintlify CLI and project tooling
- **Git** — for version control

### Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/wazootech/docs.wazoo.dev.git
   cd docs.wazoo.dev
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000` to preview changes live.

## Project structure

```
docs.wazoo.dev/
├── docs.json                   # Site configuration (nav, theme, SEO)
├── introduction.mdx             # Landing page
├── what-were-building.mdx       # Product thesis
├── projects.mdx                 # Ecosystem project map
├── quickstart.mdx               # Multi-path quickstart
├── manifesto.mdx                # Worlds manifesto
├── platform.mdx                 # Worlds Console overview
├── openapi.yaml                 # Worlds API spec
├── projects/                    # Project overview pages
│   ├── worlds.mdx
│   ├── wiki.mdx
│   ├── wiki/templates/index.mdx
│   ├── linked-markdown.mdx
│   └── memsdk.mdx
├── worlds/                      # Worlds user guides
│   ├── index.mdx
│   ├── search.mdx
│   ├── query.mdx
│   └── update.mdx
├── integrations/                # Agent framework connectors
├── contribute/                  # Architecture, security, self-host, style
├── reference/                   # CLI and API reference
│   └── cli/
├── images/                      # Static assets
├── logo/                        # Light and dark logo SVGs
└── style.css                    # Custom styles
```

## Development workflow

### Scripts

| Command             | Purpose                 |
| ------------------- | ----------------------- |
| `npm run dev`       | Start local preview     |
| `npm run check`     | Validate docs build     |
| `npm run format`    | Format all MD/MDX/JSON  |
| `npm run precommit` | Format check + validate |

Run `npm run precommit` before opening a pull request to verify everything
passes.

## Coding standards

- Write content in **MDX** with YAML frontmatter.
- Use root-relative paths without file extensions for internal links
  (`/projects/worlds`, not `../projects/worlds.mdx`).
- Follow the [style guide](/contribute/style) for voice, formatting, and code
  conventions.
- Run `npm run format` before committing.

## Pull request process

1. **Create a branch** off `main` with a descriptive name like
   `feat/wiki-quickstart`.
2. **Commit clearly** — atomic commits with concise messages.
3. **Run checks** — `npm run precommit` must pass.
4. **Open a PR** — include a summary of what changed and why. Link related
   issues.
5. **Reviews** — all PRs require at least one maintainer review before merging.

## Community guidelines

- Be respectful and inclusive.
- Focus on constructive feedback.
- Maintain professionalism in all interactions.
