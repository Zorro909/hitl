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
    callback_url TEXT,
    status TEXT DEFAULT 'waiting',
    responses TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    responded_at TEXT
  )
`);

// Migration: add callback_url column to existing databases
try {
  db.exec('ALTER TABLE pages ADD COLUMN callback_url TEXT');
} catch (e) {
  // Column already exists — ignore
}

function createPage(id, title, content, callbackUrl) {
  const stmt = db.prepare('INSERT INTO pages (id, title, content, callback_url) VALUES (?, ?, ?, ?)');
  stmt.run(id, title || null, content, callbackUrl || null);
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
