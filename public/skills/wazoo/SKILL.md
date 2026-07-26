---
name: wazoo
description:
  Manage Wazoo Worlds (https://wazoo.dev), provision knowledge graphs, execute
  SPARQL queries, search structured context, manage tokens, and clean up
  platform resources.
license: MIT
compatibility: Works with any HTTP client or curl.
metadata:
  author: Wazoo Technologies (https://github.com/wazootech)
  version: "1.0.0"
---

# Wazoo Skill

Use this skill when interacting with the Wazoo platform, managing knowledge
graph worlds, querying structured memory, or maintaining durable agent context.

## Environment setup

Wazoo uses two token types:

- `WAZOO_PLATFORM_TOKEN` (`wzp_...`): Control plane management (worlds, tokens,
  usage, billing).
- `WORLDS_TOKEN` (`wzw_...`): Data plane operations (import, search, SPARQL,
  export).

```bash
export WAZOO_PLATFORM_TOKEN="wzp_..."
export WORLDS_TOKEN="wzw_..."
```

## 1. Control plane management

### List worlds

```bash
curl -s -X GET "https://api.wazoo.dev/v1/worlds" \
  -H "Authorization: Bearer $WAZOO_PLATFORM_TOKEN"
```

### Create a world

```bash
curl -s -X POST "https://api.wazoo.dev/v1/worlds" \
  -H "Authorization: Bearer $WAZOO_PLATFORM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "worldId": "project-context",
    "world": { "displayName": "Project Context Graph", "region": "auto" }
  }'
```

### Get world details

```bash
curl -s -X GET "https://api.wazoo.dev/v1/worlds/project-context" \
  -H "Authorization: Bearer $WAZOO_PLATFORM_TOKEN"
```

### Delete / Clean up a world

```bash
curl -s -X DELETE "https://api.wazoo.dev/v1/worlds/project-context" \
  -H "Authorization: Bearer $WAZOO_PLATFORM_TOKEN"
```

---

## 2. Data plane operations

### Import graph data

Import RDF quads (JSON array) or chunk text into a world:

```bash
curl -s -X POST "https://worlds-api.wazoo.dev/worlds/project-context/import" \
  -H "Authorization: Bearer $WORLDS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "text/plain",
    "data": "Architectural Decision Record 001: Use hybrid SPARQL and vector search for durable memory."
  }'
```

### Hybrid search across context

Search world graph memory by query text:

```bash
curl -s -X POST "https://worlds-api.wazoo.dev/worlds/project-context/search" \
  -H "Authorization: Bearer $WORLDS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Architectural Decision Record",
    "limit": 5
  }'
```

### Execute SPARQL query

Run graph queries over triples/quads in the world:

```bash
curl -s -X POST "https://worlds-api.wazoo.dev/worlds/project-context/sparql" \
  -H "Authorization: Bearer $WORLDS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10"
  }'
```

### Export graph data

Export world quads for auditing or local backup:

```bash
curl -s -X GET "https://worlds-api.wazoo.dev/worlds/project-context/export?format=application/json&limit=100" \
  -H "Authorization: Bearer $WORLDS_TOKEN"
```
