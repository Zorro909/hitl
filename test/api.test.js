const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const request = require('supertest');
const { apiApp, userApp } = require('../server');

describe('API Server', () => {
  let pageId;

  it('POST /api/pages creates a page', async () => {
    const res = await request(apiApp)
      .post('/api/pages')
      .send({
        title: 'Test Page',
        content: '# Hello\n\n{{approve:ok|label=Approve?}}\n\n{{text:notes|placeholder=Notes}}'
      })
      .expect(201);

    assert.ok(res.body.id);
    assert.ok(res.body.url);
    assert.strictEqual(res.body.status, 'waiting');
    pageId = res.body.id;
  });

  it('GET /api/pages/:id returns waiting status', async () => {
    const res = await request(apiApp)
      .get(`/api/pages/${pageId}`)
      .expect(200);

    assert.strictEqual(res.body.id, pageId);
    assert.strictEqual(res.body.status, 'waiting');
    assert.strictEqual(res.body.responses, null);
  });

  it('GET /api/pages/:id returns 404 for unknown id', async () => {
    await request(apiApp)
      .get('/api/pages/nonexistent')
      .expect(404);
  });

  it('POST /api/pages rejects missing content', async () => {
    await request(apiApp)
      .post('/api/pages')
      .send({ title: 'No content' })
      .expect(400);
  });
});

describe('User Server', () => {
  let pageId;

  before(async () => {
    const res = await request(apiApp)
      .post('/api/pages')
      .send({
        title: 'Form Test',
        content: '# Form\n\n{{approve:decision|label=OK?}}\n\n{{select:color|options=Red,Blue}}\n\n{{text:feedback|placeholder=...|multiline=true}}\n\n{{checkbox:features|options=A,B,C}}'
      });
    pageId = res.body.id;
  });

  it('GET /p/:id renders the page', async () => {
    const res = await request(userApp)
      .get(`/p/${pageId}`)
      .expect(200);

    assert.ok(res.text.includes('<form'));
    assert.ok(res.text.includes('name="decision"'));
    assert.ok(res.text.includes('name="color"'));
    assert.ok(res.text.includes('name="feedback"'));
    assert.ok(res.text.includes('name="features"'));
  });

  it('GET /p/:id returns 404 for unknown id', async () => {
    await request(userApp)
      .get('/p/nonexistent')
      .expect(404);
  });

  it('POST /p/:id/submit saves responses', async () => {
    await request(userApp)
      .post(`/p/${pageId}/submit`)
      .type('form')
      .send({ decision: 'approved', color: 'Blue', feedback: 'Great', features: ['A', 'C'] })
      .expect(200);

    // Verify via API
    const res = await request(apiApp)
      .get(`/api/pages/${pageId}`)
      .expect(200);

    assert.strictEqual(res.body.status, 'responded');
    assert.strictEqual(res.body.responses.decision, 'approved');
    assert.strictEqual(res.body.responses.color, 'Blue');
    assert.strictEqual(res.body.responses.feedback, 'Great');
    assert.deepStrictEqual(res.body.responses.features, ['A', 'C']);
  });

  it('POST /p/:id/submit rejects already responded page', async () => {
    const res = await request(userApp)
      .post(`/p/${pageId}/submit`)
      .type('form')
      .send({ decision: 'rejected' })
      .expect(200);

    assert.ok(res.text.includes('already'));
  });
});

// --- Callback URL ---

describe('Callback URL', () => {
  it('POST /api/pages accepts callback_url', async () => {
    const res = await request(apiApp)
      .post('/api/pages')
      .send({
        title: 'Callback Test',
        content: '# Test\n\n{{approve:ok|label=OK?}}',
        callback_url: 'http://localhost:9999/callback'
      })
      .expect(201);

    assert.ok(res.body.id);
    assert.strictEqual(res.body.status, 'waiting');
  });

  it('POST /api/pages rejects invalid callback_url', async () => {
    await request(apiApp)
      .post('/api/pages')
      .send({
        content: '# Test',
        callback_url: 'ftp://invalid'
      })
      .expect(400);
  });

  it('POST /api/pages rejects non-string callback_url', async () => {
    await request(apiApp)
      .post('/api/pages')
      .send({
        content: '# Test',
        callback_url: 12345
      })
      .expect(400);
  });

  it('POST /api/pages works without callback_url', async () => {
    const res = await request(apiApp)
      .post('/api/pages')
      .send({ content: '# No callback' })
      .expect(201);

    assert.ok(res.body.id);
  });

  it('fires callback on form submission', async () => {
    // Start a mock HTTP server to receive the callback
    let receivedBody = null;
    const callbackServer = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        receivedBody = JSON.parse(Buffer.concat(chunks).toString());
        res.writeHead(200);
        res.end();
      });
    });

    await new Promise((resolve) => callbackServer.listen(0, resolve));
    const port = callbackServer.address().port;

    try {
      // Create page with callback
      const createRes = await request(apiApp)
        .post('/api/pages')
        .send({
          title: 'Callback Fire Test',
          content: '{{approve:decision|label=OK?}}',
          callback_url: `http://localhost:${port}/callback`
        })
        .expect(201);

      const pageId = createRes.body.id;

      // Submit the form
      await request(userApp)
        .post(`/p/${pageId}/submit`)
        .type('form')
        .send({ decision: 'approved' })
        .expect(200);

      // Wait briefly for the async callback to arrive
      await new Promise((resolve) => setTimeout(resolve, 200));

      assert.ok(receivedBody, 'Callback was not received');
      assert.strictEqual(receivedBody.id, pageId);
      assert.strictEqual(receivedBody.status, 'responded');
      assert.strictEqual(receivedBody.responses.decision, 'approved');
      assert.ok(receivedBody.responded_at);
    } finally {
      callbackServer.close();
    }
  });

  it('submission succeeds even when callback fails', async () => {
    // Create page with callback URL that will refuse connections
    const createRes = await request(apiApp)
      .post('/api/pages')
      .send({
        title: 'Failing Callback',
        content: '{{text:note|placeholder=...}}',
        callback_url: 'http://localhost:1/unreachable'
      })
      .expect(201);

    const pageId = createRes.body.id;

    // Submit — should succeed despite callback failure
    await request(userApp)
      .post(`/p/${pageId}/submit`)
      .type('form')
      .send({ note: 'hello' })
      .expect(200);

    // Verify response was saved
    const res = await request(apiApp)
      .get(`/api/pages/${pageId}`)
      .expect(200);

    assert.strictEqual(res.body.status, 'responded');
    assert.strictEqual(res.body.responses.note, 'hello');
  });

  it('double-submit does not re-fire callback', async () => {
    let callbackCount = 0;
    const callbackServer = http.createServer((req, res) => {
      callbackCount++;
      req.resume();
      req.on('end', () => { res.writeHead(200); res.end(); });
    });

    await new Promise((resolve) => callbackServer.listen(0, resolve));
    const port = callbackServer.address().port;

    try {
      const createRes = await request(apiApp)
        .post('/api/pages')
        .send({
          content: '{{approve:ok|label=OK?}}',
          callback_url: `http://localhost:${port}/callback`
        })
        .expect(201);

      const pageId = createRes.body.id;

      // First submit
      await request(userApp)
        .post(`/p/${pageId}/submit`)
        .type('form')
        .send({ ok: 'approved' })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Second submit (double-submit)
      await request(userApp)
        .post(`/p/${pageId}/submit`)
        .type('form')
        .send({ ok: 'rejected' })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 200));

      assert.strictEqual(callbackCount, 1, 'Callback should only fire once');
    } finally {
      callbackServer.close();
    }
  });
});

// --- Full endpoint ---

describe('GET /api/pages/:id/full', () => {
  let pageId;

  before(async () => {
    const res = await request(apiApp)
      .post('/api/pages')
      .send({
        title: 'Full Page Test',
        content: '# Content\n\n{{text:name|placeholder=Name}}',
        callback_url: 'http://localhost:9999/cb'
      });
    pageId = res.body.id;
  });

  it('returns full page data including title and content', async () => {
    const res = await request(apiApp)
      .get(`/api/pages/${pageId}/full`)
      .expect(200);

    assert.strictEqual(res.body.id, pageId);
    assert.strictEqual(res.body.title, 'Full Page Test');
    assert.ok(res.body.content.includes('{{text:name'));
    assert.strictEqual(res.body.status, 'waiting');
    assert.strictEqual(res.body.responses, null);
    assert.ok(res.body.created_at);
  });

  it('returns 404 for unknown page', async () => {
    await request(apiApp)
      .get('/api/pages/nonexistent/full')
      .expect(404);
  });

  it('existing GET /api/pages/:id does not include content', async () => {
    const res = await request(apiApp)
      .get(`/api/pages/${pageId}`)
      .expect(200);

    assert.strictEqual(res.body.content, undefined);
  });
});

describe('Parser', () => {
  const { extractFields, render } = require('../src/parser');

  it('extracts fields from content', () => {
    const fields = extractFields('{{text:name|placeholder=hi}} and {{approve:ok|label=OK?}}');
    assert.strictEqual(fields.length, 2);
    assert.strictEqual(fields[0].type, 'text');
    assert.strictEqual(fields[0].name, 'name');
    assert.strictEqual(fields[1].type, 'approve');
  });

  it('renders markdown with form fields', () => {
    const { html, fields } = render('# Title\n\n{{select:pick|options=A,B}}');
    assert.ok(html.includes('<h1>'));
    assert.ok(html.includes('<select'));
    assert.ok(html.includes('value="A"'));
    assert.strictEqual(fields.length, 1);
  });

  it('handles content with no annotations', () => {
    const { html, fields } = render('# Just markdown\n\nNo forms here.');
    assert.ok(html.includes('Just markdown'));
    assert.strictEqual(fields.length, 0);
  });
});
