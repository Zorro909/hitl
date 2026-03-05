const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'hitl.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'waiting',
    responses TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    responded_at TEXT
  )
`);

function createPage(id, title, content) {
  const stmt = db.prepare('INSERT INTO pages (id, title, content) VALUES (?, ?, ?)');
  stmt.run(id, title || null, content);
  return getPage(id);
}

function getPage(id) {
  return db.prepare('SELECT * FROM pages WHERE id = ?').get(id);
}

function saveResponses(id, responses) {
  const stmt = db.prepare(
    "UPDATE pages SET responses = ?, status = 'responded', responded_at = datetime('now') WHERE id = ?"
  );
  stmt.run(JSON.stringify(responses), id);
  return getPage(id);
}

module.exports = { createPage, getPage, saveResponses };
