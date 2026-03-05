---
layout: default
title: Installation & Deployment
nav_order: 3
---

# Installation & Deployment

## Prerequisites

- **Node.js** 20 or later
- **npm** 9 or later

SQLite is bundled via `better-sqlite3`, which is a native module compiled at install time. No separate SQLite installation is required.

## From Source

```bash
git clone <repo-url>
cd hitl
npm install
npm start
```

`better-sqlite3` compiles a native C++ addon during `npm install`. This requires a C++ toolchain on your system:

- **Debian/Ubuntu**: `apt-get install build-essential`
- **macOS**: `xcode-select --install`
- **Alpine Linux**: `apk add build-base python3`

Once started, the API server listens on port 3000 and the User server on port 3001.

## Docker

```bash
# Pull from GHCR
docker pull ghcr.io/<owner>/hitl:latest

# Run with persistent data
docker run -d \
  -p 3000:3000 \
  -p 3001:3001 \
  -v hitl-data:/app/data \
  --name hitl \
  ghcr.io/<owner>/hitl:latest
```

- **Base image**: `node:22-alpine`
- **Exposed ports**: 3000 (API), 3001 (User)
- **Data directory**: `/app/data/` (contains the SQLite database)

## Docker Compose

```yaml
services:
  hitl:
    image: ghcr.io/<owner>/hitl:latest
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - hitl-data:/app/data
    environment:
      - USER_BASE_URL=https://hitl.example.com
    restart: unless-stopped

volumes:
  hitl-data:
```

## Production Deployment Considerations

- **Set `USER_BASE_URL`** to the public URL of the user-facing server. This variable controls the URLs returned in API responses so agents get correct, publicly-accessible links instead of `http://localhost:3001`.

- **Run behind a reverse proxy** (nginx, Caddy) for TLS termination. HITL itself does not handle HTTPS.

- **Map different domains or paths** for the two ports. For example:
  - `api.hitl.example.com` → `:3000`
  - `hitl.example.com` → `:3001`

- **Persist the data volume** for database durability. Mount a volume to `/app/data` so the SQLite database survives container restarts.

- **Concurrency**: The SQLite database uses WAL mode and handles concurrent reads well, but writes are serialized. This is suitable for moderate traffic. For high-throughput scenarios, consider placing a queue in front of page creation.

## Verify Installation

```bash
# API server health check
curl -s http://localhost:3000/api/pages/test | grep -q "not found" && echo "API OK"

# Create a test page
curl -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -d '{"content": "# Test\n\n{{approve:ok|label=Working?}}"}'
```

If the first command prints `API OK` and the second returns a JSON response with `"status": "waiting"`, the installation is working correctly.
