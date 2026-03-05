const express = require('express');
const { getPage, saveResponses } = require('../db');
const { render, extractFields } = require('../parser');

const router = express.Router();

router.get('/p/:id', (req, res) => {
  const page = getPage(req.params.id);
  if (!page) {
    return res.status(404).send('Page not found');
  }

  const { html, fields } = render(page.content);
  res.render('page', {
    title: page.title || 'HITL Page',
    html,
    fields,
    pageId: page.id,
    status: page.status,
  });
});

router.post('/p/:id/submit', express.urlencoded({ extended: true }), (req, res) => {
  const page = getPage(req.params.id);
  if (!page) {
    return res.status(404).send('Page not found');
  }

  if (page.status === 'responded') {
    return res.render('submitted', { title: page.title || 'HITL Page', alreadySubmitted: true });
  }

  const fields = extractFields(page.content);
  const responses = {};

  for (const field of fields) {
    const val = req.body[field.name];
    if (field.type === 'checkbox') {
      // Checkboxes come as array or single value
      responses[field.name] = Array.isArray(val) ? val : val ? [val] : [];
    } else {
      responses[field.name] = val || '';
    }
  }

  saveResponses(page.id, responses);
  res.render('submitted', { title: page.title || 'HITL Page', alreadySubmitted: false });
});

module.exports = router;
