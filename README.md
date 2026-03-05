# HITL — Human in the Loop

A lightweight web application that lets AI agents present rich markdown content with inline forms to humans and collect their responses.

## Quick Start

```bash
# npm
git clone https://github.com/Zorro909/hitl.git && cd hitl
npm install && npm start

# Docker
docker run -d -p 3000:3000 -p 3001:3001 -v hitl-data:/app/data ghcr.io/zorro909/hitl:main
```

## How It Works

1. Agent POSTs markdown with form annotations to the API (port 3000)
2. Agent gets back a URL and shares it with the user
3. User opens the URL, sees rendered content with inline forms (port 3001)
4. User fills in fields and submits
5. Agent polls the API for responses

```bash
# Create a page
curl -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy Approval","content":"## Deploy v2.3.1\n\n{{approve:deploy|label=Approve deployment?}}\n\n{{text:notes|placeholder=Any concerns?}}"}'

# Poll for response
curl http://localhost:3000/api/pages/<id>
```

## Field Types

| Type | Syntax | Description |
|------|--------|-------------|
| Text | `{{text:name\|placeholder=...\|multiline=true}}` | Single-line input or textarea |
| Checkbox | `{{checkbox:name\|options=A,B,C}}` | Multi-select checkbox group |
| Select | `{{select:name\|options=A,B,C}}` | Dropdown single-select |
| Approve | `{{approve:name\|label=Approve?}}` | Approve / Reject buttons |

## Documentation

For full documentation including API reference, deployment guide, and integration examples, see the [HITL Documentation Site](https://zorro909.github.io/hitl/).

## License

ISC
