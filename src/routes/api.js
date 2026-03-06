const express = require('express');
const { nanoid } = require('nanoid');
const { createPage, getPage } = require('../db');

const router = express.Router();

router.post('/api/pages', express.json(), (req, res) => {
  const { content, title, callback_url } = req.body || {};
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required and must be a string' });
  }

  if (callback_url != null) {
    if (typeof callback_url !== 'string' || !/^https?:\/\/.+/.test(callback_url)) {
      return res.status(400).json({ error: 'callback_url must be a valid HTTP or HTTPS URL' });
    }
  }

  const id = nanoid(10);
  createPage(id, title, content, callback_url);

  const baseUrl = process.env.USER_BASE_URL || 'http://localhost:3001';
  res.status(201).json({
    id,
    url: `${baseUrl}/p/${id}`,
    status: 'waiting',
  });
});

router.get('/api/pages/:id', (req, res) => {
  const page = getPage(req.params.id);
  if (!page) {
    return res.status(404).json({ error: 'page not found' });
  }

  res.json({
    id: page.id,
    status: page.status,
    responses: page.responses ? JSON.parse(page.responses) : null,
    created_at: page.created_at,
    responded_at: page.responded_at,
  });
});

router.get('/api/pages/:id/full', (req, res) => {
  const page = getPage(req.params.id);
  if (!page) {
    return res.status(404).json({ error: 'page not found' });
  }

  res.json({
    id: page.id,
    title: page.title,
    content: page.content,
    status: page.status,
    responses: page.responses ? JSON.parse(page.responses) : null,
    created_at: page.created_at,
    responded_at: page.responded_at,
  });
});

module.exports = router;
