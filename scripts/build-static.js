// Exportación estática del sitio público (para Netlify Drop, Vercel, GitHub Pages, cualquier hosting de archivos).
// Genera la carpeta dist/ con la carta ACTUAL de la base congelada dentro del HTML.
// En esta versión el carrito y el pedido por WhatsApp funcionan en el navegador; el panel /admin NO existe
// (necesita Node). Para actualizar la carta: editarla en el panel local, volver a correr `npm run build:static` y resubir.
//
// Uso: npm run build:static            → dist/
//      SITE_URL=https://midominio.com npm run build:static   (para que los links de SEO apunten al dominio real)

const fs = require('node:fs');
const path = require('node:path');
const { buildPublicData } = require('../src/routes/public');
const { getSettings, seedIfEmpty, DATA_DIR } = require('../src/db');
const { renderHome } = require('../src/render');

// En un clon limpio (Vercel, CI) la base no existe: se crea desde src/seed-data.js.
seedIfEmpty();

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT = process.env.OUT_DIR || path.join(ROOT, 'dist');
const origin = (process.env.SITE_URL || 'https://burger2324.netlify.app').replace(/\/$/, '');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// datos (con los campos extra que el sitio necesita para calcular todo sin servidor)
const data = buildPublicData();
const all = getSettings();
data.static = true;
data.settings.status_override = all.status_override || 'auto';
data.settings.order_prefix = all.order_prefix || 'B2324';
data.generated_at = new Date().toISOString();

const template = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
const assetV = Date.now().toString(36);
fs.writeFileSync(path.join(OUT, 'index.html'), renderHome({ template, data, origin, assetV }));

// estáticos
for (const dir of ['css', 'js', 'assets']) fs.cpSync(path.join(PUBLIC_DIR, dir), path.join(OUT, dir), { recursive: true });
fs.copyFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), path.join(OUT, 'favicon.svg'));
const uploads = path.join(DATA_DIR, 'uploads');
if (fs.existsSync(uploads)) fs.cpSync(uploads, path.join(OUT, 'uploads'), { recursive: true, filter: (src) => !src.endsWith('.gitkeep') });

fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>\n`);
// cabeceras de caché y seguridad para Netlify
fs.writeFileSync(path.join(OUT, '_headers'), [
  '/*', '  X-Content-Type-Options: nosniff', '  X-Frame-Options: SAMEORIGIN', '  Referrer-Policy: strict-origin-when-cross-origin', '',
  '/assets/*', '  Cache-Control: public, max-age=2592000', '',
  '/uploads/*', '  Cache-Control: public, max-age=2592000', '',
  '/css/*', '  Cache-Control: public, max-age=604800', '',
  '/js/*', '  Cache-Control: public, max-age=604800', ''
].join('\n'));
// /admin no existe en la versión estática: se explica en vez de dar 404.
fs.mkdirSync(path.join(OUT, 'admin'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'admin', 'index.html'), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Panel · Burger 2324</title>
<style>body{margin:0;min-height:100vh;display:grid;place-content:center;background:#09281f;color:#f5eddd;font-family:system-ui,sans-serif;padding:24px;text-align:center}main{max-width:460px;background:#123b2e;padding:32px 28px;border-radius:14px}h1{font-size:22px;margin:0 0 12px}p{line-height:1.5;margin:0 0 14px;color:#c9d6cd}a{color:#e9a74b}</style></head>
<body><main><h1>El panel no está en esta versión</h1><p>Esta dirección publica la <b>versión estática</b> del sitio (solo la carta y los pedidos por WhatsApp). El panel de administración necesita el servidor completo, que se publica en <b>Railway</b> u otro hosting con Node.</p><p>Si ya está publicado ahí, entrá a <code>https://TU-DOMINIO/admin</code> de esa versión. Instrucciones en <code>DEPLOY.md</code>.</p><p><a href="/">← Volver al sitio</a></p></main></body></html>`);
fs.writeFileSync(path.join(OUT, '404.html'), '<!doctype html><html lang="es"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/"><title>Burger 2324</title><a href="/">Volver al inicio</a></html>');

const count = data.categories.reduce((a, c) => a + c.products.length, 0);
console.log(`Sitio estático generado en ${OUT}\n  ${data.categories.length} categorías · ${count} productos · SEO apuntando a ${origin}`);
