/* Panel de administración — Burger 2324 */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + Number(n || 0).toLocaleString('es-AR');
  const isContain = (u) => /\/(lata|botella|aquarius|agua)/.test(u || '');
  const DAYS = [['mon', 'Lunes'], ['tue', 'Martes'], ['wed', 'Miércoles'], ['thu', 'Jueves'], ['fri', 'Viernes'], ['sat', 'Sábado'], ['sun', 'Domingo']];
  const STATUS = { nuevo: ['Nuevo', 'red'], confirmado: ['Confirmado', 'info'], en_preparacion: ['En preparación', 'warn'], listo: ['Listo', 'ok'], entregado: ['Entregado', ''], cancelado: ['Cancelado', 'bad'] };

  // ---------- api ----------
  async function api(method, path, body, isForm) {
    const opts = { method, headers: { 'X-Requested-With': 'fetch' } };
    if (body && !isForm) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    if (body && isForm) opts.body = body;
    const res = await fetch('/api/admin' + path, opts);
    if (res.status === 401 && path !== '/login') { showLogin(); throw new Error('Sesión vencida. Volvé a ingresar.'); }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Error inesperado');
    return json;
  }

  // ---------- ui helpers ----------
  let toastTimer;
  function toast(msg, err) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), err ? 4000 : 2200);
  }
  const fail = (e) => toast(e.message || String(e), true);

  function modal(html, { narrow } = {}) {
    const m = $('#modal'), box = $('#modalBox');
    box.className = 'modal' + (narrow ? ' narrow' : '');
    box.innerHTML = html; m.hidden = false;
    setTimeout(() => $('input,select,textarea,button', box)?.focus(), 30);
    return box;
  }
  function closeModal() { $('#modal').hidden = true; $('#modalBox').innerHTML = ''; }
  function confirmDialog(title, text, okLabel = 'Eliminar') {
    return new Promise((resolve) => {
      const box = modal(`<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="modal-foot"><button class="btn" data-cancel>Cancelar</button><button class="btn danger" data-ok>${esc(okLabel)}</button></div>`, { narrow: true });
      $('[data-cancel]', box).onclick = () => { closeModal(); resolve(false); };
      $('[data-ok]', box).onclick = () => { closeModal(); resolve(true); };
    });
  }
  $('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  const formData = (form) => Object.fromEntries(new FormData(form).entries());
  const checked = (form, name) => !!form.elements[name]?.checked;

  // Selector de imagen: subir archivo o elegir de la biblioteca
  let libraryCache = null;
  function imageField(name, value, label = 'Imagen') {
    return `
      <div class="field"><span class="lbl">${esc(label)}</span>
        <div class="image-field" data-image-field>
          <div class="preview ${isContain(value) ? 'contain' : ''}" style="background-image:url('${esc(value || '')}')"></div>
          <div>
            <input type="hidden" name="${esc(name)}" value="${esc(value || '')}" />
            <div class="toolbar" style="margin-bottom:6px">
              <label class="btn small">📤 Subir foto<input type="file" accept="image/jpeg,image/png,image/webp" hidden data-upload /></label>
              <button type="button" class="btn small" data-library>🖼️ Elegir de la biblioteca</button>
              <button type="button" class="btn small" data-clear>Quitar</button>
            </div>
            <div class="hint">JPG, PNG o WEBP · máx. 8 MB. Ideal: fotos cuadradas, con buena luz.</div>
            <div class="image-lib" data-lib hidden></div>
          </div>
        </div>
      </div>`;
  }
  document.addEventListener('change', async (e) => {
    const up = e.target.closest('[data-upload]');
    if (!up || !up.files[0]) return;
    const wrap = up.closest('[data-image-field]');
    const fd = new FormData(); fd.append('image', up.files[0]);
    try {
      toast('Subiendo imagen…');
      const r = await api('POST', '/upload', fd, true);
      setImage(wrap, r.url); libraryCache = null; toast('Imagen subida');
    } catch (err) { fail(err); }
    up.value = '';
  });
  document.addEventListener('click', async (e) => {
    const wrap = e.target.closest('[data-image-field]');
    if (!wrap) return;
    if (e.target.closest('[data-clear]')) { setImage(wrap, ''); return; }
    if (e.target.closest('[data-library]')) {
      const lib = $('[data-lib]', wrap);
      lib.hidden = !lib.hidden;
      if (!lib.hidden) {
        try {
          libraryCache = libraryCache || await api('GET', '/uploads');
          const all = [...libraryCache.uploads, ...libraryCache.assets];
          lib.innerHTML = all.map((f) => `<div title="${esc(f.url)}" data-pick="${esc(f.url)}" style="background-image:url('${esc(f.url)}')"></div>`).join('') || '<div class="muted small">Sin imágenes</div>';
        } catch (err) { fail(err); }
      }
      return;
    }
    const pick = e.target.closest('[data-pick]');
    if (pick) { setImage(wrap, pick.dataset.pick); $('[data-lib]', wrap).hidden = true; }
  });
  function setImage(wrap, url) {
    $('input[type=hidden]', wrap).value = url;
    const p = $('.preview', wrap); p.style.backgroundImage = url ? `url('${url}')` : 'none'; p.classList.toggle('contain', isContain(url));
  }

  // ---------- auth ----------
  function showLogin() { $('#login').hidden = false; $('#app').hidden = true; }
  function showApp() { $('#login').hidden = true; $('#app').hidden = false; route(); }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#loginError'); err.hidden = true;
    try { await api('POST', '/login', formData(e.target)); e.target.reset(); showApp(); }
    catch (ex) { err.textContent = ex.message; err.hidden = false; }
  });
  $('#logoutBtn').onclick = async () => { await api('POST', '/logout').catch(() => {}); showLogin(); };
  $('#menuBtn').onclick = () => $('.sidebar').classList.toggle('open');
  document.addEventListener('click', (e) => { if (e.target.closest('#sideNav a')) $('.sidebar').classList.remove('open'); });

  // ---------- router ----------
  const routes = { '': 'dashboard', pedidos: 'orders', productos: 'products', categorias: 'categories', promos: 'promos', galeria: 'gallery', configuracion: 'settings', cuenta: 'account' };
  const titles = { dashboard: 'Inicio', orders: 'Pedidos', products: 'Productos', categories: 'Categorías', promos: 'Promos', gallery: 'Galería', settings: 'Configuración', account: 'Cuenta' };
  const views = {};
  async function route() {
    const key = location.hash.replace(/^#\/?/, '').split('?')[0];
    const name = routes[key] || 'dashboard';
    $$('#sideNav a').forEach((a) => a.classList.toggle('active', a.dataset.route === name));
    $('#pageTitle').textContent = titles[name];
    $('#view').innerHTML = '<p class="muted">Cargando…</p>';
    try { await views[name](); } catch (e) { $('#view').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
    refreshQuickStatus();
  }
  window.addEventListener('hashchange', route);

  async function refreshQuickStatus() {
    try {
      const d = await api('GET', '/dashboard');
      const st = d.status;
      $('#statusQuick').innerHTML = `<span class="lbl muted">Estado del local:</span><span class="status-dot ${st.open ? 'open' : 'closed'}">${st.open ? 'ABIERTO' : 'CERRADO'}${d.status_override !== 'auto' ? ' (forzado)' : ''}</span>`;
      const pill = $('#pendingPill'); pill.textContent = d.pending; pill.hidden = !d.pending;
    } catch {}
  }

  // ---------- dashboard ----------
  views.dashboard = async () => {
    const d = await api('GET', '/dashboard');
    const st = d.status;
    $('#view').innerHTML = `
      <div class="grid cols-4" style="margin-bottom:18px">
        <div class="kpi"><span>Pedidos hoy</span><b>${d.today.n}</b></div>
        <div class="kpi"><span>Ventas hoy</span><b>${money(d.today.total)}</b></div>
        <div class="kpi"><span>Últimos 7 días</span><b>${money(d.week.total)}</b><div class="muted small">${d.week.n} pedidos</div></div>
        <div class="kpi"><span>Pedidos sin confirmar</span><b style="color:${d.pending ? 'var(--red)' : 'inherit'}">${d.pending}</b>${d.pending ? '<a class="small" href="#/pedidos">Ver pedidos →</a>' : ''}</div>
      </div>
      <div class="grid cols-2">
        <div class="card">
          <h3>Estado del local</h3>
          <p>Ahora: <span class="status-dot ${st.open ? 'open' : 'closed'}">${st.open ? 'ABIERTO' : 'CERRADO'}</span> <span class="muted small">· hoy ${esc(st.today)}${st.next ? ' · abre ' + esc(st.next.label) : ''}</span></p>
          <div class="field"><label for="ovr">Modo</label>
            <select id="ovr">
              <option value="auto" ${d.status_override === 'auto' ? 'selected' : ''}>Automático según horarios</option>
              <option value="open" ${d.status_override === 'open' ? 'selected' : ''}>Forzar ABIERTO (ej. día especial)</option>
              <option value="closed" ${d.status_override === 'closed' ? 'selected' : ''}>Forzar CERRADO (ej. feriado, vacaciones)</option>
            </select>
            <div class="hint">Los horarios se editan en Configuración → Horarios.</div>
          </div>
          <div class="field"><label for="annText">Aviso en la parte superior del sitio</label>
            <input id="annText" maxlength="200" placeholder="Ej: Hoy 2x1 en Mercedes simple · Cerramos el 25/12" value="${esc(d.announcement?.text || '')}" />
            <label class="switch red" style="margin-top:6px"><input type="checkbox" id="annActive" ${d.announcement?.active ? 'checked' : ''}/> Mostrar aviso</label>
          </div>
          <button class="btn primary" id="saveQuick">Guardar</button>
        </div>
        <div class="card">
          <h3>Carta</h3>
          <p>${d.products.n} productos · <b>${d.products.soldout || 0}</b> marcados como agotados · ${d.products.hidden || 0} ocultos</p>
          <p><a class="btn small" href="#/productos">Administrar productos →</a></p>
          <h3 style="margin-top:18px">Más pedidos (30 días)</h3>
          ${d.topProducts.length ? `<ol style="margin:0;padding-left:18px">${d.topProducts.map((t) => `<li>${esc(t.name)} <span class="muted">× ${t.qty}</span></li>`).join('')}</ol>` : '<p class="muted">Todavía no hay pedidos registrados.</p>'}
        </div>
      </div>`;
    $('#saveQuick').onclick = async () => {
      try {
        await api('PUT', '/settings', { status_override: $('#ovr').value, announcement: { active: $('#annActive').checked, text: $('#annText').value } });
        toast('Guardado'); route();
      } catch (e) { fail(e); }
    };
  };

  // ---------- pedidos ----------
  views.orders = async () => {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const status = params.get('status') || '';
    const orders = await api('GET', '/orders' + (status ? `?status=${status}` : ''));
    $('#view').innerHTML = `
      <div class="toolbar">
        <select id="statusFilter"><option value="">Todos los estados</option>${Object.entries(STATUS).map(([k, [l]]) => `<option value="${k}" ${status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <span class="muted small">${orders.length} pedidos</span>
        <span class="spacer"></span>
        <button class="btn small" id="reloadOrders">↻ Actualizar</button>
      </div>
      ${orders.length ? orders.map(orderCard).join('') : '<div class="empty">No hay pedidos todavía. Cuando un cliente arme un pedido en el sitio, aparece acá aunque no haya enviado el WhatsApp.</div>'}`;
    $('#statusFilter').onchange = (e) => { location.hash = '#/pedidos' + (e.target.value ? '?status=' + e.target.value : ''); };
    $('#reloadOrders').onclick = route;
  };
  function orderCard(o) {
    const [label, cls] = STATUS[o.status] || [o.status, ''];
    const phone = (o.phone || '').replace(/\D/g, '');
    const waPhone = phone ? (phone.startsWith('54') ? phone : '549' + phone.replace(/^0/, '').replace(/^15/, '')) : '';
    return `
      <article class="order" data-id="${o.id}">
        <div class="order-head">
          <b>${esc(o.code)}</b>
          <span class="tag ${cls}">${label}</span>
          <span class="tag ${o.mode === 'delivery' ? 'info' : ''}">${o.mode === 'delivery' ? '🛵 Delivery' : '🏪 Retiro'}</span>
          <span class="time">${esc(o.created_at)}</span>
        </div>
        <p style="margin:8px 0 0"><b>${esc(o.customer_name)}</b>${o.phone ? ` · ${esc(o.phone)}` : ''}${o.address ? ` · ${esc(o.address)}` : ''}${o.payment ? ` · <span class="muted">${esc(o.payment)}</span>` : ''}</p>
        <div class="order-items">
          ${o.items.map((it) => `<div><span>${it.qty}× ${esc(it.name)}${it.variant ? ` <span class="muted">(${esc(it.variant)})</span>` : ''}</span><span>${money(it.total)}</span></div>${it.note ? `<div class="note">↳ ${esc(it.note)}</div>` : ''}`).join('')}
          ${o.delivery_fee ? `<div><span class="muted">Envío</span><span>${money(o.delivery_fee)}</span></div>` : ''}
        </div>
        ${o.notes ? `<p class="small">📝 ${esc(o.notes)}</p>` : ''}
        <div class="order-foot">
          <select data-status>${Object.entries(STATUS).map(([k, [l]]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          ${waPhone ? `<a class="btn small" href="https://wa.me/${waPhone}" target="_blank" rel="noreferrer">💬 WhatsApp al cliente</a>` : ''}
          <button class="btn small danger" data-del-order>Borrar</button>
          <span class="order-total">${money(o.total)}</span>
        </div>
      </article>`;
  }
  document.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-status]');
    if (!sel) return;
    const id = sel.closest('.order').dataset.id;
    try { await api('PATCH', `/orders/${id}`, { status: sel.value }); toast('Estado actualizado'); refreshQuickStatus(); route(); } catch (err) { fail(err); }
  });
  document.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-del-order]');
    if (!del) return;
    const id = del.closest('.order').dataset.id;
    if (await confirmDialog('Borrar pedido', 'Se elimina del historial. Esta acción no se puede deshacer.')) {
      try { await api('DELETE', `/orders/${id}`); toast('Pedido borrado'); route(); } catch (err) { fail(err); }
    }
  });

  // ---------- productos ----------
  let cats = [];
  views.products = async () => {
    const [products, categories] = await Promise.all([api('GET', '/products'), api('GET', '/categories')]);
    cats = categories;
    const byCat = categories.map((c) => ({ ...c, products: products.filter((p) => p.category_id === c.id) }));
    $('#view').innerHTML = `
      <div class="toolbar">
        <input id="prodSearch" placeholder="Buscar producto…" style="padding:10px 12px;border:1px solid var(--line);border-radius:9px;min-width:220px" />
        <span class="spacer"></span>
        <button class="btn primary" id="newProduct">+ Nuevo producto</button>
      </div>
      <p class="muted small">Tip: <b>Agotado</b> lo deja visible pero sin poder pedirse (ideal para "hoy no hay"). <b>Visible</b> apagado lo saca de la carta. <b>Destacado</b> es la burger que aparece en la sección grande roja (solo una).</p>
      ${byCat.map((c) => `
        <section class="cat-block" data-cat="${c.id}">
          <h3>${esc(c.name)} <span class="tag">${c.products.length}</span> ${c.active ? '' : '<span class="tag bad">categoría oculta</span>'}</h3>
          ${c.products.length ? `<table><thead><tr><th></th><th>Producto</th><th>Precios</th><th>Agotado</th><th>Visible</th><th>Destacado</th><th></th></tr></thead><tbody>
            ${c.products.map((p, i) => `
              <tr data-id="${p.id}" data-name="${esc((p.name + ' ' + p.subtitle).toLowerCase())}">
                <td><div class="thumb ${isContain(p.image) ? 'contain' : ''}" style="background-image:url('${esc(p.image)}')"></div></td>
                <td><div class="prod-name">${esc(p.name)} ${p.badge ? `<span class="tag red">${esc(p.badge)}</span>` : ''}${p.cash_only ? ' <span class="tag warn">solo efectivo</span>' : ''}<small>${esc(p.subtitle || '')}</small></div></td>
                <td class="prices">${p.variants.map((v) => `${v.label ? v.label + ' ' : ''}${money(v.price)}`).join('<br/>')}</td>
                <td><label class="switch red"><input type="checkbox" data-toggle="available" ${p.available ? '' : 'checked'} /></label></td>
                <td><label class="switch"><input type="checkbox" data-toggle="active" ${p.active ? 'checked' : ''} /></label></td>
                <td><label class="switch"><input type="checkbox" data-toggle="featured" ${p.featured ? 'checked' : ''} /></label></td>
                <td><div class="actions">
                  <button class="btn icon" data-move="-1" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
                  <button class="btn icon" data-move="1" title="Bajar" ${i === c.products.length - 1 ? 'disabled' : ''}>↓</button>
                  <button class="btn small" data-edit>Editar</button>
                  <button class="btn small danger" data-del>Borrar</button>
                </div></td>
              </tr>`).join('')}
          </tbody></table>` : '<div class="empty">Sin productos en esta categoría.</div>'}
        </section>`).join('')}`;
    const all = products;
    $('#newProduct').onclick = () => productForm(null);
    $('#prodSearch').oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      $$('tr[data-name]').forEach((tr) => { tr.style.display = !q || tr.dataset.name.includes(q) ? '' : 'none'; });
    };
    $('#view').onclick = async (e) => {
      const tr = e.target.closest('tr[data-id]'); if (!tr) return;
      const id = Number(tr.dataset.id); const p = all.find((x) => x.id === id);
      if (e.target.closest('[data-edit]')) return productForm(p);
      if (e.target.closest('[data-del]')) {
        if (await confirmDialog('Borrar producto', `¿Eliminar "${p.name}" de la carta? Si solo no hay stock hoy, mejor marcalo como agotado.`)) {
          try { await api('DELETE', `/products/${id}`); toast('Producto borrado'); route(); } catch (err) { fail(err); }
        }
        return;
      }
      const mv = e.target.closest('[data-move]');
      if (mv) {
        const rows = $$('tr[data-id]', tr.closest('tbody'));
        const idx = rows.indexOf(tr); const to = idx + Number(mv.dataset.move);
        if (to < 0 || to >= rows.length) return;
        const ids = rows.map((r) => Number(r.dataset.id)); [ids[idx], ids[to]] = [ids[to], ids[idx]];
        try { await api('POST', '/products/reorder', { ids }); route(); } catch (err) { fail(err); }
      }
    };
    $('#view').onchange = async (e) => {
      const t = e.target.closest('[data-toggle]'); if (!t) return;
      const id = Number(t.closest('tr').dataset.id);
      const field = t.dataset.toggle;
      const value = field === 'available' ? !t.checked : t.checked;
      try {
        await api('PATCH', `/products/${id}`, { [field]: value });
        toast(field === 'available' ? (value ? 'Disponible de nuevo' : 'Marcado como agotado') : field === 'active' ? (value ? 'Visible en la carta' : 'Oculto de la carta') : (value ? 'Ahora es la destacada' : 'Ya no es destacada'));
        if (field === 'featured') route();
      } catch (err) { fail(err); t.checked = !t.checked; }
    };
  };

  function productForm(p) {
    const isNew = !p;
    p = p || { category_id: cats[0]?.id, name: '', subtitle: '', description: '', image: '', variants: [], badge: '', active: 1, available: 1, featured: 0, cash_only: 0 };
    const cat = cats.find((c) => c.id === p.category_id);
    const variants = p.variants.length ? p.variants : (cat?.layout === 'burger' ? [{ label: 'SIMPLE', price: '' }, { label: 'DOBLE', price: '' }, { label: 'TRIPLE', price: '' }] : [{ label: '', price: '' }]);
    const box = modal(`
      <h3>${isNew ? 'Nuevo producto' : 'Editar: ' + esc(p.name)}</h3>
      <form id="pForm">
        <div class="row">
          <div class="field"><label>Categoría</label><select name="category_id">${cats.map((c) => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Etiqueta (opcional)</label><input name="badge" maxlength="30" placeholder="NUEVA · MÁS PEDIDA · PROMO" value="${esc(p.badge)}" /></div>
        </div>
        <div class="row">
          <div class="field"><label>Nombre</label><input name="name" required maxlength="80" value="${esc(p.name)}" /></div>
          <div class="field"><label>Subtítulo (opcional)</label><input name="subtitle" maxlength="80" placeholder="Ej: Bacon Burger · Lata 355 ml" value="${esc(p.subtitle)}" /></div>
        </div>
        <div class="field"><label>Descripción / ingredientes</label><textarea name="description" maxlength="400">${esc(p.description)}</textarea></div>
        ${imageField('image', p.image, 'Foto del producto')}
        <div class="field"><span class="lbl">Precios</span>
          <div class="variants" id="variants">${variants.map(variantRow).join('')}</div>
          <div class="toolbar" style="margin:8px 0 0"><button type="button" class="btn small" id="addVariant">+ Agregar opción</button><button type="button" class="btn small" id="presetSizes">Simple / Doble / Triple</button></div>
          <div class="hint">Si el producto tiene un solo precio, dejá el nombre de la opción vacío. Precios en pesos, sin puntos.</div>
        </div>
        <div class="toolbar">
          <label class="switch"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}/> Visible en la carta</label>
          <label class="switch"><input type="checkbox" name="available" ${p.available ? 'checked' : ''}/> Disponible (sin tildar = agotado)</label>
          <label class="switch"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}/> Destacado</label>
          <label class="switch"><input type="checkbox" name="cash_only" ${p.cash_only ? 'checked' : ''}/> Solo en efectivo</label>
        </div>
        <div class="modal-foot"><button type="button" class="btn" data-cancel>Cancelar</button><button type="submit" class="btn primary">${isNew ? 'Crear producto' : 'Guardar cambios'}</button></div>
      </form>`);
    $('[data-cancel]', box).onclick = closeModal;
    $('#addVariant', box).onclick = () => $('#variants', box).insertAdjacentHTML('beforeend', variantRow({ label: '', price: '' }));
    $('#presetSizes', box).onclick = () => { $('#variants', box).innerHTML = [['SIMPLE', ''], ['DOBLE', ''], ['TRIPLE', '']].map(([label, price]) => variantRow({ label, price })).join(''); };
    box.addEventListener('click', (e) => { const rm = e.target.closest('[data-rm-variant]'); if (rm) rm.closest('.variant-row').remove(); });
    $('#pForm', box).onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const body = { ...formData(f), active: checked(f, 'active'), available: checked(f, 'available'), featured: checked(f, 'featured'), cash_only: checked(f, 'cash_only'),
        variants: $$('.variant-row', box).map((r) => ({ label: $('[name=vlabel]', r).value, price: $('[name=vprice]', r).value })).filter((v) => v.price !== '') };
      try {
        if (isNew) await api('POST', '/products', body); else await api('PUT', `/products/${p.id}`, body);
        closeModal(); toast(isNew ? 'Producto creado' : 'Cambios guardados'); route();
      } catch (err) { fail(err); }
    };
  }
  const variantRow = (v) => `<div class="variant-row"><input name="vlabel" placeholder="Opción (ej: SIMPLE) — vacío si es único" maxlength="30" value="${esc(v.label)}" /><input name="vprice" type="number" min="0" step="1" inputmode="numeric" placeholder="Precio $" required value="${esc(v.price)}" /><button type="button" class="btn icon" data-rm-variant title="Quitar">✕</button></div>`;

  // ---------- categorías ----------
  views.categories = async () => {
    const list = await api('GET', '/categories');
    $('#view').innerHTML = `
      <div class="toolbar"><span class="muted small">El orden de acá es el orden en que aparecen en el sitio.</span><span class="spacer"></span><button class="btn primary" id="newCat">+ Nueva categoría</button></div>
      <div class="list">${list.map((c, i) => `
        <div class="list-item" data-id="${c.id}">
          <div class="grow"><b>${esc(c.name)} ${c.active ? '' : '<span class="tag bad">oculta</span>'} <span class="tag">${c.layout === 'burger' ? 'tarjetas grandes' : 'tarjetas compactas'}</span></b><span class="muted small">${esc(c.tagline || '')}${c.tagline && c.description ? ' · ' : ''}${esc(c.description || '')} · ${c.product_count} productos</span></div>
          <div class="actions">
            <button class="btn icon" data-move="-1" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn icon" data-move="1" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="btn small" data-edit>Editar</button>
            <button class="btn small danger" data-del>Borrar</button>
          </div>
        </div>`).join('')}</div>`;
    $('#newCat').onclick = () => categoryForm(null);
    $('#view').onclick = async (e) => {
      const item = e.target.closest('[data-id]'); if (!item) return;
      const c = list.find((x) => x.id === Number(item.dataset.id));
      if (e.target.closest('[data-edit]')) return categoryForm(c);
      if (e.target.closest('[data-del]')) {
        if (await confirmDialog('Borrar categoría', `Se borra "${c.name}" y sus ${c.product_count} productos. ¿Seguro?`)) {
          try { await api('DELETE', `/categories/${c.id}`); toast('Categoría borrada'); route(); } catch (err) { fail(err); }
        }
        return;
      }
      const mv = e.target.closest('[data-move]');
      if (mv) {
        const ids = list.map((x) => x.id); const idx = ids.indexOf(c.id); const to = idx + Number(mv.dataset.move);
        [ids[idx], ids[to]] = [ids[to], ids[idx]];
        try { await api('POST', '/categories/reorder', { ids }); route(); } catch (err) { fail(err); }
      }
    };
  };
  function categoryForm(c) {
    const isNew = !c; c = c || { name: '', tagline: '', description: '', layout: 'compact', active: 1 };
    const box = modal(`
      <h3>${isNew ? 'Nueva categoría' : 'Editar categoría'}</h3>
      <form id="cForm">
        <div class="field"><label>Nombre</label><input name="name" required maxlength="80" value="${esc(c.name)}" /></div>
        <div class="row">
          <div class="field"><label>Subtítulo corto</label><input name="tagline" maxlength="80" placeholder="PARA PICAR · BIEN FRÍAS" value="${esc(c.tagline)}" /></div>
          <div class="field"><label>Estilo de tarjetas</label><select name="layout"><option value="burger" ${c.layout === 'burger' ? 'selected' : ''}>Grandes con foto lateral (burgers)</option><option value="compact" ${c.layout !== 'burger' ? 'selected' : ''}>Compactas (extras, bebidas)</option></select></div>
        </div>
        <div class="field"><label>Descripción (opcional)</label><input name="description" maxlength="300" value="${esc(c.description)}" /></div>
        <label class="switch"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}/> Visible en el sitio</label>
        <div class="modal-foot"><button type="button" class="btn" data-cancel>Cancelar</button><button type="submit" class="btn primary">Guardar</button></div>
      </form>`, { narrow: true });
    $('[data-cancel]', box).onclick = closeModal;
    $('#cForm', box).onsubmit = async (e) => {
      e.preventDefault();
      const body = { ...formData(e.target), active: checked(e.target, 'active') };
      try { if (isNew) await api('POST', '/categories', body); else await api('PUT', `/categories/${c.id}`, body); closeModal(); toast('Guardado'); route(); } catch (err) { fail(err); }
    };
  }

  // ---------- promos ----------
  views.promos = async () => {
    const list = await api('GET', '/promos');
    $('#view').innerHTML = `
      <div class="toolbar"><span class="muted small">Se muestran en una franja debajo de la portada. Podés programar fechas de inicio y fin.</span><span class="spacer"></span><button class="btn primary" id="newPromo">+ Nueva promo</button></div>
      ${list.length ? `<div class="list">${list.map((p, i) => `
        <div class="list-item" data-id="${p.id}">
          <div class="thumb" style="background-image:url('${esc(p.image)}')"></div>
          <div class="grow"><b>${esc(p.title)} ${p.active ? '<span class="tag ok">activa</span>' : '<span class="tag">pausada</span>'}</b><span class="muted small">${esc(p.description || '')}${p.starts_at || p.ends_at ? ` · ${p.starts_at || '…'} → ${p.ends_at || '…'}` : ''}</span></div>
          <div class="actions">
            <button class="btn icon" data-move="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn icon" data-move="1" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="btn small" data-edit>Editar</button><button class="btn small danger" data-del>Borrar</button>
          </div>
        </div>`).join('')}</div>` : '<div class="empty">No hay promos cargadas. Ej: "2x1 los martes", "Combo burger + papas + bebida".</div>'}`;
    $('#newPromo').onclick = () => promoForm(null);
    $('#view').onclick = async (e) => {
      const item = e.target.closest('[data-id]'); if (!item) return;
      const p = list.find((x) => x.id === Number(item.dataset.id));
      if (e.target.closest('[data-edit]')) return promoForm(p);
      if (e.target.closest('[data-del]')) { if (await confirmDialog('Borrar promo', `¿Eliminar "${p.title}"?`)) { try { await api('DELETE', `/promos/${p.id}`); route(); } catch (err) { fail(err); } } return; }
      const mv = e.target.closest('[data-move]');
      if (mv) { const ids = list.map((x) => x.id); const idx = ids.indexOf(p.id); const to = idx + Number(mv.dataset.move); [ids[idx], ids[to]] = [ids[to], ids[idx]]; try { await api('POST', '/promos/reorder', { ids }); route(); } catch (err) { fail(err); } }
    };
  };
  function promoForm(p) {
    const isNew = !p; p = p || { title: '', description: '', image: '', active: 1, starts_at: '', ends_at: '' };
    const box = modal(`
      <h3>${isNew ? 'Nueva promo' : 'Editar promo'}</h3>
      <form id="prForm">
        <div class="field"><label>Título</label><input name="title" required maxlength="80" value="${esc(p.title)}" /></div>
        <div class="field"><label>Detalle</label><input name="description" maxlength="300" value="${esc(p.description)}" /></div>
        ${imageField('image', p.image, 'Imagen (opcional)')}
        <div class="row"><div class="field"><label>Desde</label><input type="date" name="starts_at" value="${esc(p.starts_at || '')}" /></div><div class="field"><label>Hasta</label><input type="date" name="ends_at" value="${esc(p.ends_at || '')}" /></div></div>
        <label class="switch"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}/> Activa</label>
        <div class="modal-foot"><button type="button" class="btn" data-cancel>Cancelar</button><button type="submit" class="btn primary">Guardar</button></div>
      </form>`);
    $('[data-cancel]', box).onclick = closeModal;
    $('#prForm', box).onsubmit = async (e) => {
      e.preventDefault();
      const body = { ...formData(e.target), active: checked(e.target, 'active') };
      try { if (isNew) await api('POST', '/promos', body); else await api('PUT', `/promos/${p.id}`, body); closeModal(); toast('Guardado'); route(); } catch (err) { fail(err); }
    };
  }

  // ---------- galería ----------
  views.gallery = async () => {
    const list = await api('GET', '/gallery');
    $('#view').innerHTML = `
      <div class="toolbar"><span class="muted small">Fotos de la sección "Un poco de lo nuestro". Recomendado: 4 a 8 fotos cuadradas.</span><span class="spacer"></span><label class="btn primary">📤 Subir foto<input type="file" accept="image/jpeg,image/png,image/webp" hidden id="galUpload" /></label></div>
      ${list.length ? `<div class="gallery-admin">${list.map((g, i) => `
        <div class="g" data-id="${g.id}">
          <div class="img" style="background-image:url('${esc(g.image)}')"></div>
          <div class="body">
            <input data-caption maxlength="60" placeholder="Texto (opcional)" value="${esc(g.caption)}" />
            <div class="toolbar" style="margin:0;gap:4px">
              <button class="btn icon" data-move="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn icon" data-move="1" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>
              <label class="switch small"><input type="checkbox" data-active ${g.active ? 'checked' : ''}/></label>
              <span class="spacer"></span><button class="btn icon danger" data-del>✕</button>
            </div>
          </div>
        </div>`).join('')}</div>` : '<div class="empty">Sin fotos. Subí la primera.</div>'}`;
    $('#galUpload').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const fd = new FormData(); fd.append('image', f);
      try { toast('Subiendo…'); const r = await api('POST', '/upload', fd, true); await api('POST', '/gallery', { image: r.url }); toast('Foto agregada'); route(); } catch (err) { fail(err); }
    };
    $('#view').onclick = async (e) => {
      const item = e.target.closest('[data-id]'); if (!item) return;
      const g = list.find((x) => x.id === Number(item.dataset.id));
      if (e.target.closest('[data-del]')) { if (await confirmDialog('Quitar foto', 'Se quita de la galería (el archivo queda en la biblioteca).', 'Quitar')) { try { await api('DELETE', `/gallery/${g.id}`); route(); } catch (err) { fail(err); } } return; }
      const mv = e.target.closest('[data-move]');
      if (mv) { const ids = list.map((x) => x.id); const idx = ids.indexOf(g.id); const to = idx + Number(mv.dataset.move); [ids[idx], ids[to]] = [ids[to], ids[idx]]; try { await api('POST', '/gallery/reorder', { ids }); route(); } catch (err) { fail(err); } }
    };
    $('#view').onchange = async (e) => {
      const item = e.target.closest('[data-id]'); if (!item) return;
      const g = list.find((x) => x.id === Number(item.dataset.id));
      const body = { image: g.image, caption: $('[data-caption]', item).value, active: $('[data-active]', item).checked };
      try { await api('PUT', `/gallery/${g.id}`, body); toast('Guardado'); } catch (err) { fail(err); }
    };
  };

  // ---------- configuración ----------
  views.settings = async () => {
    const s = await api('GET', '/settings');
    const tab = (location.hash.split('?')[1] || 'local');
    const tabs = [['local', 'Local y contacto'], ['horarios', 'Horarios'], ['pedidos', 'Delivery y pagos'], ['textos', 'Textos del sitio'], ['imagenes', 'Imágenes']];
    const h = s.hours || {};
    const d = s.delivery || {}; const t = s.takeaway || {};
    const content = {
      local: `
        <div class="row"><div class="field"><label>Nombre del local</label><input name="brand_name" value="${esc(s.brand_name)}" /></div><div class="field"><label>Instagram (usuario)</label><input name="instagram" value="${esc(s.instagram)}" placeholder="burgers2324" /></div></div>
        <div class="row"><div class="field"><label>WhatsApp para pedidos (con 54, sin +, sin 15)</label><input name="whatsapp" value="${esc(s.whatsapp)}" placeholder="5492324353266" /><div class="hint">Formato internacional. Ej: 54 9 2324 353266 → 5492324353266. Si tu número recibe bien los links wa.me sin el 9, dejalo como está.</div></div><div class="field"><label>Teléfono como se muestra</label><input name="phone_display" value="${esc(s.phone_display)}" /></div></div>
        <div class="row"><div class="field"><label>Dirección</label><input name="address" value="${esc(s.address)}" /></div><div class="field"><label>Ciudad</label><input name="city" value="${esc(s.city)}" /></div></div>
        <div class="field"><label>Link a Google Maps</label><input name="maps_url" value="${esc(s.maps_url)}" /><div class="hint">El mapa del sitio se genera solo con la dirección. Si querés el mapa exacto de tu ficha de Google, pegá el código de "Compartir → Insertar un mapa" acá abajo.</div></div>
        <div class="field"><label>Código de mapa embebido (opcional)</label><textarea name="maps_embed" placeholder="<iframe src=&quot;https://www.google.com/maps/embed?...&quot;></iframe>">${esc(s.maps_embed)}</textarea></div>`,
      horarios: `
        <div class="card" style="margin-bottom:14px">
          ${DAYS.map(([k, label]) => { const x = h[k] || { open: false, from: '19:30', to: '23:30' }; return `
            <div class="hours-row ${x.open ? '' : 'off'}"><b>${label}</b><label class="switch"><input type="checkbox" name="h_${k}_open" ${x.open ? 'checked' : ''}/></label><input type="time" name="h_${k}_from" value="${esc(x.from)}" /><span>a</span><input type="time" name="h_${k}_to" value="${esc(x.to)}" /></div>`; }).join('')}
        </div>
        <div class="field"><label>Texto resumen de horarios (se muestra en el sitio)</label><input name="hours_label" value="${esc(s.hours_label)}" placeholder="Martes a domingos · 19:30 a 23:30 hs" /></div>
        <div class="field"><label>Mensaje cuando el local está cerrado</label><input name="closed_message" value="${esc(s.closed_message)}" maxlength="300" /></div>
        <label class="switch"><input type="checkbox" name="accept_orders_when_closed" ${s.accept_orders_when_closed ? 'checked' : ''}/> Permitir que dejen pedidos por WhatsApp aunque esté cerrado</label>
        <p class="hint">El estado ABIERTO / CERRADO del sitio se calcula solo con estos horarios (hora de Argentina). Para un feriado o vacaciones, usá "Forzar cerrado" en Inicio.</p>`,
      pedidos: `
        <div class="card" style="margin-bottom:14px"><h3>Delivery</h3>
          <label class="switch" style="margin-bottom:12px"><input type="checkbox" name="d_enabled" ${d.enabled ? 'checked' : ''}/> Hacemos delivery</label>
          <div class="row-3"><div class="field"><label>Costo de envío ($)</label><input type="number" name="d_fee" min="0" value="${esc(d.fee ?? 0)}" /></div><div class="field"><label>Envío gratis desde ($, 0 = nunca)</label><input type="number" name="d_free_from" min="0" value="${esc(d.free_from ?? 0)}" /></div><div class="field"><label>Pedido mínimo ($, 0 = sin mínimo)</label><input type="number" name="d_min_order" min="0" value="${esc(d.min_order ?? 0)}" /></div></div>
          <div class="row"><div class="field"><label>Demora estimada</label><input name="d_eta" value="${esc(d.eta)}" placeholder="30 a 45 min" /></div><div class="field"><label>Zonas de entrega</label><input name="d_zones" value="${esc(d.zones)}" placeholder="Mercedes zona urbana" /></div></div>
        </div>
        <div class="card" style="margin-bottom:14px"><h3>Retiro en el local</h3>
          <label class="switch" style="margin-bottom:12px"><input type="checkbox" name="t_enabled" ${t.enabled ? 'checked' : ''}/> Se puede retirar en el local</label>
          <div class="field"><label>Demora estimada</label><input name="t_eta" value="${esc(t.eta)}" placeholder="15 a 20 min" /></div>
        </div>
        <div class="card"><h3>Medios de pago</h3>
          <div class="chips" id="payChips">${(s.payments || []).map((p) => `<span class="chip" data-pay="${esc(p)}">${esc(p)}<button type="button" data-rm-pay>✕</button></span>`).join('')}</div>
          <div class="toolbar" style="margin:10px 0 0"><input id="newPay" placeholder="Ej: Mercado Pago" maxlength="40" style="padding:9px 12px;border:1px solid var(--line);border-radius:8px" /><button type="button" class="btn small" id="addPay">+ Agregar</button></div>
          <div class="hint">El cliente elige uno al armar el pedido y aparece en el mensaje de WhatsApp.</div>
        </div>`,
      textos: `
        <div class="card" style="margin-bottom:14px"><h3>Portada</h3>
          <div class="field"><label>Línea superior</label><input name="eyebrow" value="${esc(s.eyebrow)}" /></div>
          <div class="row"><div class="field"><label>Título</label><input name="hero_title" value="${esc(s.hero_title)}" /></div><div class="field"><label>Título en cursiva</label><input name="hero_title_em" value="${esc(s.hero_title_em)}" /></div></div>
          <div class="field"><label>Frase</label><input name="hero_text" value="${esc(s.hero_text)}" /></div>
        </div>
        <div class="card" style="margin-bottom:14px"><h3>Nosotros</h3>
          <div class="row"><div class="field"><label>Título</label><input name="about_title" value="${esc(s.about_title)}" /></div><div class="field"><label>Título en cursiva</label><input name="about_title_em" value="${esc(s.about_title_em)}" /></div></div>
          <div class="field"><label>Historia del local</label><textarea name="about_text" style="min-height:140px">${esc(s.about_text)}</textarea><div class="hint">Contá quiénes son, desde cuándo, qué los hace distintos. Cada salto de línea es un párrafo nuevo.</div></div>
        </div>
        <div class="card" style="margin-bottom:14px"><h3>Sección destacada</h3>
          <div class="row-3"><div class="field"><label>Línea superior</label><input name="featured_eyebrow" value="${esc(s.featured_eyebrow)}" /></div><div class="field"><label>Título</label><input name="featured_title" value="${esc(s.featured_title)}" /></div><div class="field"><label>Título en cursiva</label><input name="featured_title_em" value="${esc(s.featured_title_em)}" /></div></div>
          <div class="hint">El producto que se muestra ahí es el marcado como "Destacado" en Productos.</div>
        </div>
        <div class="card"><h3>Pie y Google</h3>
          <div class="field"><label>Texto del pie</label><input name="footer_text" value="${esc(s.footer_text)}" /></div>
          <div class="field"><label>Título para Google (pestaña del navegador)</label><input name="meta_title" value="${esc(s.meta_title)}" maxlength="120" /></div>
          <div class="field"><label>Descripción para Google</label><textarea name="meta_description" maxlength="320">${esc(s.meta_description)}</textarea><div class="hint">Aparece debajo del título en los resultados de búsqueda. 1 o 2 oraciones con "hamburguesas", "Mercedes" y "delivery".</div></div>
          <div class="field"><label>Prefijo de número de pedido</label><input name="order_prefix" value="${esc(s.order_prefix)}" maxlength="10" /></div>
        </div>`,
      imagenes: `
        ${imageField('hero_image', s.hero_image, 'Foto de portada (grande, horizontal o cuadrada)')}
        <h3 style="margin:18px 0 10px">Fotos de la sección Nosotros (3)</h3>
        ${imageField('about_image_0', (s.about_images || [])[0], 'Foto 1')}
        ${imageField('about_image_1', (s.about_images || [])[1], 'Foto 2')}
        ${imageField('about_image_2', (s.about_images || [])[2], 'Foto 3')}`
    };
    $('#view').innerHTML = `
      <div class="tabs">${tabs.map(([k, l]) => `<button type="button" class="${tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      <form id="sForm">${content[tab] || content.local}<div class="save-bar"><button type="submit" class="btn primary">Guardar cambios</button></div></form>`;
    $$('[data-tab]').forEach((b) => b.onclick = () => { location.hash = '#/configuracion?' + b.dataset.tab; });
    $$('.hours-row input[type=checkbox]').forEach((c) => c.onchange = () => c.closest('.hours-row').classList.toggle('off', !c.checked));
    const addPay = () => { const v = $('#newPay').value.trim(); if (!v) return; $('#payChips').insertAdjacentHTML('beforeend', `<span class="chip" data-pay="${esc(v)}">${esc(v)}<button type="button" data-rm-pay>✕</button></span>`); $('#newPay').value = ''; };
    if ($('#addPay')) { $('#addPay').onclick = addPay; $('#newPay').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addPay(); } }; }
    $('#view').addEventListener('click', (e) => { const rm = e.target.closest('[data-rm-pay]'); if (rm) rm.closest('.chip').remove(); });
    $('#sForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target; const raw = formData(f); const body = {};
      if (tab === 'local') ['brand_name', 'instagram', 'whatsapp', 'phone_display', 'address', 'city', 'maps_url', 'maps_embed'].forEach((k) => body[k] = raw[k]);
      if (tab === 'horarios') {
        body.hours = {}; DAYS.forEach(([k]) => body.hours[k] = { open: checked(f, `h_${k}_open`), from: raw[`h_${k}_from`], to: raw[`h_${k}_to`] });
        body.hours_label = raw.hours_label; body.closed_message = raw.closed_message; body.accept_orders_when_closed = checked(f, 'accept_orders_when_closed');
      }
      if (tab === 'pedidos') {
        body.delivery = { enabled: checked(f, 'd_enabled'), fee: raw.d_fee, free_from: raw.d_free_from, min_order: raw.d_min_order, eta: raw.d_eta, zones: raw.d_zones };
        body.takeaway = { enabled: checked(f, 't_enabled'), eta: raw.t_eta };
        body.payments = $$('#payChips .chip').map((c) => c.dataset.pay);
      }
      if (tab === 'textos') ['eyebrow', 'hero_title', 'hero_title_em', 'hero_text', 'about_title', 'about_title_em', 'about_text', 'featured_eyebrow', 'featured_title', 'featured_title_em', 'footer_text', 'meta_title', 'meta_description', 'order_prefix'].forEach((k) => body[k] = raw[k]);
      if (tab === 'imagenes') { body.hero_image = raw.hero_image; body.about_images = [raw.about_image_0, raw.about_image_1, raw.about_image_2].filter(Boolean); }
      try { await api('PUT', '/settings', body); toast('Configuración guardada'); refreshQuickStatus(); } catch (err) { fail(err); }
    };
  };

  // ---------- cuenta ----------
  views.account = async () => {
    const me = await api('GET', '/me');
    $('#view').innerHTML = `
      <div class="grid cols-2">
        <div class="card"><h3>Cambiar contraseña</h3>
          <p class="muted small">Usuario: <b>${esc(me.user?.username)}</b>. Al cambiarla se cierran todas las sesiones abiertas.</p>
          <form id="pwForm">
            <div class="field"><label>Contraseña actual</label><input type="password" name="current" required autocomplete="current-password" /></div>
            <div class="field"><label>Nueva contraseña (mín. 8)</label><input type="password" name="next" required minlength="8" autocomplete="new-password" /></div>
            <div class="field"><label>Repetir nueva contraseña</label><input type="password" name="next2" required minlength="8" autocomplete="new-password" /></div>
            <button class="btn primary" type="submit">Cambiar contraseña</button>
          </form>
        </div>
        <div class="card"><h3>Copia de seguridad</h3>
          <p class="muted small">Descarga un archivo con toda la carta, la configuración y el historial de pedidos. Guardalo cada tanto.</p>
          <a class="btn" href="/api/admin/export" download>⬇️ Descargar backup (JSON)</a>
          <h3 style="margin-top:22px">Ayuda rápida</h3>
          <ul class="small" style="padding-left:18px;line-height:1.7">
            <li><b>Hoy no hay algo:</b> Productos → apagar "Disponible" (queda como AGOTADO).</li>
            <li><b>Cambiar precios:</b> Productos → Editar → Precios.</li>
            <li><b>Feriado o vacaciones:</b> Inicio → Modo → Forzar cerrado.</li>
            <li><b>Aviso urgente en el sitio:</b> Inicio → Aviso.</li>
            <li><b>Cambió el costo de envío:</b> Configuración → Delivery y pagos.</li>
          </ul>
        </div>
      </div>`;
    $('#pwForm').onsubmit = async (e) => {
      e.preventDefault();
      const d = formData(e.target);
      if (d.next !== d.next2) return toast('Las contraseñas nuevas no coinciden', true);
      try { await api('PUT', '/password', { current: d.current, next: d.next }); toast('Contraseña cambiada. Ingresá de nuevo.'); showLogin(); } catch (err) { fail(err); }
    };
  };

  // ---------- init ----------
  (async () => {
    try { const me = await api('GET', '/me'); if (me.user) showApp(); else showLogin(); } catch { showLogin(); }
  })();
})();
