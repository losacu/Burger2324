/* Burger 2324 — sitio público: menú, carrito y pedido por WhatsApp */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + Number(n || 0).toLocaleString('es-AR');
  const DAY_NAMES = { mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo' };
  const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const isContainImage = (url) => /\/(lata|botella|aquarius|agua)/.test(url || '');

  // ---------- estado ----------
  let data = null;
  try { data = JSON.parse($('#initial-data').textContent); } catch { data = null; }
  // Modo estático (Netlify, etc.): no hay servidor; estado y mensaje de WhatsApp se calculan en el navegador.
  const STATIC = !!(data && data.static);
  const products = new Map();

  function computeStatusClient(s) {
    const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const NAMES = { mon: 'lunes', tue: 'martes', wed: 'miércoles', thu: 'jueves', fri: 'viernes', sat: 'sábado', sun: 'domingo' };
    const hours = s.hours || {};
    const override = s.status_override || 'auto';
    let day, minutes;
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(m.weekday);
      minutes = (parseInt(m.hour, 10) % 24) * 60 + parseInt(m.minute, 10);
    } catch { const n = new Date(); day = n.getDay(); minutes = n.getHours() * 60 + n.getMinutes(); }
    const toMin = (t) => { const [h, mm] = String(t || '0:0').split(':').map(Number); return h * 60 + (mm || 0); };
    const within = (h, mins) => { if (!h || !h.open) return false; const f = toMin(h.from), t = toMin(h.to); return t > f ? mins >= f && mins < t : mins >= f || mins < t; };
    const today = hours[DAYS[day]], yest = hours[DAYS[(day + 6) % 7]];
    let open = within(today, minutes) || (yest && yest.open && toMin(yest.to) < toMin(yest.from) && minutes < toMin(yest.to));
    if (override === 'open') open = true;
    if (override === 'closed') open = false;
    let next = null;
    if (!open && override !== 'closed') {
      for (let i = 0; i < 7; i++) {
        const k = DAYS[(day + i) % 7], h = hours[k];
        if (!h || !h.open) continue;
        if (i === 0 && minutes >= toMin(h.from)) continue;
        next = { day: k, from: h.from, label: i === 0 ? `hoy a las ${h.from}` : i === 1 ? `mañana a las ${h.from}` : `el ${NAMES[k]} a las ${h.from}` };
        break;
      }
    }
    return { open: !!open, override, today: today && today.open ? `${today.from} a ${today.to}` : 'cerrado', next, accepts_orders: !!open || !!s.accept_orders_when_closed };
  }

  function buildMessageClient(form, lines, subtotal, fee, total, st) {
    const s = data.settings;
    const code = `${s.order_prefix || 'B2324'}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const out = [];
    out.push(`🍔 *Pedido ${code}* — ${s.brand_name || 'Burger 2324'}`);
    out.push(`👤 ${form.name}${form.phone ? ' · ' + form.phone : ''}`);
    out.push(drawerState.mode === 'delivery' ? `🛵 *Delivery* → ${form.address}` : '🏪 *Retiro en el local*');
    if (form.payment) out.push(`💳 Pago: ${form.payment}`);
    out.push('');
    for (const l of lines) {
      out.push(`• ${l.qty}x ${l.product.name}${l.variantLabel ? ' (' + l.variantLabel + ')' : ''} — ${money(l.total)}`);
      if (l.note) out.push(`   ↳ ${l.note}`);
    }
    out.push('');
    if (drawerState.mode === 'delivery') { out.push(`Subtotal: ${money(subtotal)}`); out.push(`Envío: ${fee ? money(fee) : 'sin cargo'}`); }
    out.push(`*TOTAL: ${money(total)}*`);
    if (form.notes) { out.push(''); out.push(`📝 ${form.notes}`); }
    if (!st.open) { out.push(''); out.push('(Pedido enviado fuera del horario de atención)'); }
    const message = out.join('\n');
    return { code, total, message, whatsapp_url: `https://wa.me/${String(s.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}` };
  }

  const cart = {
    items: [],
    load() { try { this.items = JSON.parse(localStorage.getItem('b2324.cart') || '[]'); } catch { this.items = []; } },
    save() { try { localStorage.setItem('b2324.cart', JSON.stringify(this.items)); } catch {} },
    add(productId, variant, qty = 1) {
      const p = products.get(productId);
      if (!p || !p.available) return false;
      const key = `${productId}:${variant}`;
      const existing = this.items.find((i) => i.key === key);
      if (existing) existing.qty = Math.min(20, existing.qty + qty);
      else this.items.push({ key, product_id: productId, variant, qty, note: '' });
      this.save(); renderCartBadge(); return true;
    },
    setQty(key, qty) { const it = this.items.find((i) => i.key === key); if (!it) return; it.qty = qty; if (it.qty <= 0) this.items = this.items.filter((i) => i.key !== key); this.save(); renderCartBadge(); },
    setNote(key, note) { const it = this.items.find((i) => i.key === key); if (it) { it.note = note.slice(0, 120); this.save(); } },
    clear() { this.items = []; this.save(); renderCartBadge(); },
    lines() {
      return this.items.map((it) => {
        const p = products.get(it.product_id);
        if (!p) return null;
        const v = p.variants[it.variant] || p.variants[0];
        return { ...it, product: p, variantLabel: v?.label || '', unit: v?.price || 0, total: (v?.price || 0) * it.qty };
      }).filter(Boolean);
    },
    subtotal() { return this.lines().reduce((a, l) => a + l.total, 0); },
    count() { return this.items.reduce((a, i) => a + i.qty, 0); }
  };

  const customer = {
    get() { try { return JSON.parse(localStorage.getItem('b2324.customer') || '{}'); } catch { return {}; } },
    set(obj) { try { localStorage.setItem('b2324.customer', JSON.stringify({ ...this.get(), ...obj })); } catch {} }
  };

  // ---------- render ----------
  function renderAll() {
    if (!data) return;
    const s = data.settings;
    for (const c of data.categories) for (const p of c.products) products.set(p.id, p);
    // limpiar del carrito productos que ya no existen
    cart.items = cart.items.filter((i) => products.has(i.product_id));

    const wa = `https://wa.me/${s.whatsapp}`;
    const waHello = `${wa}?text=${encodeURIComponent('Hola! Quiero hacer un pedido 🍔')}`;

    // anuncio
    const ann = $('#announcement');
    if (s.announcement?.active && s.announcement.text) { ann.textContent = s.announcement.text; ann.hidden = false; } else ann.hidden = true;

    // hero
    $('#heroEyebrow').textContent = s.eyebrow || '';
    $('#heroTitle').textContent = s.hero_title || '';
    $('#heroTitleEm').textContent = s.hero_title_em || '';
    $('#heroText').textContent = s.hero_text || '';
    $('#heroPhoto').style.backgroundImage = `url('${esc(s.hero_image || '/assets/burger-02.jpg')}')`;
    $('#heroWhatsapp').href = waHello;
    $('#waFloat').href = waHello;
    $('#footerWhatsapp').href = waHello;
    $('#footerInstagram').href = `https://instagram.com/${esc(s.instagram || '')}`;
    $('#footerText').textContent = s.footer_text || '';

    if (STATIC) data.status = computeStatusClient(s);
    renderStatus(data.status);
    renderPromos();
    renderMenu();
    renderFeatured();
    renderAbout();
    renderGallery();
    renderFind();
    renderCartBadge();
  }

  function renderStatus(st) {
    if (!st) return;
    data.status = st;
    const s = data.settings;
    const label = st.open ? `Abierto ahora · hoy ${st.today}` : (st.next ? `Cerrado · abre ${st.next.label}` : 'Cerrado');
    const hero = $('#heroStatus'); hero.textContent = label; hero.className = 'hero-status ' + (st.open ? 'open' : 'closed');
    const nav = $('#navStatus'); nav.textContent = st.open ? 'Abierto' : 'Cerrado'; nav.className = 'nav-status ' + (st.open ? 'open' : 'closed');
    nav.title = label;
    if (!st.open && s.hours_label) nav.title = s.hours_label;
  }

  function renderPromos() {
    const promos = data.promos || [];
    const sec = $('#promos');
    if (!promos.length) { sec.hidden = true; return; }
    sec.hidden = false;
    $('#promosTrack').innerHTML = promos.map((p) => `
      <article class="promo ${p.image ? '' : 'no-img'}">
        ${p.image ? `<div class="promo-img" style="background-image:url('${esc(p.image)}')"></div>` : ''}
        <div class="promo-body"><b>${esc(p.title)}</b>${p.description ? `<span>${esc(p.description)}</span>` : ''}</div>
      </article>`).join('');
  }

  function burgerCard(p, i) {
    const multi = p.variants.length > 1;
    return `
      <article class="menu-card ${p.available ? '' : 'soldout'}" data-id="${p.id}">
        <div class="card-photo ${p.image ? '' : 'empty'}" ${p.image ? `style="background-image:url('${esc(p.image)}')"` : ''}>
          <span class="card-no">${String(i + 1).padStart(2, '0')}</span>
          ${p.badge && p.available ? `<span class="badge">${esc(p.badge)}</span>` : ''}
          ${p.available ? '' : '<span class="soldout-tag">AGOTADO HOY</span>'}
        </div>
        <div class="card-content">
          <div class="card-title">${esc(p.name)}${p.subtitle ? `<small>/ ${esc(p.subtitle)}</small>` : ''}</div>
          <p class="ingredients">${esc(p.description)}</p>
          ${multi ? `<div class="sizes" role="group" aria-label="Tamaño de ${esc(p.name)}">${p.variants.map((v, x) => `<button type="button" class="${x === 0 ? 'active' : ''}" data-variant="${x}" aria-pressed="${x === 0}">${esc(v.label)}</button>`).join('')}</div>` : ''}
          <div class="card-bottom">
            <span class="price" data-price>${money(p.variants[0]?.price)}</span>
            <button type="button" class="add-btn" data-add ${p.available ? '' : 'disabled'}>${p.available ? 'PEDIR <b>↗</b>' : 'AGOTADO'}</button>
          </div>
        </div>
      </article>`;
  }

  function compactCard(p) {
    const multi = p.variants.length > 1;
    return `
      <article class="extra-card ${p.available ? '' : 'soldout'}" data-id="${p.id}">
        <div class="extra-photo ${isContainImage(p.image) ? 'contain' : ''}" style="background-image:url('${esc(p.image || '/assets/brand-02.jpg')}')" role="img" aria-label="${esc(p.name)}">${p.available ? '' : '<span class="soldout-tag">AGOTADO</span>'}</div>
        <div class="extra-content">
          <div>
            <h4>${esc(p.name)}${p.subtitle ? `<small>${esc(p.subtitle)}</small>` : ''}</h4>
            ${p.description ? `<p>${esc(p.description)}</p>` : ''}
            ${multi ? `<div class="sizes" role="group" aria-label="Opciones de ${esc(p.name)}">${p.variants.map((v, x) => `<button type="button" class="${x === 0 ? 'active' : ''}" data-variant="${x}" aria-pressed="${x === 0}">${esc(v.label)}</button>`).join('')}</div>` : ''}
          </div>
          <div><strong data-price>${money(p.variants[0]?.price)}</strong><button type="button" class="add-btn" data-add ${p.available ? '' : 'disabled'}>${p.available ? 'PEDIR <b>↗</b>' : 'AGOTADO'}</button></div>
        </div>
      </article>`;
  }

  function renderMenu() {
    const cats = data.categories;
    $('#catNav').innerHTML = cats.map((c) => `<a href="#cat-${esc(c.slug)}">${esc(c.name)}</a>`).join('');
    $('#menuRoot').innerHTML = cats.map((c) => `
      <section class="cat" id="cat-${esc(c.slug)}">
        <div class="cat-head"><h3>${esc(c.name)}</h3>${c.tagline ? `<span>${esc(c.tagline)}</span>` : ''}${c.description ? `<p>${esc(c.description)}</p>` : ''}</div>
        <div class="${c.layout === 'burger' ? 'menu-grid' : 'extras-grid'}">${c.products.map((p, i) => c.layout === 'burger' ? burgerCard(p, i) : compactCard(p)).join('')}</div>
      </section>`).join('');
    setupCatNavObserver();
  }

  function renderFeatured() {
    const f = data.featured;
    const sec = $('#featured');
    if (!f) { sec.hidden = true; return; }
    sec.hidden = false;
    const s = data.settings;
    $('#featuredEyebrow').textContent = s.featured_eyebrow || 'LA QUE NO FALLA';
    $('#featuredTitle').textContent = s.featured_title || '¿Cuál es';
    $('#featuredTitleEm').textContent = s.featured_title_em || 'la tuya?';
    $('#featuredImage').style.backgroundImage = `url('${esc(f.image || '/assets/burger-03.jpg')}')`;
    $('#featuredName').innerHTML = `${esc(f.name)} ${f.subtitle ? `<small>/ ${esc(f.subtitle)}</small>` : ''}`;
    $('#featuredDesc').textContent = f.description || '';
    $('#featuredPrice').textContent = money(Math.min(...f.variants.map((v) => v.price)));
    $('#featuredAdd').onclick = () => { if (cart.add(f.id, 0)) openCart(); };
  }

  function renderAbout() {
    const s = data.settings;
    $('#aboutTitle').textContent = s.about_title || '';
    $('#aboutTitleEm').textContent = s.about_title_em || '';
    $('#aboutText').innerHTML = String(s.about_text || '').split(/\n{2,}|\n/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
    const imgs = (s.about_images || []).filter(Boolean).slice(0, 3);
    $('#aboutImages').innerHTML = imgs.map((u) => `<div style="background-image:url('${esc(u)}')" role="img" aria-label="Foto de Burger 2324"></div>`).join('');
    $('#aboutImages').hidden = !imgs.length;
  }

  function renderGallery() {
    const g = data.gallery || [];
    const sec = $('#gallery');
    if (!g.length) { sec.hidden = true; return; }
    sec.hidden = false;
    $('#galleryGrid').innerHTML = g.map((x) => `<div style="background-image:url('${esc(x.image)}')" role="img" aria-label="${esc(x.caption || 'Foto')}">${x.caption ? `<span>${esc(x.caption)}</span>` : ''}</div>`).join('');
  }

  function renderFind() {
    const s = data.settings;
    const st = data.status;
    const addr = $('#findAddress'); addr.textContent = `${s.address} · ${s.city}`; addr.href = s.maps_url || '#';
    $('#findHoursLabel').textContent = s.hours_label || '';
    const todayIdx = new Date().getDay(); // aproximación local; el server manda el estado real
    const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][todayIdx];
    $('#hoursTable').innerHTML = DAY_ORDER.map((d) => {
      const h = (s.hours || {})[d];
      const open = h && h.open;
      return `<span class="${d === todayKey ? 'today' : ''} ${open ? '' : 'closed'}">${DAY_NAMES[d]}</span><span class="${d === todayKey ? 'today' : ''} ${open ? '' : 'closed'}">${open ? `${h.from} a ${h.to}` : 'Cerrado'}</span>`;
    }).join('');
    const phone = $('#findPhone'); phone.textContent = `${s.phone_display || s.whatsapp} · WhatsApp`; phone.href = `https://wa.me/${s.whatsapp}`;
    const ig = $('#findInstagram'); ig.textContent = s.instagram ? `@${s.instagram}` : ''; ig.href = `https://instagram.com/${esc(s.instagram || '')}`; ig.hidden = !s.instagram;
    const d = s.delivery || {};
    const parts = [];
    if (d.enabled) {
      parts.push(d.fee ? `Envío ${money(d.fee)}` : 'Envío sin cargo');
      if (d.free_from) parts.push(`gratis desde ${money(d.free_from)}`);
      if (d.min_order) parts.push(`mínimo ${money(d.min_order)}`);
      if (d.eta) parts.push(`demora ${d.eta}`);
      if (d.zones) parts.push(d.zones);
    }
    if (s.takeaway?.enabled) parts.push(`Retiro en el local${s.takeaway.eta ? ` (${s.takeaway.eta})` : ''}`);
    $('#findDeliveryText').textContent = parts.join(' · ');
    $('#findDelivery').hidden = !parts.length;
    $('#findPaymentsText').textContent = (s.payments || []).join(' · ');
    $('#findPayments').hidden = !(s.payments || []).length;
    const map = $('#mapBox');
    const q = encodeURIComponent(`${s.address}, ${s.city}`);
    if (s.maps_embed) map.innerHTML = s.maps_embed;
    else map.innerHTML = `<iframe title="Mapa: ${esc(s.address)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${q}&output=embed&z=16"></iframe>`;
    void st;
  }

  function setupCatNavObserver() {
    if (!('IntersectionObserver' in window)) return;
    const links = $$('#catNav a');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    $$('.cat').forEach((c) => obs.observe(c));
  }

  // ---------- carrito UI ----------
  function renderCartBadge() {
    const n = cart.count();
    const badge = $('#cartCount'); badge.textContent = n; badge.hidden = n === 0;
    const bar = $('#mobileBar'); bar.hidden = n === 0 || $('#cartDrawer').classList.contains('open');
    $('#mobileBarCount').textContent = `${n} ${n === 1 ? 'ítem' : 'ítems'}`;
    $('#mobileBarTotal').textContent = money(cart.subtotal());
  }

  let drawerState = { mode: 'delivery', error: '', success: null, sending: false, editForm: false, showNotes: false };
  try { const m = localStorage.getItem('b2324.mode'); if (m === 'takeaway' || m === 'delivery') drawerState.mode = m; } catch {}

  function openCart() {
    drawerState.success = null; drawerState.error = ''; drawerState.editForm = false;
    renderDrawer();
    $('#cartDrawer').classList.add('open');
    $('#cartDrawer').setAttribute('aria-hidden', 'false');
    $('#drawerBackdrop').hidden = false;
    document.body.classList.add('no-scroll');
    renderCartBadge();
    setTimeout(() => $('#drawerClose').focus(), 50);
  }
  function closeCart() {
    $('#cartDrawer').classList.remove('open');
    $('#cartDrawer').setAttribute('aria-hidden', 'true');
    $('#drawerBackdrop').hidden = true;
    document.body.classList.remove('no-scroll');
    renderCartBadge();
  }

  function renderDrawer() {
    const body = $('#drawerBody');
    const s = data.settings;
    const st = data.status;
    if (drawerState.success) {
      const r = drawerState.success;
      body.innerHTML = `
        <div class="success">
          <div class="ok">✓</div>
          <h4>Pedido ${esc(r.code)} listo</h4>
          <p>Ahora mandalo por WhatsApp para que lo confirmemos. El mensaje ya va armado con todo el detalle.</p>
          <a class="btn btn-wa" href="${esc(r.whatsapp_url)}" target="_blank" rel="noreferrer">ABRIR WHATSAPP Y ENVIAR</a>
          <p class="drawer-note">Total: <b>${money(r.total)}</b>. Si no se abre WhatsApp, tocá el botón de arriba.</p>
          <button type="button" class="link-secondary" data-new-order>Hacer otro pedido</button>
        </div>`;
      return;
    }
    const lines = cart.lines();
    if (!lines.length) {
      body.innerHTML = `<div class="cart-empty"><b>Todavía no hay nada</b>Tocá PEDIR en cualquier producto y aparece acá.<br/><br/><a class="btn btn-red" href="#menu" data-close-cart>VER MENÚ</a></div>`;
      return;
    }
    const d = s.delivery || {}, t = s.takeaway || {};
    const deliveryOk = d.enabled !== false, takeawayOk = t.enabled !== false;
    if (drawerState.mode === 'delivery' && !deliveryOk) drawerState.mode = 'takeaway';
    if (drawerState.mode === 'takeaway' && !takeawayOk && deliveryOk) drawerState.mode = 'delivery';
    const c = customer.get();
    const payments = (s.payments && s.payments.length) ? s.payments : ['Efectivo', 'Transferencia'];
    const cashOnly = lines.some((l) => l.product.cash_only);
    const payment = cashOnly ? 'Efectivo' : (payments.includes(c.payment) ? c.payment : payments[0]);
    const subtotal = cart.subtotal();
    let fee = 0;
    if (drawerState.mode === 'delivery') { fee = Number(d.fee) || 0; if (d.free_from && subtotal >= Number(d.free_from)) fee = 0; }
    const total = subtotal + fee;
    const belowMin = drawerState.mode === 'delivery' && d.min_order && subtotal < Number(d.min_order);
    // Cliente que ya pidió antes: datos guardados → resumen de una línea, sin formulario (2 clicks).
    const hasSaved = !!(c.name && (drawerState.mode === 'takeaway' || c.address));
    const showForm = drawerState.editForm || !hasSaved;

    body.innerHTML = `
      <div class="cart-lines">${lines.map((l) => `
        <div class="cart-item" data-key="${esc(l.key)}">
          <div class="thumb ${isContainImage(l.product.image) ? 'contain' : ''}" style="background-image:url('${esc(l.product.image || '/assets/brand-02.jpg')}')"></div>
          <div>
            <b>${esc(l.product.name)}${l.variantLabel ? ` <small>${esc(l.variantLabel)}</small>` : ''}</b>
            <div class="qty"><button type="button" data-qty="-1" aria-label="Quitar uno">−</button><span>${l.qty}</span><button type="button" data-qty="1" aria-label="Agregar uno">+</button></div>
            ${l.note ? `<input class="cart-note" data-note maxlength="120" value="${esc(l.note)}" />` : /^COMBO/i.test(l.product.name) ? `<input class="cart-note" data-note placeholder="¿Qué burger y qué bebida?" maxlength="120" />` : `<button type="button" class="note-toggle" data-note-toggle>+ aclaración</button><input class="cart-note" data-note placeholder="Ej: sin cebolla" maxlength="120" hidden />`}
          </div>
          <div><div class="line-price">${money(l.total)}</div><button type="button" class="remove" data-remove>QUITAR</button></div>
        </div>`).join('')}
      </div>
      <a class="add-more" href="#menu" data-close-cart>+ Agregar algo más</a>

      <div class="mode-toggle" role="group" aria-label="Cómo lo querés">
        <button type="button" class="${drawerState.mode === 'delivery' ? 'active' : ''}" data-mode="delivery" ${deliveryOk ? '' : 'disabled'}>DELIVERY<small>${deliveryOk ? (d.fee ? 'envío ' + money(d.fee) : 'sin cargo') + (d.eta ? ' · ' + esc(d.eta) : '') : 'no disponible'}</small></button>
        <button type="button" class="${drawerState.mode === 'takeaway' ? 'active' : ''}" data-mode="takeaway" ${takeawayOk ? '' : 'disabled'}>RETIRO<small>${takeawayOk ? esc(t.eta || 'en el local') : 'no disponible'}</small></button>
      </div>

      ${showForm ? `
      <form id="orderForm" class="form-grid" novalidate>
        <div class="field"><label for="fName">Tu nombre</label><input id="fName" name="name" required maxlength="80" autocomplete="name" placeholder="Nombre" value="${esc(c.name || '')}" /></div>
        ${drawerState.mode === 'delivery' ? `<div class="field"><label for="fAddress">Dirección</label><input id="fAddress" name="address" required maxlength="200" autocomplete="street-address" placeholder="Calle y número, entre calles" value="${esc(c.address || '')}" /></div>` : ''}
        <div class="field"><span class="lbl">¿Cómo pagás?</span><div class="pay-chips">${payments.map((p) => `<label class="pay-chip ${cashOnly && p !== 'Efectivo' ? 'off' : ''}"><input type="radio" name="payment" value="${esc(p)}" ${p === payment ? 'checked' : ''} ${cashOnly && p !== 'Efectivo' ? 'disabled' : ''}/><span>${esc(p)}</span></label>`).join('')}</div>${cashOnly ? '<small class="hint-cash">Los combos se abonan solo en efectivo.</small>' : ''}</div>
        ${c.notes || drawerState.showNotes ? `<div class="field"><label for="fNotes">Aclaraciones</label><textarea id="fNotes" name="notes" maxlength="400" placeholder="Timbre, horario, con cuánto pagás…">${esc(c.notes || '')}</textarea></div>` : `<button type="button" class="note-toggle" data-notes-toggle>+ Agregar aclaración al pedido</button><input type="hidden" name="notes" value="" />`}
      </form>` : `
      <div class="summary-box">
        <div><b>${esc(c.name)}</b>${drawerState.mode === 'delivery' ? `<span>${esc(c.address)}</span>` : '<span>Retiro en el local</span>'}<span>${esc(payment)}${cashOnly ? ' (los combos son solo en efectivo)' : ''}${c.notes ? ' · ' + esc(c.notes) : ''}</span></div>
        <button type="button" class="link-btn" data-edit-form>Cambiar</button>
      </div>`}

      <div class="totals">
        ${drawerState.mode === 'delivery' && fee ? `<div><span>Subtotal</span><span>${money(subtotal)}</span></div><div><span>Envío</span><span>${money(fee)}</span></div>` : ''}
        <div class="grand"><span>TOTAL</span><span>${money(total)}</span></div>
      </div>
      ${belowMin ? `<div class="closed-box">El pedido mínimo para delivery es ${money(d.min_order)}. Sumá algo más o elegí retiro.</div>` : ''}
      ${!st.open ? `<div class="closed-box">${st.accepts_orders ? esc(s.closed_message || 'Estamos cerrados: tu pedido queda enviado y lo confirmamos al abrir.') : 'Estamos cerrados en este momento. ' + (st.next ? 'Abrimos ' + esc(st.next.label) + '.' : '')}</div>` : ''}
      ${drawerState.error ? `<div class="error-box">${esc(drawerState.error)}</div>` : ''}
      <button type="button" class="btn btn-wa" id="sendOrder" ${(belowMin || !st.accepts_orders || drawerState.sending) ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4M12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.7 15.7 2.2 14 2.2 12.1 2.2 6.7 6.6 2.3 12 2.3c2.6 0 5.1 1 6.9 2.9 1.9 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.7-9.8 9.7M20.3 3.7C18.1 1.5 15.1.3 12 .3 5.5.3.2 5.6.2 12.1c0 2.1.5 4.1 1.6 5.9L0 24l6.2-1.6c1.8 1 3.8 1.5 5.8 1.5 6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.5-8.4"/></svg>
        ${drawerState.sending ? 'ENVIANDO…' : 'ENVIAR PEDIDO POR WHATSAPP'}
      </button>
      <p class="drawer-note">Se abre WhatsApp con el pedido ya escrito: solo tocás enviar.</p>`;
  }

  function readForm() {
    const c = customer.get();
    const f = $('#orderForm');
    if (!f) return { name: c.name, address: c.address, payment: c.payment, notes: c.notes || '' };
    const o = Object.fromEntries(new FormData(f).entries());
    customer.set({ name: o.name, address: o.address ?? c.address, payment: o.payment, notes: o.notes ?? '' });
    return { ...o, address: o.address ?? c.address };
  }

  async function sendOrder() {
    const form = readForm();
    if (!form.name?.trim()) { drawerState.error = 'Decinos tu nombre para el pedido.'; drawerState.editForm = true; renderDrawer(); $('#fName')?.focus(); return; }
    if (drawerState.mode === 'delivery' && !form.address?.trim()) { drawerState.error = 'Necesitamos la dirección para el delivery.'; drawerState.editForm = true; renderDrawer(); $('#fAddress')?.focus(); return; }
    if (!form.payment) { const p = (data.settings.payments || ['Efectivo'])[0]; form.payment = p; customer.set({ payment: p }); }
    if (cart.lines().some((l) => l.product.cash_only)) form.payment = 'Efectivo';
    drawerState.error = ''; drawerState.sending = true; renderDrawer();
    if (STATIC) {
      const s = data.settings, d = s.delivery || {};
      const st = computeStatusClient(s);
      const lines = cart.lines();
      const subtotal = cart.subtotal();
      let fee = 0;
      if (drawerState.mode === 'delivery') { fee = Number(d.fee) || 0; if (d.free_from && subtotal >= Number(d.free_from)) fee = 0; }
      if (!st.accepts_orders) { drawerState.sending = false; drawerState.error = s.closed_message || 'Estamos cerrados en este momento.'; renderDrawer(); return; }
      drawerState.success = buildMessageClient(form, lines, subtotal, fee, subtotal + fee, st);
      drawerState.sending = false;
      cart.clear();
      renderDrawer();
      window.open(drawerState.success.whatsapp_url, '_blank', 'noopener');
      return;
    }
    const payload = {
      name: form.name, phone: '', address: form.address, payment: form.payment, notes: form.notes, mode: drawerState.mode,
      items: cart.items.map((i) => ({ product_id: i.product_id, variant: i.variant, qty: i.qty, note: i.note }))
    };
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      drawerState.sending = false;
      if (!res.ok) { drawerState.error = json.error || 'No pudimos registrar el pedido. Probá de nuevo.'; renderDrawer(); await refreshMenu(); return; }
      drawerState.success = json;
      cart.clear();
      renderDrawer();
      const w = window.open(json.whatsapp_url, '_blank', 'noopener');
      if (!w) { /* bloqueado: queda el botón en pantalla */ }
    } catch {
      drawerState.sending = false; drawerState.error = 'Sin conexión. Revisá internet y probá de nuevo.'; renderDrawer();
    }
  }

  async function refreshMenu() {
    if (STATIC) {
      if (!data) return;
      renderStatus(computeStatusClient(data.settings));
      if ($('#cartDrawer').classList.contains('open') && !drawerState.success) renderDrawer();
      return;
    }
    try {
      const res = await fetch('/api/menu', { cache: 'no-store' });
      if (!res.ok) return;
      const fresh = await res.json();
      const scrollY = window.scrollY;
      data = fresh; renderAll(); window.scrollTo(0, scrollY);
      if ($('#cartDrawer').classList.contains('open')) renderDrawer();
    } catch {}
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- eventos ----------
  document.addEventListener('click', (e) => {
    const sizeBtn = e.target.closest('.sizes button');
    if (sizeBtn) {
      const card = sizeBtn.closest('[data-id]');
      const p = products.get(Number(card.dataset.id));
      $$('.sizes button', card).forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      sizeBtn.classList.add('active'); sizeBtn.setAttribute('aria-pressed', 'true');
      const v = p.variants[Number(sizeBtn.dataset.variant)];
      $('[data-price]', card).textContent = money(v.price);
      return;
    }
    const addBtn = e.target.closest('[data-add]');
    if (addBtn && !addBtn.disabled) {
      const card = addBtn.closest('[data-id]');
      const id = Number(card.dataset.id);
      const active = $('.sizes button.active', card);
      const variant = active ? Number(active.dataset.variant) : 0;
      if (cart.add(id, variant)) openCart();
      return;
    }
    if (e.target.closest('[data-open-cart]') || e.target.closest('#cartBtn')) { e.preventDefault(); openCart(); return; }
    if (e.target.closest('[data-close-cart]') || e.target.closest('#drawerClose') || e.target === $('#drawerBackdrop')) { closeCart(); return; }
    if (e.target.closest('[data-new-order]')) { drawerState.success = null; renderDrawer(); return; }
    const modeBtn = e.target.closest('[data-mode]');
    if (modeBtn && !modeBtn.disabled) { readForm(); drawerState.mode = modeBtn.dataset.mode; drawerState.error = ''; try { localStorage.setItem('b2324.mode', drawerState.mode); } catch {} renderDrawer(); return; }
    if (e.target.closest('[data-edit-form]')) { drawerState.editForm = true; renderDrawer(); $('#fName')?.focus(); return; }
    if (e.target.closest('[data-notes-toggle]')) { readForm(); drawerState.showNotes = true; renderDrawer(); $('#fNotes')?.focus(); return; }
    const nt = e.target.closest('[data-note-toggle]');
    if (nt) { const inp = nt.nextElementSibling; nt.hidden = true; inp.hidden = false; inp.focus(); return; }
    const qtyBtn = e.target.closest('[data-qty]');
    if (qtyBtn) { readForm(); const key = qtyBtn.closest('[data-key]').dataset.key; const it = cart.items.find((i) => i.key === key); if (it) cart.setQty(key, it.qty + Number(qtyBtn.dataset.qty)); renderDrawer(); return; }
    const rm = e.target.closest('[data-remove]');
    if (rm) { readForm(); cart.setQty(rm.closest('[data-key]').dataset.key, 0); renderDrawer(); return; }
    if (e.target.closest('#sendOrder')) { sendOrder(); return; }
    if (e.target.closest('#navToggle')) {
      const nav = $('#mainNav'); const open = nav.classList.toggle('open');
      $('#navToggle').setAttribute('aria-expanded', String(open));
      return;
    }
    if (e.target.closest('#mainNav a')) { $('#mainNav').classList.remove('open'); $('#navToggle').setAttribute('aria-expanded', 'false'); }
  });

  document.addEventListener('input', (e) => {
    const note = e.target.closest('[data-note]');
    if (note) cart.setNote(note.closest('[data-key]').dataset.key, note.value);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#cartDrawer').classList.contains('open')) closeCart(); });

  // nav sólida al scrollear
  const onScroll = () => $('.nav').classList.toggle('solid', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // intro (una vez por sesión, corta, y nunca si el usuario prefiere menos animación)
  (function intro() {
    const pre = $('#preloader');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false; try { seen = sessionStorage.getItem('b2324.intro') === '1'; } catch {}
    if (seen || reduce || location.hash) { pre.classList.add('done'); pre.remove(); return; }
    document.body.classList.add('intro');
    const done = () => { pre.classList.add('done'); document.body.classList.remove('intro'); document.body.classList.add('intro-done'); try { sessionStorage.setItem('b2324.intro', '1'); } catch {} setTimeout(() => pre.remove(), 700); };
    $('#skipIntro').onclick = done;
    setTimeout(done, 1900);
  })();

  // ---------- init ----------
  cart.load();
  if (data) renderAll(); else refreshMenu();
  // refresco de disponibilidad y estado (por si el local marca algo agotado o cierra)
  setInterval(refreshMenu, STATIC ? 60e3 : 90e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshMenu(); });
})();
