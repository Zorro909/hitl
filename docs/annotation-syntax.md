---
layout: default
title: Annotation Syntax
nav_order: 5
---

# Annotation Syntax

Annotations are inline tokens embedded in Markdown content that get replaced with HTML form fields when the page is rendered for the human.

## Syntax Format

```
{{type:name|param=value|param=value}}
```

- **`type`** — the field type: `text`, `checkbox`, `select`, or `approve`
- **`name`** — unique field identifier (alphanumeric + underscore). Used as the HTML form field `name` attribute and as the key in the responses object.
- **Parameters** — pipe-delimited `key=value` pairs, specific to each field type

### Regex Pattern

The parser uses this regex to extract annotations:

```
\{\{(text|checkbox|approve|select):(\w+)(?:\|([^}]*))?\}\}
```

---

## Field Types

### `text` — Text Input

**Syntax**: `{{text:fieldname}}` or `{{text:fieldname|placeholder=Enter text...|multiline=true}}`

**Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `placeholder` | string | `""` | Placeholder text shown in the input |
| `multiline` | string | `"false"` | If `"true"`, renders as `<textarea>` (4 rows) instead of `<input>` |

**Renders as**:

- `multiline=false` (default): `<input type="text">` in a `.field-group` div
- `multiline=true`: `<textarea rows="4">` in a `.field-group` div

**Response format**: String. The text the human entered, or `""` if left empty.

**Examples**:

```markdown
{{text:username|placeholder=Your name}}
{{text:feedback|placeholder=Detailed feedback...|multiline=true}}
```

**Visual rendering**:

```
┌──────────────────────────────────┐
│ Your name                        │  ← single-line input
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Detailed feedback...             │  ← multiline textarea
│                                  │
│                                  │
│                                  │
└──────────────────────────────────┘
```

**Edge cases**:

- If `placeholder` is omitted, the input renders with no placeholder text.
- If `multiline` is any value other than `"true"`, the field renders as a single-line input (the parameter is string-compared, not boolean-parsed).
- Empty text submission returns `""` (empty string), not `null`.

---

### `checkbox` — Checkbox Group

**Syntax**: `{{checkbox:fieldname|options=Opt1,Opt2,Opt3}}`

**Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options` | string | `""` | Comma-separated list of checkbox labels/values |

**Renders as**: A `<fieldset>` containing one `<label><input type="checkbox"></label>` per option.

**Response format**: Array of strings — the values of checked options. Empty array `[]` if none selected.

**Examples**:

```markdown
{{checkbox:languages|options=JavaScript,Python,Go,Rust}}
{{checkbox:features|options=Auth,Logging,Monitoring}}
```

**Visual rendering**:

```
┌─────────────────────────────┐
│ ☐ JavaScript                │
│ ☐ Python                    │
│ ☐ Go                        │
│ ☐ Rust                      │
└─────────────────────────────┘
```

**Edge cases**:

- If `options` is empty or omitted, the fieldset renders empty (no checkboxes).
- Option values cannot contain commas (commas are the delimiter).

---

### `select` — Dropdown Select

**Syntax**: `{{select:fieldname|options=Opt1,Opt2,Opt3}}`

**Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options` | string | `""` | Comma-separated list of option labels/values |

**Renders as**: A `<select>` element with a blank `"-- Select --"` default option, followed by one `<option>` per listed value.

**Response format**: String — the selected option value, or `""` if the default "-- Select --" was left selected.

**Examples**:

```markdown
{{select:priority|options=Low,Medium,High,Critical}}
{{select:environment|options=staging,production}}
```

**Visual rendering**:

```
┌──────────────────────────────┐
│ -- Select --             ▼   │
├──────────────────────────────┤
│   Low                        │
│   Medium                     │
│   High                       │
│   Critical                   │
└──────────────────────────────┘
```

**Edge cases**:

- If `options` is empty or omitted, only the blank default option renders.
- Option values cannot contain commas.

---

### `approve` — Approve / Reject Buttons

**Syntax**: `{{approve:fieldname}}` or `{{approve:fieldname|label=Custom label}}`

**Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | string | `"Approve?"` | Text label displayed before the Approve/Reject buttons |

**Renders as**: A div with classes `field-group` and `approve-group` containing the label text, a hidden input, and two styled buttons (green "Approve" / red "Reject"). Clicking a button sets the hidden input's value via JavaScript (`setApproval()`).

**Response format**: String — `"approved"`, `"rejected"`, or `""` (if neither button was clicked before form submission).

**Examples**:

```markdown
{{approve:deploy|label=Approve deployment to production?}}
{{approve:pr_review}}
```

**Visual rendering**:

```
Approve deployment to production?   [Approve]  [Reject]
                                     (green)    (red)
```

When a button is clicked, it gets a `.selected` class (filled background).

**Edge cases**:

- If the user submits without clicking either button, the response value is `""` (empty string).
- Only the last clicked button's value is stored (clicking Approve then Reject results in `"rejected"`).

---

## Mixing Annotations with Markdown

Annotations can be placed inline within any Markdown content. The surrounding Markdown is rendered normally — headings, lists, code blocks, and links all work alongside annotation fields.

```markdown
# Deployment Review

The following changes will be deployed:
- Added user authentication
- Fixed payment processing bug

{{approve:deploy|label=Approve this deployment?}}

## Additional Notes

{{text:notes|placeholder=Any concerns or questions?|multiline=true}}

## Priority

{{select:priority|options=Normal,Urgent,Can Wait}}
```

## How Parsing Works

1. Annotations are extracted from the raw content via regex.
2. Each annotation is replaced with an HTML comment placeholder (`<!--field:name-->`).
3. The content is rendered through `marked` (Markdown → HTML).
4. The HTML comment placeholders are replaced with the corresponding form field HTML.

This two-pass approach ensures Markdown formatting applies to the surrounding content without interfering with form elements. The Markdown parser never sees the annotation syntax, and the form HTML is never processed by the Markdown parser.
