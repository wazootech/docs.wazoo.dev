---
name: wazoo-memory
description: Read and write persistent knowledge and memories in Wazoo Worlds.
---

# Wazoo Memory Skill

Use this skill when saving durable context, user preferences, or project decisions to Wazoo.

## Environment setup

Ensure `WAZOO_PLATFORM_TOKEN` (starts with `wzp_`) is exported in your environment.

## 1. List active worlds

```bash
curl -s -X GET "https://api.wazoo.dev/v1/worlds" \
  -H "Authorization: Bearer $WAZOO_PLATFORM_TOKEN"
```

## 2. Store context in a world

```bash
curl -s -X POST "https://api.wazoo.dev/v1/worlds" \
  -H "Authorization: Bearer $WAZOO_PLATFORM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "worldId": "project-context",
    "world": { "displayName": "Project Context Graph" }
  }'
```
