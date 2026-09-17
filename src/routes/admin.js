const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const multer = require('multer');
const { all, get, run, transaction, parseProduct, getSettings, setSettings, DATA_DIR } = require('../db');
const { computeStatus } = require('../status');
const auth = require('../auth');

const router = express.Router();
router.use(auth.requireJsonHeader);

// ---------- helpers ----------
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const int = (v, d = 0) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : d; };
const bool = (v) => (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0;
const slugify = (s) => str(s, 80).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'cat';
const notFound = (res) => res.status(404).json({ error: 'No encontrado' });

function parseVariants(v) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 8).map((x) => ({ label: str(x.label, 30).toUpperCase(), price: Math.max(0, int(x.price)) })).filter((x) => x.price > 0 || x.label);
}

function reorder(table, ids) {
  if (!Array.isArray(ids)) return;
  transaction(() => ids.forEach((id, i) => run(`UPDATE ${table} SET position=? WHERE id=?`, i, int(id))));
}

// ---------- auth ----------
router.post('/login', auth.loginLimiter, (req, res) => {
  const user = auth.login(req.body?.username, req.body?.password);
  if (!user) { req._loginAttempt.n++; return res.status(401).json({ error: 'Usuario o contraseña incorrectos' }); }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Error de sesión' });
    req.session.user = user;
    res.json({ user });
  });
});
router.post('/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
router.get('/me', (req, res) => res.json({ user: req.session?.user || null }));

// Todo lo que sigue requiere login
router.use(auth.requireAuth);

router.put('/password', (req, res) => {
  const { current, next } = req.body || {};
  if (!next || String(next).length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
  if (!auth.changePassword(req.session.user.id, current, next)) return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
  req.session.destroy(() => res.json({ ok: true }));
});

// ---------- dashboard ----------
router.get('/dashboard', (req, res) => {
  const settings = getSettings();
  const today = get("SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS total FROM orders WHERE date(created_at)=date('now','localtime') AND status!='cancelado'");
  const week = get("SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS total FROM orders WHERE created_at >= datetime('now','localtime','-7 days') AND status!='cancelado'");
  const pending = get("SELECT COUNT(*) AS n FROM orders WHERE status='nuevo'").n;
  const products = get('SELECT COUNT(*) AS n, SUM(CASE WHEN available=0 THEN 1 ELSE 0 END) AS soldout, SUM(CASE WHEN active=0 THEN 1 ELSE 0 END) AS hidden FROM products');
  const top = all(`SELECT items FROM orders WHERE created_at >= datetime('now','localtime','-30 days') AND status!='cancelado'`)
    .flatMap((o) => { try { return JSON.parse(o.items); } catch { return []; } })
    .reduce((m, it) => { m[it.name] = (m[it.name] || 0) + it.qty; return m; }, {});
  const topProducts = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));
  res.json({ status: computeStatus(settings), status_override: settings.status_override || 'auto', announcement: settings.announcement, today, week, pending, products, topProducts });
});

// ---------- settings ----------
router.get('/settings', (req, res) => res.json(getSettings()));
router.put('/settings', (req, res) => {
  const b = req.body || {};
  const out = {};
  const S = (k, max = 500) => { if (k in b) out[k] = str(b[k], max); };
  ['brand_name', 'meta_title', 'eyebrow', 'hero_title', 'hero_title_em', 'hero_text', 'hero_image', 'whatsapp', 'phone_display', 'instagram', 'address', 'city',
    'maps_url', 'hours_label', 'closed_message', 'about_title', 'about_title_em', 'featured_eyebrow', 'featured_title', 'featured_title_em', 'footer_text', 'order_prefix'].forEach((k) => S(k, 300));
  S('meta_description', 320); S('about_text', 3000); S('maps_embed', 2000);
  if ('whatsapp' in out) out.whatsapp = out.whatsapp.replace(/\D/g, '');
  if ('instagram' in out) out.instagram = out.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
  if ('status_override' in b) out.status_override = ['auto', 'open', 'closed'].includes(b.status_override) ? b.status_override : 'auto';
  if ('accept_orders_when_closed' in b) out.accept_orders_when_closed = !!bool(b.accept_orders_when_closed);
  if (b.hours && typeof b.hours === 'object') {
    out.hours = {};
    for (const d of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
      const h = b.hours[d] || {};
      out.hours[d] = { open: !!bool(h.open), from: /^\d{1,2}:\d{2}$/.test(h.from) ? h.from : '19:30', to: /^\d{1,2}:\d{2}$/.test(h.to) ? h.to : '23:30' };
    }
  }
  if (b.announcement && typeof b.announcement === 'object') out.announcement = { active: !!bool(b.announcement.active), text: str(b.announcement.text, 200) };
  if (b.delivery && typeof b.delivery === 'object') {
    const d = b.delivery;
    out.delivery = { enabled: !!bool(d.enabled), fee: Math.max(0, int(d.fee)), min_order: Math.max(0, int(d.min_order)), free_from: Math.max(0, int(d.free_from)), eta: str(d.eta, 40), zones: str(d.zones, 400) };
  }
  if (b.takeaway && typeof b.takeaway === 'object') out.takeaway = { enabled: !!bool(b.takeaway.enabled), eta: str(b.takeaway.eta, 40) };
  if (Array.isArray(b.payments)) out.payments = b.payments.map((p) => str(p, 40)).filter(Boolean).slice(0, 8);
  if (Array.isArray(b.about_images)) out.about_images = b.about_images.map((p) => str(p, 300)).filter(Boolean).slice(0, 3);
  setSettings(out);
  res.json(getSettings());
});

// ---------- categorías ----------
router.get('/categories', (req, res) => {
  res.json(all('SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS product_count FROM categories c ORDER BY position, id'));
});
router.post('/categories', (req, res) => {
  const b = req.body || {};
  if (!str(b.name)) return res.status(400).json({ error: 'Falta el nombre' });
  let slug = slugify(b.slug || b.name);
  while (get('SELECT 1 FROM categories WHERE slug=?', slug)) slug += '-2';
  const pos = (get('SELECT COALESCE(MAX(position),-1)+1 AS p FROM categories')).p;
  const r = run('INSERT INTO categories(name,slug,tagline,description,layout,position,active) VALUES(?,?,?,?,?,?,?)',
    str(b.name, 80), slug, str(b.tagline, 80), str(b.description, 300), b.layout === 'burger' ? 'burger' : 'compact', pos, 'active' in b ? bool(b.active) : 1);
  res.status(201).json(get('SELECT * FROM categories WHERE id=?', r.lastInsertRowid));
});
router.post('/categories/reorder', (req, res) => { reorder('categories', req.body?.ids); res.json({ ok: true }); });
router.put('/categories/:id', (req, res) => {
  const c = get('SELECT * FROM categories WHERE id=?', int(req.params.id));
  if (!c) return notFound(res);
  const b = req.body || {};
  run('UPDATE categories SET name=?, tagline=?, description=?, layout=?, active=? WHERE id=?',
    str(b.name, 80) || c.name, str(b.tagline, 80), str(b.description, 300), b.layout === 'burger' ? 'burger' : 'compact', 'active' in b ? bool(b.active) : c.active, c.id);
  res.json(get('SELECT * FROM categories WHERE id=?', c.id));
});
router.delete('/categories/:id', (req, res) => {
  const c = get('SELECT * FROM categories WHERE id=?', int(req.params.id));
  if (!c) return notFound(res);
  run('DELETE FROM categories WHERE id=?', c.id); // borra también sus productos (ON DELETE CASCADE)
  res.json({ ok: true });
});

// ---------- productos ----------
router.get('/products', (req, res) => {
  res.json(all('SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id=p.category_id ORDER BY c.position, p.position, p.id').map(parseProduct));
});
router.post('/products', (req, res) => {
  const b = req.body || {};
  const cat = get('SELECT id FROM categories WHERE id=?', int(b.category_id));
  if (!cat) return res.status(400).json({ error: 'Categoría inválida' });
  if (!str(b.name)) return res.status(400).json({ error: 'Falta el nombre' });
  const variants = parseVariants(b.variants);
  if (!variants.length) return res.status(400).json({ error: 'Cargá al menos un precio' });
  const pos = (get('SELECT COALESCE(MAX(position),-1)+1 AS p FROM products WHERE category_id=?', cat.id)).p;
  const r = run('INSERT INTO products(category_id,name,subtitle,description,image,variants,badge,position,active,available,featured,cash_only) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
    cat.id, str(b.name, 80), str(b.subtitle, 80), str(b.description, 400), str(b.image, 300), JSON.stringify(variants), str(b.badge, 30).toUpperCase(), pos,
    'active' in b ? bool(b.active) : 1, 'available' in b ? bool(b.available) : 1, bool(b.featured), bool(b.cash_only));
  if (bool(b.featured)) run('UPDATE products SET featured=0 WHERE id!=?', r.lastInsertRowid);
  res.status(201).json(parseProduct(get('SELECT * FROM products WHERE id=?', r.lastInsertRowid)));
});
router.post('/products/reorder', (req, res) => { reorder('products', req.body?.ids); res.json({ ok: true }); });
router.put('/products/:id', (req, res) => {
  const p = get('SELECT * FROM products WHERE id=?', int(req.params.id));
  if (!p) return notFound(res);
  const b = req.body || {};
  const cat = get('SELECT id FROM categories WHERE id=?', int(b.category_id, p.category_id));
  if (!cat) return res.status(400).json({ error: 'Categoría inválida' });
  const variants = 'variants' in b ? parseVariants(b.variants) : JSON.parse(p.variants);
  if (!variants.length) return res.status(400).json({ error: 'Cargá al menos un precio' });
  run(`UPDATE products SET category_id=?, name=?, subtitle=?, description=?, image=?, variants=?, badge=?, active=?, available=?, featured=?, cash_only=?, updated_at=datetime('now') WHERE id=?`,
    cat.id, str(b.name, 80) || p.name, str(b.subtitle, 80), str(b.description, 400), str(b.image, 300), JSON.stringify(variants), str(b.badge, 30).toUpperCase(),
    'active' in b ? bool(b.active) : p.active, 'available' in b ? bool(b.available) : p.available, 'featured' in b ? bool(b.featured) : p.featured, 'cash_only' in b ? bool(b.cash_only) : p.cash_only, p.id);
  if ('featured' in b && bool(b.featured)) run('UPDATE products SET featured=0 WHERE id!=?', p.id);
  res.json(parseProduct(get('SELECT * FROM products WHERE id=?', p.id)));
});
// Cambios rápidos: agotado / oculto / destacado
router.patch('/products/:id', (req, res) => {
  const p = get('SELECT * FROM products WHERE id=?', int(req.params.id));
  if (!p) return notFound(res);
  const b = req.body || {};
  if ('available' in b) run('UPDATE products SET available=?, updated_at=datetime(\'now\') WHERE id=?', bool(b.available), p.id);
  if ('active' in b) run('UPDATE products SET active=?, updated_at=datetime(\'now\') WHERE id=?', bool(b.active), p.id);
  if ('featured' in b) { if (bool(b.featured)) run('UPDATE products SET featured=0'); run('UPDATE products SET featured=? WHERE id=?', bool(b.featured), p.id); }
  res.json(parseProduct(get('SELECT * FROM products WHERE id=?', p.id)));
});
router.delete('/products/:id', (req, res) => {
  const p = get('SELECT * FROM products WHERE id=?', int(req.params.id));
  if (!p) return notFound(res);
  run('DELETE FROM products WHERE id=?', p.id);
  res.json({ ok: true });
});

// ---------- promos ----------
const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
router.get('/promos', (req, res) => res.json(all('SELECT * FROM promos ORDER BY position, id')));
router.post('/promos', (req, res) => {
  const b = req.body || {};
  if (!str(b.title)) return res.status(400).json({ error: 'Falta el título' });
  const pos = (get('SELECT COALESCE(MAX(position),-1)+1 AS p FROM promos')).p;
  const r = run('INSERT INTO promos(title,description,image,position,active,starts_at,ends_at) VALUES(?,?,?,?,?,?,?)',
    str(b.title, 80), str(b.description, 300), str(b.image, 300), pos, 'active' in b ? bool(b.active) : 1, date(b.starts_at), date(b.ends_at));
  res.status(201).json(get('SELECT * FROM promos WHERE id=?', r.lastInsertRowid));
});
router.post('/promos/reorder', (req, res) => { reorder('promos', req.body?.ids); res.json({ ok: true }); });
router.put('/promos/:id', (req, res) => {
  const p = get('SELECT * FROM promos WHERE id=?', int(req.params.id));
  if (!p) return notFound(res);
  const b = req.body || {};
  run('UPDATE promos SET title=?, description=?, image=?, active=?, starts_at=?, ends_at=? WHERE id=?',
    str(b.title, 80) || p.title, str(b.description, 300), str(b.image, 300), 'active' in b ? bool(b.active) : p.active, date(b.starts_at), date(b.ends_at), p.id);
  res.json(get('SELECT * FROM promos WHERE id=?', p.id));
});
router.delete('/promos/:id', (req, res) => { run('DELETE FROM promos WHERE id=?', int(req.params.id)); res.json({ ok: true }); });

// ---------- galería ----------
router.get('/gallery', (req, res) => res.json(all('SELECT * FROM gallery ORDER BY position, id')));
router.post('/gallery', (req, res) => {
  const b = req.body || {};
  if (!str(b.image)) return res.status(400).json({ error: 'Falta la imagen' });
  const pos = (get('SELECT COALESCE(MAX(position),-1)+1 AS p FROM gallery')).p;
  const r = run('INSERT INTO gallery(image,caption,position,active) VALUES(?,?,?,?)', str(b.image, 300), str(b.caption, 60).toUpperCase(), pos, 'active' in b ? bool(b.active) : 1);
  res.status(201).json(get('SELECT * FROM gallery WHERE id=?', r.lastInsertRowid));
});
router.post('/gallery/reorder', (req, res) => { reorder('gallery', req.body?.ids); res.json({ ok: true }); });
router.put('/gallery/:id', (req, res) => {
  const g = get('SELECT * FROM gallery WHERE id=?', int(req.params.id));
  if (!g) return notFound(res);
  const b = req.body || {};
  run('UPDATE gallery SET image=?, caption=?, active=? WHERE id=?', str(b.image, 300) || g.image, str(b.caption, 60).toUpperCase(), 'active' in b ? bool(b.active) : g.active, g.id);
  res.json(get('SELECT * FROM gallery WHERE id=?', g.id));
});
router.delete('/gallery/:id', (req, res) => { run('DELETE FROM gallery WHERE id=?', int(req.params.id)); res.json({ ok: true }); });

// ---------- pedidos ----------
const STATUSES = ['nuevo', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado'];
router.get('/orders', (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const limit = Math.min(500, Math.max(1, int(req.query.limit, 100)));
  const rows = status
    ? all('SELECT * FROM orders WHERE status=? ORDER BY id DESC LIMIT ?', status, limit)
    : all('SELECT * FROM orders ORDER BY id DESC LIMIT ?', limit);
  res.json(rows.map((o) => ({ ...o, items: JSON.parse(o.items) })));
});
router.patch('/orders/:id', (req, res) => {
  const o = get('SELECT * FROM orders WHERE id=?', int(req.params.id));
  if (!o) return notFound(res);
  const s = req.body?.status;
  if (!STATUSES.includes(s)) return res.status(400).json({ error: 'Estado inválido' });
  run('UPDATE orders SET status=? WHERE id=?', s, o.id);
  res.json({ ...get('SELECT * FROM orders WHERE id=?', o.id), items: JSON.parse(o.items) });
});
router.delete('/orders/:id', (req, res) => { run('DELETE FROM orders WHERE id=?', int(req.params.id)); res.json({ ok: true }); });

// ---------- imágenes ----------
// Se acepta el archivo y se valida después (rechazar en fileFilter corta la conexión y el navegador no recibe el error).
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAGIC = [[0xff, 0xd8, 0xff], [0x89, 0x50, 0x4e, 0x47], [0x52, 0x49, 0x46, 0x46]];
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(DATA_DIR, 'uploads'),
    filename: (req, file, cb) => cb(null, Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex') + (ALLOWED[file.mimetype] || '.bin'))
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 }
});
router.post('/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera los 8 MB.' : err.message });
    if (!req.file) return res.status(400).json({ error: 'No llegó ninguna imagen.' });
    const fd = fs.openSync(req.file.path, 'r'); const head = Buffer.alloc(4); fs.readSync(fd, head, 0, 4, 0); fs.closeSync(fd);
    const looksImage = MAGIC.some((m) => m.every((b, i) => head[i] === b));
    if (!ALLOWED[req.file.mimetype] || !looksImage) { fs.unlinkSync(req.file.path); return res.status(400).json({ error: 'Solo se aceptan imágenes JPG, PNG o WEBP.' }); }
    res.status(201).json({ url: '/uploads/' + req.file.filename });
  });
});
router.get('/uploads', (req, res) => {
  const dir = path.join(DATA_DIR, 'uploads');
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => ({ url: '/uploads/' + f, mtime: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.mtime - a.mtime);
  const assets = fs.readdirSync(path.join(__dirname, '..', '..', 'public', 'assets')).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).map((f) => ({ url: '/assets/' + f }));
  res.json({ uploads: files, assets });
});

// ---------- backup ----------
router.get('/export', (req, res) => {
  res.set('Content-Disposition', `attachment; filename="burger2324-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({
    exported_at: new Date().toISOString(),
    settings: getSettings(),
    categories: all('SELECT * FROM categories ORDER BY position, id'),
    products: all('SELECT * FROM products ORDER BY category_id, position, id').map(parseProduct),
    promos: all('SELECT * FROM promos ORDER BY position, id'),
    gallery: all('SELECT * FROM gallery ORDER BY position, id'),
    orders: all('SELECT * FROM orders ORDER BY id').map((o) => ({ ...o, items: JSON.parse(o.items) }))
  });
});

module.exports = router;
