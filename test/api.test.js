const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
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
