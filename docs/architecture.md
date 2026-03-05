---
layout: default
title: Architecture
nav_order: 2
---

# Architecture

## Dual-Port Design

HITL runs two separate Express servers on different ports:

- **API server** (default port 3000): Agent-facing JSON REST API. Agents use this to create pages and poll for responses. It never serves HTML or JavaScript.
- **User server** (default port 3001): Human-facing web server. Renders Markdown content as HTML pages with interactive form fields. It never exposes raw data APIs.

This separation ensures the agent port never serves executable content to browsers, and the human port never exposes internal data endpoints — a clean security boundary.

## Data Flow

```
┌─────────────┐         POST /api/pages          ┌─────────────┐
│  AI Agent    │ ──────────────────────────────▶   │  API Server  │
│              │                                   │  (port 3000) │
│              │   GET /api/pages/:id              │              │
│              │ ◀──────────────────────────────── │              │
└─────────────┘                                   └──────┬───────┘
                                                         │
                                                         │ SQLite
                                                         │ (shared)
                                                         │
┌─────────────┐         GET /p/:id                ┌──────┴───────┐
│   Human      │ ◀──────────────────────────────  │  User Server  │
│   (browser)  │                                   │  (port 3001) │
│              │   POST /p/:id/submit              │              │
│              │ ──────────────────────────────▶   │              │
└─────────────┘                                   └──────────────┘
```

Both servers share a single SQLite database. The API server writes new pages and reads status; the User server reads pages for rendering and writes form responses.

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20+ |
| Framework | Express | 5.x |
| Database | SQLite (better-sqlite3) | — |
| Templating | EJS | 4.x |
| Markdown | marked | 17.x |
| CSS Framework | Pico CSS | 2.x |
| ID Generation | nanoid | 3.x |

## Database Schema

The application uses a single `pages` table:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | TEXT (PK) | nanoid(10) | Unique page identifier |
| `title` | TEXT | NULL | Optional page title |
| `content` | TEXT | (required) | Markdown + annotation source |
| `status` | TEXT | `'waiting'` | `'waiting'` or `'responded'` |
| `responses` | TEXT | NULL | JSON-stringified response object |
| `created_at` | TEXT | `datetime('now')` | ISO timestamp |
| `responded_at` | TEXT | NULL | ISO timestamp when submitted |

The database uses WAL (Write-Ahead Logging) journal mode for better concurrent read performance. WAL allows multiple readers to operate simultaneously while a single writer is active, making it well-suited for the dual-server architecture where both servers access the same database file.

## Request Lifecycle

1. **Agent creates a page** — POSTs Markdown content (with annotation fields) to the API server. The server generates a nanoid, stores the page in SQLite, and returns the page ID plus a human-facing URL.
2. **Agent polls** — GETs `/api/pages/:id`. Status is `"waiting"` until the human responds.
3. **Human opens URL** — The User server fetches the page from SQLite, parses annotations into form fields, renders Markdown to HTML, and serves the interactive page.
4. **Human submits** — The User server collects form responses, stores them in SQLite, and sets the page status to `"responded"`.
5. **Agent polls again** — Status is now `"responded"` and the `responses` object contains the human's input.

## File Structure

```
hitl/
├── server.js              # Entry point — creates and starts both Express apps
├── src/
│   ├── db.js              # SQLite database setup and CRUD operations
│   ├── parser.js          # Annotation parser and Markdown renderer
│   └── routes/
│       ├── api.js         # Agent-facing REST API routes
│       └── pages.js       # Human-facing page rendering and submission routes
├── views/
│   ├── page.ejs           # Main page template with form
│   └── submitted.ejs      # Post-submission confirmation template
├── public/
│   └── style.css          # Custom styles (approve buttons, field groups)
├── test/
│   └── api.test.js        # Full test suite
├── Dockerfile             # Docker build (node:22-alpine)
├── package.json           # Dependencies and scripts
└── .github/workflows/
    ├── ci.yml             # Test matrix (Node 20, 22)
    └── docker-publish.yml # GHCR image publish
```
