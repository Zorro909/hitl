---
layout: default
title: API Reference
nav_order: 4
---

# API Reference

HITL exposes two sets of endpoints on separate servers:

- **API server** (port 3000) — agent-facing, JSON REST API
- **User server** (port 3001) — human-facing, HTML pages and form submission

---

## POST /api/pages

Create a new interactive page.

**Server**: API server (port 3000)

### Request Body

`Content-Type: application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Markdown content with optional annotation fields (see [Annotation Syntax](annotation-syntax)) |
| `title` | string | No | Page title displayed in the browser tab and page header |

### Request Example

```json
{
  "title": "Code Review",
  "content": "## PR #42: Add login page\n\nPlease review the changes.\n\n{{approve:review|label=Approve this PR?}}\n\n{{text:comments|placeholder=Leave comments...|multiline=true}}"
}
```

### Response `201 Created`

```json
{
  "id": "aBcDeFgHiJ",
  "url": "http://localhost:3001/p/aBcDeFgHiJ",
  "status": "waiting"
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique 10-character page identifier (nanoid) |
| `url` | string | Full URL for the human to open (uses `USER_BASE_URL` env var) |
| `status` | string | Always `"waiting"` for a newly created page |

### Errors

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{"error": "content is required and must be a string"}` | Missing `content` field, or `content` is not a string |

---

## GET /api/pages/:id

Retrieve page status and responses. This is the endpoint agents poll to check whether a human has responded.

**Server**: API server (port 3000)

### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | The page ID returned by `POST /api/pages` |

### Response `200 OK` (waiting)

```json
{
  "id": "aBcDeFgHiJ",
  "status": "waiting",
  "responses": null,
  "created_at": "2025-01-15 10:30:00",
  "responded_at": null
}
```

### Response `200 OK` (responded)

```json
{
  "id": "aBcDeFgHiJ",
  "status": "responded",
  "responses": {
    "review": "approved",
    "comments": "LGTM, ship it"
  },
  "created_at": "2025-01-15 10:30:00",
  "responded_at": "2025-01-15 10:32:45"
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Page identifier |
| `status` | string | `"waiting"` (no response yet) or `"responded"` (human submitted the form) |
| `responses` | object \| null | `null` if waiting. When responded: object with field names as keys and submitted values as values. Checkbox fields return arrays of selected values. |
| `created_at` | string | ISO-ish datetime when the page was created |
| `responded_at` | string \| null | Datetime when the human submitted, or `null` |

### Errors

| Status | Body | Cause |
|--------|------|-------|
| `404` | `{"error": "page not found"}` | No page exists with this ID |

---

## GET /p/:id (User Server)

Render the interactive page for the human.

**Server**: User server (port 3001)

This endpoint:

- Returns **HTML** (not JSON)
- Fetches the stored page from SQLite, parses Markdown and annotation fields, and renders a complete HTML page with an interactive form
- Uses Pico CSS for styling and EJS for templating
- Shows an **"already submitted"** message if the page status is `responded`
- Returns `404` plain text (`"Page not found"`) if the page ID does not exist

### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | The page ID from the `url` field in the create-page response |

### Errors

| Status | Body | Cause |
|--------|------|-------|
| `404` | `Page not found` (plain text) | No page exists with this ID |

---

## POST /p/:id/submit (User Server)

Submit form responses. This is a standard HTML form submission triggered by the browser, not an API call.

**Server**: User server (port 3001)

This endpoint:

- Accepts `application/x-www-form-urlencoded` (standard form POST)
- Collects all annotated fields from the submitted form data
- Stores the responses in SQLite and sets the page status to `responded`
- Returns a **"Thank You"** confirmation page on success
- Returns an **"Already Submitted"** page if the page was previously responded to
- Is idempotent in the sense that double-submits are rejected gracefully — the human sees a message that the page was already submitted, and the original responses are preserved

### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | The page ID |

### Errors

| Status | Body | Cause |
|--------|------|-------|
| `404` | `Page not found` (plain text) | No page exists with this ID |
