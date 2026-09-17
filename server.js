// Burger 2324 — servidor web + API + panel de administración.
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');

const { seedIfEmpty, DATA_DIR } = require('./src/db');
const { sessionMiddleware } = require('./src/auth');
const { router: publicRouter, buildPublicData } = require('./src/routes/public');
const adminRouter = require('./src/routes/admin');

seedIfEmpty();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
// Versión de assets: cambia en cada arranque para que el navegador no use CSS/JS viejos tras una actualización.
const ASSET_V = Date.now().toString(36);

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '300kb' }));
app.use(sessionMiddleware);

// ---------- página pública (HTML con datos y metadatos inyectados para SEO) ----------
const { renderHome: render, versionAssets } = require('./src/render');
const templatePath = path.join(PUBLIC_DIR, 'index.html');
let template = fs.readFileSync(templatePath, 'utf8');
if (process.env.NODE_ENV !== 'production') fs.watchFile(templatePath, { interval: 1000 }, () => { template = fs.readFileSync(templatePath, 'utf8'); });
const renderHome = (req) => render({ template, data: buildPublicData(), origin: SITE_URL || `${req.protocol}://${req.get('host')}`, assetV: ASSET_V });

app.get('/healthz', (req, res) => res.type('text/plain').send('ok'));
app.get('/', (req, res) => { res.set('Cache-Control', 'no-cache'); res.type('html').send(renderHome(req)); });
app.get('/index.html', (req, res) => res.redirect(301, '/'));

app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${SITE_URL || req.protocol + '://' + req.get('host')}/sitemap.xml\n`));
app.get('/sitemap.xml', (req, res) => {
  const origin = SITE_URL || `${req.protocol}://${req.get('host')}`;
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>`);
});

// ---------- API ----------
app.use('/api', publicRouter);
app.use('/api/admin', adminRouter);

// ---------- panel ----------
app.get(['/admin', '/admin/'], (req, res) => { res.set('Cache-Control', 'no-store'); res.type('html').send(versionAssets(fs.readFileSync(path.join(PUBLIC_DIR, 'admin', 'index.html'), 'utf8'), ASSET_V)); });

// ---------- estáticos ----------
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads'), { maxAge: '30d', immutable: true }));
app.use(express.static(PUBLIC_DIR, { maxAge: '7d', index: false, setHeaders: (res, p) => { if (p.endsWith('.html')) res.set('Cache-Control', 'no-cache'); } }));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'No encontrado' });
  res.status(404).type('html').send('<!doctype html><meta charset="utf-8"><title>No encontrado</title><p style="font-family:sans-serif;padding:40px">Página no encontrada. <a href="/">Volver al inicio</a></p>');
});
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  res.status(500).json({ error: 'Error interno' });
});

app.listen(PORT, () => console.log(`Burger 2324 → http://localhost:${PORT}  (panel: http://localhost:${PORT}/admin)`));
