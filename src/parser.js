const { marked } = require('marked');

const ANNOTATION_RE = /\{\{(text|checkbox|approve|select):(\w+)(?:\|([^}]*))?\}\}/g;

function parseParams(paramStr) {
  if (!paramStr) return {};
  const params = {};
  const parts = paramStr.split('|');
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq !== -1) {
      params[part.slice(0, eq)] = part.slice(eq + 1);
    }
  }
  return params;
}

function extractFields(content) {
  const fields = [];
  let match;
  const re = new RegExp(ANNOTATION_RE.source, ANNOTATION_RE.flags);
  while ((match = re.exec(content)) !== null) {
    fields.push({
      type: match[1],
      name: match[2],
      params: parseParams(match[3]),
      raw: match[0],
    });
  }
  return fields;
}

function fieldToHtml(field) {
  const { type, name, params } = field;

  switch (type) {
    case 'text': {
      const ph = params.placeholder || '';
      if (params.multiline === 'true') {
        return `<div class="field-group"><textarea name="${name}" placeholder="${ph}" rows="4"></textarea></div>`;
      }
      return `<div class="field-group"><input type="text" name="${name}" placeholder="${ph}"></div>`;
    }

    case 'checkbox': {
      const options = (params.options || '').split(',').filter(Boolean);
      const checks = options
        .map(
          (opt) =>
            `<label><input type="checkbox" name="${name}" value="${opt}"> ${opt}</label>`
        )
        .join('\n');
      return `<fieldset class="field-group">${checks}</fieldset>`;
    }

    case 'approve': {
      const label = params.label || 'Approve?';
      return `<div class="field-group approve-group">
  <span class="approve-label">${label}</span>
  <input type="hidden" name="${name}" value="">
  <button type="button" class="approve-btn" data-field="${name}" data-value="approved" onclick="setApproval(this)">Approve</button>
  <button type="button" class="reject-btn" data-field="${name}" data-value="rejected" onclick="setApproval(this)">Reject</button>
</div>`;
    }

    case 'select': {
      const options = (params.options || '').split(',').filter(Boolean);
      const opts = options.map((o) => `<option value="${o}">${o}</option>`).join('\n');
      return `<div class="field-group"><select name="${name}"><option value="">-- Select --</option>\n${opts}</select></div>`;
    }

    default:
      return '';
  }
}

function render(content) {
  const fields = extractFields(content);

  // Replace annotations with HTML placeholders
  let cleaned = content;
  for (const field of fields) {
    cleaned = cleaned.replace(field.raw, `<!--field:${field.name}-->`);
  }

  // Render markdown
  let html = marked(cleaned);

  // Replace placeholders with form field HTML
  for (const field of fields) {
    html = html.replace(`<!--field:${field.name}-->`, fieldToHtml(field));
  }

  return { html, fields };
}

module.exports = { extractFields, render };
