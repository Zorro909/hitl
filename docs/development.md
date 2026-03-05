---
layout: default
title: Development
nav_order: 9
---

# Development

## Local Setup

```bash
git clone <repo-url>
cd hitl
npm install
npm start
# API: http://localhost:3000
# User: http://localhost:3001
```

## Running Tests

```bash
npm test
```

The test command runs:

```bash
DB_PATH=:memory: node --test test/*.test.js
```

- Uses the **Node.js built-in test runner** (`node --test`)
- Runs with `DB_PATH=:memory:` so tests use an in-memory SQLite database
- Uses **supertest** for HTTP-level testing against both Express apps
- No test database files are created on disk

## Test Structure

The test suite (`test/api.test.js`) covers three areas:

**API Server** suite:
- Page creation (`POST /api/pages`) — verifies the response includes `id`, `url`, and `status: "waiting"`
- Status retrieval (`GET /api/pages/:id`) — verifies waiting status and null responses
- 404 handling — verifies unknown page IDs return 404
- Validation — verifies missing `content` field returns 400

**User Server** suite:
- Page rendering (`GET /p/:id`) — verifies the HTML contains form elements for all field types
- Form submission (`POST /p/:id/submit`) — verifies responses are saved and retrievable via the API
- Double-submit rejection — verifies already-responded pages show the "already submitted" message

**Parser** suite:
- Field extraction — verifies annotations are correctly parsed into field objects
- Markdown rendering — verifies Markdown is rendered to HTML with form fields replacing annotations
- No-annotation content — verifies plain Markdown without annotations renders correctly

## CI/CD

### CI (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main`. Tests against a matrix of Node.js versions:

- Node.js 20
- Node.js 22

Steps: checkout → setup Node.js → `npm ci` → `npm test`

### Docker Publish (`.github/workflows/docker-publish.yml`)

Runs on push to `main` or version tags (`v*`). Builds the Docker image and pushes to GitHub Container Registry (GHCR).

Image tags:
- **Branch name** (e.g., `main`)
- **Semver** (e.g., `1.0.0`, `1.0`)
- **Git SHA** (short hash)

## Project Structure

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

## Contributing

1. Fork the repository and create a feature branch.
2. Make your changes.
3. Run `npm test` and ensure all tests pass.
4. Submit a pull request to `main`.

Keep dependencies minimal. HITL intentionally has a small dependency footprint — any new dependency should have a clear justification.
