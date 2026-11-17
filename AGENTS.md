# AGENTS.md

## What this repo is

This is the official documentation hub for the Wazoo project ecosystem, built
with Mintlify. Content is written in MDX with YAML frontmatter. Site
configuration lives in `docs.json`.

## Commands

| Command                           | Purpose                 |
| --------------------------------- | ----------------------- |
| `pnpm run dev`                    | Start local preview     |
| `pnpm run check`                  | Validate docs build     |
| `pnpm run format`                 | Format all MD/MDX/JSON  |
| `pnpm run precommit`              | Format check + validate |
| `pnpm exec mintlify broken-links` | Check internal links    |

Run `pnpm run precommit` before finalizing any commit.

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
- Default placeholder names to "Ethan", "Gregory", and "Sandra" — not "Alice",
  "Ben", "Chad", or similar generic names
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

## Code health

Family-wide rules live in the
[wazootech workspace constitution](https://github.com/wazootech/workspace/blob/main/AGENTS.md#code-health-standards);
this repo's specifics:

- Before pushing, run `pnpm run precommit` (prettier `format:check` plus
  `mintlify validate`); CI also runs `pnpm run broken-links`.
- `.github/workflows/secret-scan.yml` runs gitleaks on every PR and push to
  `main`. `.gitleaks.toml` extends the default rules and allowlists only the
  `wzp_YOUR_*` placeholder token used in docs examples; never put a real key in
  an example.
- Third-party actions in `.github/workflows/` are pinned to commit SHAs;
  `renovate.json` keeps them current.
- `.github/CODEOWNERS` assigns `* @EthanThatOneKid`.
