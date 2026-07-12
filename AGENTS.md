# AGENTS.md

## What this repo is

This is the official documentation hub for the Wazoo project ecosystem, built
with Mintlify. Content is written in MDX with YAML frontmatter. Site
configuration lives in `docs.json`.

## Commands

| Command                | Purpose                     |
| ---------------------- | --------------------------- |
| `npm run dev`          | Start local preview         |
| `npm run check`        | Validate docs build         |
| `npm run format`       | Format all MD/MDX/JSON      |
| `npm run precommit`    | Format check + validate     |
| `npx mintlify broken-links` | Check internal links    |

Run `npm run precommit` before finalizing any commit.

## Style guidelines

These are the non-negotiable rules. See `/contribute/style` for the full guide.

### Voice

- Second-person active voice ("you")
- Zero marketing adjectives ("powerful", "seamless", "robust")
- No filler phrases ("it's important to note", "in order to")
- No editorializing ("obviously", "simply", "just", "easily")
- No excessive conjunctions ("moreover", "furthermore", "additionally")
- No generic introductions or concluding summaries

### Headings and formatting

- Sentence case for headings ("Getting started", not "Getting Started")
- Sentence case for code block titles
- No bold or italics in body text
- No decorative emoji
- All code blocks must have explicit language tags
- All images must have descriptive alt text

### Code examples

- Use realistic values (avoid "foo" or "bar")
- Relational facts should use canonical examples like `user:person` and
  `wazoo:organization`
- Verify code works before including it

### Files and navigation

- Use kebab-case for new files (`getting-started.mdx`)
- Internal links use root-relative paths without file extensions
  (`/projects/worlds`)
- New pages must be added to `docs.json` navigation
- Every MDX file must have `title` and `description` in YAML frontmatter

### Terminology

- **Worlds API / Platform**: product and interface names
- **world / worlds** (lowercase): specific knowledge graph instances
- **engine / context engine**: functional descriptions
- **verified facts**: technical descriptions of graph state
- **memory**: conceptual analogy, permitted for developer intuition
