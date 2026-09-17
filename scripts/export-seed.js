// Exporta la carta y la configuración actuales de la base a src/seed-data.js.
// Sirve para que la versión estática (Vercel) y cualquier instalación nueva arranquen con la carta editada en el panel.
// Las fotos subidas desde el panel (/uploads/...) se copian a public/assets/ para que viajen con el repositorio.
//
// Uso: npm run export-seed

const fs = require('node:fs');
const path = require('node:path');
const { all, getSettings, parseProduct, DATA_DIR } = require('../src/db');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'public', 'assets');

function portableImage(img) {
  if (!img || !img.startsWith('/uploads/')) return img || '';
  const file = img.slice('/uploads/'.length);
  const src = path.join(DATA_DIR, 'uploads', file);
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(ASSETS, file)); return '/assets/' + file; }
  console.warn('  (aviso) no se encontró la imagen', img);
  return img;
}

const settings = getSettings();
settings.hero_image = portableImage(settings.hero_image);
settings.about_images = (settings.about_images || []).map(portableImage);

const categories = all('SELECT * FROM categories ORDER BY position, id').map((c) => ({
  name: c.name, slug: c.slug, tagline: c.tagline, layout: c.layout, description: c.description, active: c.active,
  products: all('SELECT * FROM products WHERE category_id=? ORDER BY position, id', c.id).map(parseProduct).map((p) => ({
    name: p.name, subtitle: p.subtitle, description: p.description, image: portableImage(p.image), variants: p.variants,
    badge: p.badge, featured: p.featured, cash_only: p.cash_only, active: p.active, available: p.available
  }))
}));
const gallery = all('SELECT * FROM gallery ORDER BY position, id').map((g) => ({ image: portableImage(g.image), caption: g.caption, active: g.active }));
const promos = all('SELECT * FROM promos ORDER BY position, id').map((p) => ({ title: p.title, description: p.description, image: portableImage(p.image), active: p.active, starts_at: p.starts_at, ends_at: p.ends_at }));

const js = `// Datos iniciales de Burger 2324. Generado con \`npm run export-seed\` el ${new Date().toISOString().slice(0, 16).replace('T', ' ')}.
// Se cargan una sola vez cuando la base de datos está vacía. Después todo se edita desde el panel.

const settings = ${JSON.stringify(settings, null, 2)};

const categories = ${JSON.stringify(categories, null, 2)};

const gallery = ${JSON.stringify(gallery, null, 2)};

const promos = ${JSON.stringify(promos, null, 2)};

module.exports = { settings, categories, gallery, promos };
`;
fs.writeFileSync(path.join(ROOT, 'src', 'seed-data.js'), js);
const n = categories.reduce((a, c) => a + c.products.length, 0);
console.log(`src/seed-data.js actualizado: ${categories.length} categorías, ${n} productos, ${gallery.length} fotos de galería, ${promos.length} promos.`);
