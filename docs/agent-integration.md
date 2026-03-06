---
layout: default
title: Agent Integration Guide
nav_order: 6
---

# Agent Integration Guide

This guide covers the complete workflow for integrating HITL into an AI agent, with runnable examples in three languages.

## End-to-End Workflow

1. **Create a page** — POST Markdown content (with annotation fields) to the API server. The response includes a page ID and a human-facing URL. Optionally include a `callback_url` for async notifications.
2. **Present the URL to the human** — send it via chat, email, Slack notification, or open it programmatically.
3. **Wait for response** — either poll `GET /api/pages/:id`, or receive a webhook callback at the `callback_url` you provided.
4. **Process the response** — read the `responses` object and act on the human's input.

## Webhook Callbacks (recommended)

Instead of polling, provide a `callback_url` when creating a page. When the human submits, HITL POSTs the response to your URL automatically.

- **Fire-and-forget**: The callback never blocks the human's submission
- **Single attempt**: No retries. 5-second timeout
- **Backwards-compatible**: Polling still works alongside callbacks

```bash
# Create page with callback
curl -s -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review",
    "content": "{{approve:ok|label=Approve?}}",
    "callback_url": "https://hooks.example.com/api/webhooks/whk_abc123"
  }'
```

The callback payload:

```json
{
  "id": "aBcDeFgHiJ",
  "status": "responded",
  "responses": { "ok": "approved" },
  "responded_at": "2025-01-15 10:32:45"
}
```

## Polling Pattern

Polling is still supported as a fallback or alternative to callbacks.

- Poll at intervals of 2–5 seconds
- Check the `status` field: `"waiting"` means keep polling, `"responded"` means the human has submitted
- Always implement a timeout to avoid polling forever — 5–10 minutes is a reasonable default

## Code Examples

### curl

```bash
# Create
PAGE=$(curl -s -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -d '{"title":"Review","content":"{{approve:ok|label=Approve?}}"}')
PAGE_ID=$(echo $PAGE | jq -r '.id')
echo "URL: $(echo $PAGE | jq -r '.url')"

# Poll
while true; do
  STATUS=$(curl -s http://localhost:3000/api/pages/$PAGE_ID | jq -r '.status')
  [ "$STATUS" = "responded" ] && break
  sleep 3
done

# Get result
curl -s http://localhost:3000/api/pages/$PAGE_ID | jq '.responses'
```

### Python (using `requests`)

```python
import requests
import time

API = "http://localhost:3000"

# 1. Create page
resp = requests.post(f"{API}/api/pages", json={
    "title": "Deploy Approval",
    "content": "## Deploy v2.3.1\n\n{{approve:deploy|label=Ship it?}}\n\n{{text:notes|placeholder=Comments}}"
})
page = resp.json()
print(f"Human URL: {page['url']}")

# 2. Poll for response
while True:
    status = requests.get(f"{API}/api/pages/{page['id']}").json()
    if status["status"] == "responded":
        break
    time.sleep(3)

# 3. Handle response
responses = status["responses"]
if responses["deploy"] == "approved":
    print("Deploying...")
else:
    print(f"Rejected. Notes: {responses['notes']}")
```

### Node.js (using `fetch`)

```javascript
const API = "http://localhost:3000";

// 1. Create page
const res = await fetch(`${API}/api/pages`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Data Review",
    content: "Review the dataset.\n\n{{approve:data|label=Approve?}}"
  })
});
const page = await res.json();
console.log(`Human URL: ${page.url}`);

// 2. Poll for response
let status;
do {
  await new Promise(r => setTimeout(r, 3000));
  const poll = await fetch(`${API}/api/pages/${page.id}`);
  status = await poll.json();
} while (status.status === "waiting");

// 3. Handle response
console.log(status.responses);
```

## Handling Responses

The `responses` object maps field names (from annotations) to submitted values. The value type depends on the field type:

| Field Type | Response Type | Example |
|------------|--------------|---------|
| `text` | `string` | `"Looks good to me"` |
| `select` | `string` | `"High"` |
| `approve` | `string` | `"approved"`, `"rejected"`, or `""` |
| `checkbox` | `string[]` | `["JavaScript", "Python"]` |

Example response object for a page with multiple field types:

```json
{
  "deploy": "approved",
  "priority": "High",
  "notes": "Please deploy during maintenance window",
  "features": ["Auth", "Logging"]
}
```

## Error Handling

| Scenario | Status | Response | What To Do |
|----------|--------|----------|------------|
| Missing or invalid `content` | `400` | `{"error": "content is required and must be a string"}` | Ensure the request body includes a `content` string and the `Content-Type: application/json` header is set |
| Invalid page ID when polling | `404` | `{"error": "page not found"}` | Verify the page ID. IDs are case-sensitive 10-character strings. |
| Human never responds | — | Status stays `"waiting"` | Implement a polling timeout. After the timeout, treat the page as abandoned and proceed with a fallback action. |

## Context Retrieval

If an agent loses context (e.g., after a context window reset), use `GET /api/pages/:id/full` to retrieve the original page title and content alongside the responses.

## Best Practices

- Use `callback_url` instead of polling when possible — it's more efficient and non-blocking.
- Use descriptive `title` values so humans can identify the page purpose at a glance.
- Use meaningful field names that describe the data being collected (e.g., `deploy_approval` instead of `field1`).
- Keep content concise — humans should be able to respond in under a minute.
- If polling, set a timeout (e.g., 5–10 minutes) — don't poll indefinitely.
- Poll at 2–5 second intervals — more frequent polling adds no benefit.
- Use `approve` fields for binary decisions, `select` for choosing among options.
- Use `multiline=true` for text fields that expect detailed responses.
