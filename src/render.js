// Render del home: inyecta metadatos SEO y los datos iniciales en la plantilla public/index.html.
// Lo usan el servidor (server.js) y la exportación estática (scripts/build-static.js).
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const versionAssets = (html, v) => html.replace(/(href|src)="(\/(?:css|js|admin)\/[^"?]+\.(?:css|js))"/g, (m, attr, p) => `${attr}="${p}?v=${v}"`);

function renderHome({ template, data, origin, assetV }) {
  const s = data.settings;
  const hoursSpec = Object.entries(s.hours || {}).filter(([, h]) => h.open).map(([d, h]) => ({
    '@type': 'OpeningHoursSpecification', dayOfWeek: { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }[d], opens: h.from, closes: h.to
  }));
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Restaurant', name: s.brand_name, url: origin, image: origin + (s.hero_image || '/assets/burger-02.jpg'),
    servesCuisine: 'Hamburguesas', priceRange: '$$', telephone: '+' + (s.whatsapp || ''),
    address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: 'Mercedes', addressRegion: 'Buenos Aires', addressCountry: 'AR' },
    openingHoursSpecification: hoursSpec, sameAs: s.instagram ? [`https://instagram.com/${s.instagram}`] : [],
    hasMenu: origin + '/#menu', acceptsReservations: false
  };
  const meta = [
    `<title>${escapeHtml(s.meta_title || s.brand_name)}</title>`,
    `<meta name="description" content="${escapeHtml(s.meta_description || '')}" />`,
    `<link rel="canonical" href="${escapeHtml(origin)}/" />`,
    `<meta property="og:type" content="restaurant" />`,
    `<meta property="og:title" content="${escapeHtml(s.meta_title || s.brand_name)}" />`,
    `<meta property="og:description" content="${escapeHtml(s.meta_description || '')}" />`,
    `<meta property="og:image" content="${escapeHtml(origin + (s.hero_image || '/assets/burger-02.jpg'))}" />`,
    `<meta property="og:url" content="${escapeHtml(origin)}/" />`,
    `<meta property="og:locale" content="es_AR" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="theme-color" content="#123b2e" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>`
  ].join('\n    ');
  const initial = JSON.stringify(data).replace(/</g, '\\u003c');
  return versionAssets(template, assetV).replace('<!--META-->', meta).replace('<!--INITIAL_DATA-->', `<script id="initial-data" type="application/json">${initial}</script>`);
}

module.exports = { renderHome, versionAssets, escapeHtml };
