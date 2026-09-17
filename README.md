# Burger 2324 — sitio web + panel de administración

Sitio de pedidos por WhatsApp para **Burger 2324** (Mercedes, Buenos Aires) con un panel para que el dueño administre la carta, los precios, los horarios, el delivery y los pedidos sin tocar código.

- **Sitio público:** `/` — menú con carrito, pedido armado y enviado por WhatsApp.
- **Panel:** `/admin` — requiere usuario y contraseña.

## Requisitos

- Node.js **22.13 o superior** (usa SQLite integrado en Node, sin dependencias nativas).
- Nada más: no hay base de datos externa ni servicios pagos.

## Correr en la computadora

```bash
npm install
npm start
```

Abrí <http://localhost:3000> (sitio) y <http://localhost:3000/admin> (panel).

Primera vez: el panel crea el usuario **admin** con contraseña **burger2324** (o lo que definas en `ADMIN_USER` / `ADMIN_PASSWORD`). Cambiá la contraseña apenas entres (Cuenta → Cambiar contraseña).

Para desarrollo con recarga automática: `npm run dev`.

## Estructura

```
server.js              servidor Express, render del home con SEO, estáticos
src/db.js              SQLite (node:sqlite), esquema y carga inicial
src/seed-data.js       carta inicial (solo se usa si la base está vacía)
src/status.js          cálculo de abierto/cerrado según horarios (hora Argentina)
src/auth.js            sesiones (guardadas en SQLite), login, límite de intentos
src/routes/public.js   API pública: menú, estado, creación de pedidos
src/routes/admin.js    API del panel (requiere sesión)
public/index.html      plantilla del sitio (se le inyectan datos y metadatos)
public/css, public/js  estilos y lógica del sitio (carrito, WhatsApp)
public/admin/          panel (HTML + JS sin framework)
public/assets/         fotos de productos y marca
data/                  base de datos y fotos subidas (hacer backup de esta carpeta)
```

## Cómo funciona un pedido

1. El cliente arma el carrito en el sitio (tamaños, cantidades, aclaraciones).
2. Elige retiro o delivery, pone nombre/dirección/medio de pago.
3. El servidor **recalcula los precios desde la base** (no confía en el navegador), guarda el pedido y devuelve el mensaje.
4. Se abre WhatsApp con el mensaje ya escrito: número de pedido, ítems, total, dirección.
5. El pedido queda en el panel → Pedidos, aunque el cliente nunca mande el WhatsApp (sirve para ver abandonos).

## Variables de entorno

Ver `.env.example`. Las importantes en producción:

| Variable | Para qué |
|---|---|
| `SITE_URL` | URL pública, usada en SEO (canonical, Open Graph, sitemap) |
| `COOKIE_SECURE=1` | Obligatorio detrás de HTTPS |
| `DATA_DIR` | Carpeta persistente para la base y las fotos |
| `ADMIN_USER`, `ADMIN_PASSWORD` | Usuario inicial (solo primera vez) |
| `SESSION_SECRET` | Opcional; si falta se genera y guarda solo |

## Publicarlo

Guía paso a paso para **Vercel** (estático, gratis) y **Railway** (completo con panel) en [DEPLOY.md](DEPLOY.md). Resumen:

**Opción A — Railway / Render / Fly.io (más simple)**
1. Subir la carpeta a un repositorio de GitHub.
2. Crear el servicio apuntando al repo. Comando de inicio: `npm start`.
3. Agregar un **volumen persistente** montado en `/data` y definir `DATA_DIR=/data`.
4. Definir `SITE_URL`, `COOKIE_SECURE=1`, `ADMIN_PASSWORD`.
5. Conectar el dominio propio (ej. `burger2324.com.ar`).

**Opción B — VPS (DonWeb, Hostinger, Contabo, etc.)**
```bash
npm ci --omit=dev
npm i -g pm2
pm2 start server.js --name burger2324 --node-args="--no-warnings=ExperimentalWarning"
pm2 save && pm2 startup
```
Poner Caddy o Nginx adelante para HTTPS. Ejemplo con Caddy (`/etc/caddy/Caddyfile`):
```
burger2324.com.ar {
  reverse_proxy localhost:3000
}
```

**No sirve** hosting solo de HTML/PHP (tipo cPanel sin Node) ni Vercel/Netlify sin disco persistente: el panel necesita escribir en la base.

## Backups

Todo vive en `data/` (base SQLite + fotos subidas). Copiar esa carpeta es el backup completo. Desde el panel → Cuenta también se descarga un JSON con carta, configuración y pedidos.

## Comandos útiles

```bash
npm run reset-password -- admin nueva-contraseña   # si se olvidó la contraseña
```

## Seguridad aplicada

- Contraseñas con bcrypt; sesiones httpOnly + SameSite; cierre de sesiones al cambiar contraseña.
- Límite de intentos de login por IP (8 cada 15 min) y de pedidos por IP.
- Escrituras del panel exigen header `X-Requested-With` (anti CSRF).
- Subidas: solo JPG/PNG/WEBP, 8 MB máximo, verificación de firma del archivo, nombres aleatorios.
- Precios y disponibilidad se validan en el servidor al crear el pedido.
- Cabeceras `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, sin `X-Powered-By`.

## Versión estática (Netlify Drop, Vercel, GitHub Pages)

Netlify y similares no corren Node, así que el panel y la base de datos **no funcionan ahí**. Lo que sí se puede publicar es una exportación estática del sitio público con la carta actual congelada: el carrito, el estado abierto/cerrado y el pedido por WhatsApp funcionan enteramente en el navegador.

```bash
npm run build:static
# con dominio propio para el SEO:
SITE_URL=https://burger2324.com.ar npm run build:static
```

Genera `dist/`. Para Netlify Drop: comprimir el contenido de `dist/` y arrastrarlo en <https://app.netlify.com/drop>.

Flujo de trabajo con esta versión: editar la carta en el panel local (`npm start` → `/admin`), volver a correr `npm run build:static` y resubir. Los pedidos no quedan registrados (no hay servidor); llegan solo por WhatsApp.

## Créditos de imágenes

- Fotos de burgers, entradas y marca: material propio de Burger 2324.
- Fotos de bebidas (Coca-Cola, Fanta, Sprite, Aquarius): imágenes de producto tomadas de listados públicos de supermercados argentinos, recortadas y alojadas localmente (no se hotlinkean).
- Smartwater: foto de Connor J Williams en Wikimedia Commons, licencia [CC BY 2.0](https://creativecommons.org/licenses/by/2.0), recortada y con fondo removido.
