---
layout: default
title: Overview & Quick Start
nav_order: 1
---

# HITL — Human-in-the-Loop

HITL lets AI agents create interactive web pages, show them to humans, and retrieve their responses via a simple REST API.

## Who It's For

HITL is for AI agent developers who need to collect human input — approvals, form data, decisions — during automated workflows. Any system that can make HTTP requests can use HITL. No SDKs, no webhooks, no WebSockets: just POST to create a page, give the URL to a human, and poll for the result.

## Key Features

- Markdown content with embedded interactive fields
- Four field types: text, checkbox, select, approve/reject
- Dual-port architecture (agent API + human UI)
- SQLite storage, zero external dependencies
- Docker-ready, single `npm start` to run

## 30-Second Example

```bash
# Step 1: Agent creates a page
curl -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deploy Approval",
    "content": "## Deploy v2.3.1 to production?\n\n{{approve:deploy|label=Approve deployment?}}\n\n{{text:notes|placeholder=Any concerns?}}"
  }'
# Returns: {"id":"aBcDeFgHiJ","url":"http://localhost:3001/p/aBcDeFgHiJ","status":"waiting"}

# Step 2: Human opens the URL and submits the form

# Step 3: Agent polls for the response
curl http://localhost:3000/api/pages/aBcDeFgHiJ
# Returns: {"id":"aBcDeFgHiJ","status":"responded","responses":{"deploy":"approved","notes":"Looks good"},...}
```

## Quick Install

**npm:**

```bash
git clone <repo-url> && cd hitl
npm install && npm start
```

**Docker:**

```bash
docker run -p 3000:3000 -p 3001:3001 ghcr.io/<owner>/hitl:latest
```

The API server starts on port 3000 and the human-facing UI on port 3001.

## What's Next

- [Architecture](architecture) — understand the dual-port design and data flow
- [API Reference](api-reference) — full endpoint documentation
- [Agent Integration Guide](agent-integration) — end-to-end code examples in curl, Python, and Node.js
