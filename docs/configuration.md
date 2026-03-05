---
layout: default
title: Configuration Reference
nav_order: 8
---

# Configuration Reference

HITL is configured entirely through environment variables. There are no configuration files.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `3000` | Port for the agent-facing API server |
| `USER_PORT` | `3001` | Port for the human-facing web server |
| `USER_BASE_URL` | `http://localhost:3001` | Base URL for generating human-facing page links in API responses. Set this to the public URL in production. |
| `DB_PATH` | `./data/hitl.db` | Path to the SQLite database file. Set to `:memory:` for testing. |

### `API_PORT`

Port the API server listens on. Agents send requests to this port.

**Default**: `3000`

**When to change**: If port 3000 conflicts with another service, or if your reverse proxy expects a different upstream port.

```bash
export API_PORT=8080
```

### `USER_PORT`

Port the User server listens on. Humans access pages through this port.

**Default**: `3001`

**When to change**: If port 3001 conflicts with another service, or if your reverse proxy expects a different upstream port.

```bash
export USER_PORT=8081
```

### `USER_BASE_URL`

Base URL used when constructing page URLs in API responses. When an agent creates a page, the response includes a `url` field like `{USER_BASE_URL}/p/{id}`.

**Default**: `http://localhost:3001`

**When to change**: Always set this in production. Without it, API responses will contain `http://localhost:3001` URLs that aren't accessible outside the server machine.

```bash
export USER_BASE_URL=https://hitl.example.com
```

### `DB_PATH`

Filesystem path for the SQLite database file. The directory must exist and be writable.

**Default**: `./data/hitl.db` (relative to the project root)

**When to change**: In production, use an absolute path on a persistent volume. For testing, set to `:memory:` for an in-memory database.

```bash
# Production
export DB_PATH=/var/lib/hitl/hitl.db

# Testing
export DB_PATH=:memory:
```

## Production Example

```bash
export API_PORT=3000
export USER_PORT=3001
export USER_BASE_URL=https://hitl.example.com
export DB_PATH=/var/lib/hitl/hitl.db
```

Or with Docker:

```bash
docker run -d \
  -p 3000:3000 \
  -p 3001:3001 \
  -e USER_BASE_URL=https://hitl.example.com \
  -e DB_PATH=/app/data/hitl.db \
  -v hitl-data:/app/data \
  ghcr.io/<owner>/hitl:latest
```
