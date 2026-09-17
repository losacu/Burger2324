// Reemplaza la carta, la configuración, las promos y la galería de la base local con un backup JSON
// descargado desde el panel (Cuenta → Descargar backup). No toca usuarios ni pedidos.
//
// Uso: npm run import-backup                 (lee data/import.json)
//      npm run import-backup -- ruta/al/backup.json

const fs = require('node:fs');
const path = require('node:path');
const { run, get, transaction, setSettings, DATA_DIR } = require('../src/db');

const file = process.argv[2] || path.join(DATA_DIR, 'import.json');
if (!fs.existsSync(file)) { console.error('No se encontró el archivo', file); process.exit(1); }
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!b.categories || !b.products) { console.error('El archivo no parece un backup del panel.'); process.exit(1); }

transaction(() => {
  run('DELETE FROM products'); run('DELETE FROM categories'); run('DELETE FROM gallery'); run('DELETE FROM promos');
  if (b.settings) setSettings(b.settings);
  const idMap = new Map();
  for (const c of b.categories) {
    const r = run('INSERT INTO categories(name,slug,tagline,description,layout,position,active) VALUES(?,?,?,?,?,?,?)',
      c.name, c.slug, c.tagline || '', c.description || '', c.layout || 'compact', c.position || 0, c.active ?? 1);
    idMap.set(c.id, Number(r.lastInsertRowid));
  }
  for (const p of b.products) {
    const cid = idMap.get(p.category_id);
    if (!cid) continue;
    run('INSERT INTO products(category_id,name,subtitle,description,image,variants,badge,position,active,available,featured,cash_only) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      cid, p.name, p.subtitle || '', p.description || '', p.image || '', JSON.stringify(p.variants || []), p.badge || '', p.position || 0, p.active ?? 1, p.available ?? 1, p.featured ?? 0, p.cash_only ?? 0);
  }
  for (const g of b.gallery || []) run('INSERT INTO gallery(image,caption,position,active) VALUES(?,?,?,?)', g.image, g.caption || '', g.position || 0, g.active ?? 1);
  for (const p of b.promos || []) run('INSERT INTO promos(title,description,image,position,active,starts_at,ends_at) VALUES(?,?,?,?,?,?,?)', p.title, p.description || '', p.image || '', p.position || 0, p.active ?? 1, p.starts_at || null, p.ends_at || null);
});
console.log(`Importado: ${b.categories.length} categorías, ${b.products.length} productos, ${(b.gallery || []).length} fotos, ${(b.promos || []).length} promos.`);
console.log('Ahora podés correr `npm run build:static` o `npm run export-seed`.');
if (b.products.some((p) => String(p.image || '').startsWith('/uploads/'))) console.log('Aviso: hay fotos en /uploads/ que deberías copiar desde el servidor a data/uploads/ (o correr export-seed en el servidor).');
