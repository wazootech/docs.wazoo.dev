# Wazoo Docs

This repository contains the official documentation for the Wazoo project
ecosystem, built with [Mintlify](https://mintlify.com).

## Overview

The documentation covers:

- **Welcome**: Introduction, thesis, project map, and quickstart paths.
- **Projects**: Overviews for Worlds, Wiki toolchain, Linked Markdown, and
  MemSDK.
- **Worlds guides**: Search, query, update, and the Worlds API reference.
- **Integrations**: Agent framework and platform connectors.
- **Open source**: Architecture, security, self-hosting, and style guide.

## Development

[Mintlify CLI](https://www.npmjs.com/package/mintlify):

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

View your local preview at `http://localhost:3000`.

### Scripts

| Command             | Purpose                 |
| ------------------- | ----------------------- |
| `npm run dev`       | Start local preview     |
| `npm run check`     | Validate docs build     |
| `npm run format`    | Format all MD/MDX/JSON  |
| `npm run precommit` | Format check + validate |

## Deployment

Changes pushed to `main` are automatically deployed to the production
documentation site via the Mintlify GitHub App.
