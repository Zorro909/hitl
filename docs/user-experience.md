---
layout: default
title: User Experience
nav_order: 7
---

# User Experience

This page describes what a human sees and does when interacting with a HITL page.

## User Journey

1. The human receives a URL — via chat message, email, Slack notification, or any other channel the agent uses to communicate.
2. They open the URL in a browser.
3. They see a rendered Markdown page with interactive form fields (text inputs, checkboxes, dropdowns, approve/reject buttons).
4. They fill out the fields and click **Submit**.
5. They see a **"Thank You"** confirmation page.

That's it. No login, no account, no installation. Just a URL and a form.

## Page Rendering Details

When a human opens a HITL page URL:

- **Markdown content** is rendered to HTML — headings, lists, code blocks, links, and other standard Markdown formatting all work.
- **Annotations** in the Markdown are replaced with interactive form elements inline within the rendered content.
- **Pico CSS** provides clean, minimal styling with no configuration needed.
- The **page title** (set by the agent in the `title` field) appears in the browser tab.

```
┌─────────────────────────────────────────────┐
│  Deploy Approval              (browser tab)  │
├─────────────────────────────────────────────┤
│                                              │
│  Deploy v2.3.1 to production?                │
│                                              │
│  Approve deployment?  [Approve]  [Reject]    │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Any concerns?                          │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [Submit]                                    │
│                                              │
└─────────────────────────────────────────────┘
```

## Form Behavior

- All fields are inside a single `<form>` with a **Submit** button at the bottom.
- **Approve/Reject buttons** use JavaScript to set a hidden field value and visually toggle the selected state. When clicked, the selected button gets a filled background (green for Approve, red for Reject).
- **Checkbox groups** allow multiple selections. Each option is an independent checkbox.
- **Select fields** have a default blank option (`"-- Select --"`). The human must actively choose an option.
- **Text fields** can be single-line inputs or multi-line textareas depending on the `multiline` parameter.

## Submission Flow

1. The human clicks **Submit**.
2. The browser POSTs form data to `/p/:id/submit`.
3. On success, the human sees a **"Thank You"** confirmation page with the message: *"Your responses have been submitted successfully."*
4. Each page can only be submitted **once**.
5. If the human tries to submit again (e.g., by clicking the back button and resubmitting), they see an **"Already Submitted"** page with the message: *"This page has already been submitted. Your previous responses have been recorded."*
6. If the human revisits the original URL after submitting, they see: *"This page has already been submitted."*

## No-JavaScript Behavior

The approve/reject buttons require JavaScript to function. Without JavaScript:

- The hidden input field for approve/reject will remain empty and submit as `""` (empty string).
- All other field types — text, select, and checkbox — work without JavaScript because they use standard HTML form elements.

## Mobile Responsiveness

Pico CSS is responsive by default. HITL pages render correctly on mobile devices with no additional configuration:

- Form fields stack vertically on narrow screens.
- Buttons remain tappable at mobile sizes.
- Text remains readable without horizontal scrolling.
