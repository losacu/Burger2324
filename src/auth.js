const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { db, get, run } = require('./db');

// Store de sesiones en SQLite para que el login sobreviva reinicios del servidor.
class SqliteStore extends session.Store {
  get(sid, cb) {
    try {
      const row = get('SELECT data, expires FROM sessions WHERE sid=?', sid);
      if (!row || row.expires < Date.now()) { if (row) run('DELETE FROM sessions WHERE sid=?', sid); return cb(null, null); }
      cb(null, JSON.parse(row.data));
    } catch (e) { cb(e); }
  }
  set(sid, sess, cb) {
    try {
      const expires = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 7 * 864e5;
      run('INSERT INTO sessions(sid,data,expires) VALUES(?,?,?) ON CONFLICT(sid) DO UPDATE SET data=excluded.data, expires=excluded.expires', sid, JSON.stringify(sess), expires);
      cb && cb(null);
    } catch (e) { cb && cb(e); }
  }
  destroy(sid, cb) { try { run('DELETE FROM sessions WHERE sid=?', sid); cb && cb(null); } catch (e) { cb && cb(e); } }
  touch(sid, sess, cb) { this.set(sid, sess, cb); }
}
setInterval(() => { try { run('DELETE FROM sessions WHERE expires < ?', Date.now()); } catch {} }, 6 * 3600e3).unref();

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  let row = get("SELECT value FROM settings WHERE key='_session_secret'");
  if (!row) { const s = crypto.randomBytes(32).toString('hex'); run("INSERT INTO settings(key,value) VALUES('_session_secret',?)", JSON.stringify(s)); return s; }
  return JSON.parse(row.value);
}

const sessionMiddleware = session({
  name: 'b2324.sid',
  secret: secret(),
  store: new SqliteStore(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === '1', maxAge: 7 * 864e5 }
});

// Límite de intentos de login por IP.
const attempts = new Map();
function loginLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const a = attempts.get(ip) || { n: 0, reset: now + 15 * 60e3 };
  if (now > a.reset) { a.n = 0; a.reset = now + 15 * 60e3; }
  if (a.n >= 8) return res.status(429).json({ error: 'Demasiados intentos. Esperá 15 minutos.' });
  req._loginAttempt = a; attempts.set(ip, a);
  next();
}

function login(username, password) {
  const u = get('SELECT * FROM users WHERE username=?', String(username || '').trim().toLowerCase());
  if (!u) { bcrypt.compareSync(String(password || ''), '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345678'); return null; }
  return bcrypt.compareSync(String(password || ''), u.password_hash) ? { id: u.id, username: u.username } : null;
}

function changePassword(userId, current, next) {
  const u = get('SELECT * FROM users WHERE id=?', userId);
  if (!u || !bcrypt.compareSync(String(current || ''), u.password_hash)) return false;
  run('UPDATE users SET password_hash=? WHERE id=?', bcrypt.hashSync(String(next), 10), userId);
  run('DELETE FROM sessions'); // cierra todas las sesiones
  return true;
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'No autorizado' });
}

// Protección CSRF simple: las llamadas de escritura del panel deben venir de fetch() con este header.
function requireJsonHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'fetch') return res.status(403).json({ error: 'Solicitud inválida' });
  next();
}

module.exports = { sessionMiddleware, loginLimiter, login, changePassword, requireAuth, requireJsonHeader };
