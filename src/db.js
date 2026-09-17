// Capa de datos: SQLite nativo de Node (node:sqlite), sin dependencias nativas.
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'burger2324.sqlite'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  layout TEXT NOT NULL DEFAULT 'compact',
  position INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  variants TEXT NOT NULL DEFAULT '[]',
  badge TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  available INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id, position);
CREATE TABLE IF NOT EXISTS promos (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT,
  ends_at TEXT
);
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY,
  image TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  customer_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'takeaway',
  address TEXT NOT NULL DEFAULT '',
  payment TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'nuevo'
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
`);

// ---------- migraciones (columnas agregadas después de la primera versión) ----------
const productCols = db.prepare('PRAGMA table_info(products)').all().map((c) => c.name);
if (!productCols.includes('cash_only')) db.exec('ALTER TABLE products ADD COLUMN cash_only INTEGER NOT NULL DEFAULT 0');

// ---------- helpers ----------
const all = (sql, ...params) => db.prepare(sql).all(...params);
const get = (sql, ...params) => db.prepare(sql).get(...params);
const run = (sql, ...params) => db.prepare(sql).run(...params);

function safeJson(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }
const parseProduct = (p) => p && ({ ...p, variants: safeJson(p.variants, []) });

let txDepth = 0;
function transaction(fn) {
  if (txDepth > 0) return fn(); // ya estamos dentro de una transacción: se reutiliza
  txDepth++;
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
  finally { txDepth--; }
}

// ---------- settings ----------
function getSettings() {
  const out = {};
  for (const row of all('SELECT key, value FROM settings')) {
    if (row.key.startsWith('_')) continue;
    out[row.key] = safeJson(row.value, row.value);
  }
  return out;
}
function setSettings(obj) {
  const stmt = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  transaction(() => { for (const [k, v] of Object.entries(obj)) stmt.run(k, JSON.stringify(v)); });
}

// ---------- seed ----------
function seedIfEmpty() {
  const seed = require('./seed-data');
  if (get("SELECT COUNT(*) AS n FROM settings WHERE key NOT LIKE '\\_%' ESCAPE '\\'").n === 0) setSettings(seed.settings);
  if (get('SELECT COUNT(*) AS n FROM categories').n === 0) {
    transaction(() => {
      seed.categories.forEach((c, ci) => {
        const r = run('INSERT INTO categories(name,slug,tagline,description,layout,position,active) VALUES(?,?,?,?,?,?,?)',
          c.name, c.slug, c.tagline || '', c.description || '', c.layout || 'compact', ci, c.active === 0 ? 0 : 1);
        c.products.forEach((p, pi) => {
          run('INSERT INTO products(category_id,name,subtitle,description,image,variants,badge,position,featured,cash_only,active,available) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
            r.lastInsertRowid, p.name, p.subtitle || '', p.description || '', p.image || '', JSON.stringify(p.variants), p.badge || '', pi, p.featured ? 1 : 0, p.cash_only ? 1 : 0,
            p.active === 0 || p.active === false ? 0 : 1, p.available === 0 || p.available === false ? 0 : 1);
        });
      });
      (seed.gallery || []).forEach((g, i) => run('INSERT INTO gallery(image,caption,position,active) VALUES(?,?,?,?)', g.image, g.caption || '', i, g.active === 0 ? 0 : 1));
      (seed.promos || []).forEach((p, i) => run('INSERT INTO promos(title,description,image,position,active,starts_at,ends_at) VALUES(?,?,?,?,?,?,?)', p.title, p.description || '', p.image || '', i, p.active === 0 ? 0 : 1, p.starts_at || null, p.ends_at || null));
    });
  }
  if (get('SELECT COUNT(*) AS n FROM users').n === 0) {
    const user = (process.env.ADMIN_USER || 'admin').toLowerCase();
    const pass = process.env.ADMIN_PASSWORD || 'burger2324';
    run('INSERT INTO users(username,password_hash) VALUES(?,?)', user, bcrypt.hashSync(pass, 10));
    console.log(`[db] Usuario admin creado: ${user} / ${pass}  -> cambiá la contraseña desde el panel.`);
  }
}

// ---------- menu (público) ----------
function getPublicMenu() {
  const cats = all('SELECT * FROM categories WHERE active=1 ORDER BY position, id');
  const prods = all('SELECT * FROM products WHERE active=1 ORDER BY category_id, position, id').map(parseProduct);
  const byCat = new Map(cats.map((c) => [c.id, { ...c, products: [] }]));
  for (const p of prods) byCat.get(p.category_id)?.products.push(p);
  const featured = prods.find((p) => p.featured && p.available) || null;
  const now = new Date().toISOString().slice(0, 10);
  const promos = all('SELECT * FROM promos WHERE active=1 ORDER BY position, id')
    .filter((p) => (!p.starts_at || p.starts_at <= now) && (!p.ends_at || p.ends_at >= now));
  const gallery = all('SELECT * FROM gallery WHERE active=1 ORDER BY position, id');
  return { categories: [...byCat.values()].filter((c) => c.products.length), featured, promos, gallery };
}

module.exports = { db, all, get, run, transaction, safeJson, parseProduct, getSettings, setSettings, seedIfEmpty, getPublicMenu, DATA_DIR };
