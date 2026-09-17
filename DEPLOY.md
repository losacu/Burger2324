# Cómo publicar Burger 2324

Hay dos formas de publicarlo. Se pueden usar las dos a la vez (por ejemplo, Vercel como demo rápida y Railway como versión real).

| | Vercel (estático) | Railway (completo) |
|---|---|---|
| Sitio con carta, carrito y pedido por WhatsApp | ✅ | ✅ |
| Panel de administración `/admin` | ❌ | ✅ |
| Pedidos registrados en el panel | ❌ | ✅ |
| Cómo se cambia la carta | editando `src/seed-data.js` y volviendo a deployar | desde el panel, al instante |
| Costo | gratis | plan Hobby (~USD 5/mes) o crédito gratis de prueba |

## 0. Subir el código a GitHub (una sola vez)

El proyecto ya es un repositorio git. Crear un repo vacío en GitHub (por ejemplo `burger2324`) y:

```bash
git remote add origin https://github.com/TU-USUARIO/burger2324.git
git push -u origin main
```

## 1. Vercel (versión estática, gratis)

1. Entrar a <https://vercel.com/new> y elegir el repo `burger2324`.
2. Vercel lee `vercel.json` solo: build `npm run build:static`, salida `dist/`. No hay que tocar nada.
3. (Opcional) En **Environment Variables** agregar `SITE_URL` = `https://tu-dominio.com` para que los metadatos de Google y WhatsApp apunten al dominio real.
4. Deploy. Cada `git push` vuelve a generar el sitio.

Para cambiar precios o productos en esta versión: editar `src/seed-data.js`, hacer commit y push. Alternativa cómoda: correr el panel en la compu (`npm start` → `/admin`), editar ahí, y después exportar la carta al seed (ver "Sincronizar" más abajo).

## 2. Railway (versión completa con panel)

1. Entrar a <https://railway.com/new> → **Deploy from GitHub repo** → elegir `burger2324`. Railway usa el `Dockerfile` del proyecto.
2. En el servicio → **Variables**, agregar:

   | Variable | Valor |
   |---|---|
   | `DATA_DIR` | `/data` |
   | `COOKIE_SECURE` | `1` |
   | `ADMIN_USER` | `admin` |
   | `ADMIN_PASSWORD` | una contraseña fuerte (solo se usa la primera vez) |
   | `SITE_URL` | la URL pública, ej. `https://burger2324.up.railway.app` (se puede completar después del primer deploy) |
   | `TZ` | `America/Argentina/Buenos_Aires` |

3. En el servicio → **Volumes** → **Add Volume** → mount path `/data`. **Sin esto, la carta y las fotos se borran en cada deploy.**
4. En **Settings → Networking → Generate Domain** para tener la URL pública. Copiarla en `SITE_URL`.
5. Abrir `https://.../admin`, entrar con el usuario y contraseña de las variables, y cambiar la contraseña desde Cuenta.

Health check: Railway consulta `/healthz`; si responde `ok`, el deploy queda activo.

### Render / Fly.io / VPS con Docker

El mismo `Dockerfile` sirve. Montar un disco persistente en `/data` y definir las mismas variables. En un VPS:

```bash
docker build -t burger2324 .
docker run -d --name burger2324 -p 3000:3000 -v burger2324-data:/data \
  -e COOKIE_SECURE=1 -e SITE_URL=https://tu-dominio.com -e ADMIN_PASSWORD=cambiame burger2324
```

y un proxy con HTTPS adelante (Caddy: `tu-dominio.com { reverse_proxy localhost:3000 }`).

## 3. Sincronizar la carta del panel hacia la versión estática

Si el dueño edita la carta en Railway y también se quiere actualizar la copia de Vercel:

1. Panel → Cuenta → **Descargar backup (JSON)**.
2. Guardarlo como `data/import.json` en la compu y correr `npm run import-backup` (recrea la base local con esa carta).
3. `npm run build:static` genera `dist/` con la carta nueva; o hacer commit de `src/seed-data.js` actualizado con `npm run export-seed`.

## 4. Dominio propio

- Vercel: Settings → Domains → agregar `burger2324.com.ar` y apuntar el DNS como indica.
- Railway: Settings → Networking → Custom Domain, y un registro CNAME en el DNS.
- En los dos casos, poner el dominio final en `SITE_URL` y volver a deployar.

## Paso a paso sin saber git: del zip a Railway con el panel andando

Lo que hace falta: el archivo `burger2324-codigo.zip`, una cuenta de GitHub y una cuenta de Railway. Unos 20 minutos.

### A. Preparar el archivo

1. Descomprimir `burger2324-codigo.zip`. Adentro están directamente `server.js`, `Dockerfile`, `package.json` y las carpetas `src`, `public`, `scripts`. **No subir el zip: se suben los archivos que tiene adentro.**
2. Asegurarse de que Windows muestre los archivos ocultos (Explorador → Ver → Mostrar → Elementos ocultos): hay archivos que empiezan con punto (`.gitignore`, `.node-version`) que también se suben.

### B. GitHub (guarda el código)

1. Entrar a <https://github.com> y crear la cuenta si no tiene (gratis).
2. Arriba a la derecha, el **+** → **New repository**.
3. Repository name: `burger2324`. Dejarlo **Private**. No marcar "Add a README". Botón **Create repository**.
4. En la pantalla del repo vacío, hacer clic en el link **uploading an existing file** (o ir a **Add file → Upload files**).
5. Abrir la carpeta descomprimida, seleccionar **todo lo que hay adentro** (Ctrl+A) y arrastrarlo al recuadro de GitHub. Tiene que quedar `Dockerfile` en la raíz del repo, no adentro de una subcarpeta. Se tienen que ver subiendo las carpetas `src`, `public`, `scripts` y los archivos sueltos. Esperar a que termine la lista (son unos 60 archivos).
6. Abajo, en "Commit changes", botón verde **Commit changes**.
7. Verificar que en la página del repo aparezcan `Dockerfile`, `railway.json`, `package.json`, `server.js` y las carpetas. Si falta `Dockerfile`, repetir la subida solo con ese archivo.

### C. Railway (corre el sitio y el panel)

1. Entrar a <https://railway.com> → **Login** → elegir **Login with GitHub** y autorizar. Así Railway ve el repo.
2. Railway pide un plan: el **Hobby** cuesta USD 5 por mes e incluye ese mismo monto en uso (para este sitio sobra). El período de prueba gratis también sirve para mostrarlo.
3. **New Project** → **Deploy from GitHub repo** → elegir `burger2324`. Si no aparece, clic en **Configure GitHub App** y darle acceso a ese repo.
4. Railway detecta el `Dockerfile` y empieza a construir. Mientras tanto, seguir con los pasos de abajo (el primer deploy va a fallar o quedar sin datos hasta que estén las variables y el volumen; es normal).
5. Clic en el servicio (la tarjeta `burger2324`) → pestaña **Variables** → **Raw Editor** → pegar esto, cambiando la contraseña:

   ```
   DATA_DIR=/data
   COOKIE_SECURE=1
   ADMIN_USER=admin
   ADMIN_PASSWORD=PonerUnaContraseñaFuerte2026
   TZ=America/Argentina/Buenos_Aires
   NODE_ENV=production
   ```

   Botón **Update Variables**.
6. Volumen (donde se guardan la carta, los pedidos y las fotos): en el lienzo del proyecto, **clic derecho sobre el servicio → Attach Volume** (o botón **+ Create → Volume** y elegir el servicio). Mount path: `/data`. Confirmar. **Sin este paso, cada deploy borra todo lo cargado en el panel.**
7. Dirección pública: pestaña **Settings** → sección **Networking** → **Generate Domain**. Railway da algo como `burger2324-production.up.railway.app`. Copiarla.
8. Volver a **Variables** y agregar `SITE_URL=https://LA-DIRECCION-QUE-DIO-RAILWAY` (con `https://` y sin barra al final). Update Variables. Railway redeploya solo.
9. Pestaña **Deployments**: esperar a que el último quede en verde (**Active**). Si queda en rojo, abrir **View Logs** y mandar el texto del error.

### D. Probar

1. Abrir `https://LA-DIRECCION/` → tiene que verse el sitio con la carta.
2. Abrir `https://LA-DIRECCION/admin` → pide usuario y contraseña: los de las variables (`admin` y la contraseña elegida).
3. Adentro del panel, ir a **Cuenta → Cambiar contraseña** y poner una propia del dueño. Con eso se cierran las sesiones y ya queda listo para entregar.
4. Guardar la dirección del panel como favorito o como acceso directo en el celular del dueño.

### Cuando haya que actualizar el código

Volver al repo en GitHub → **Add file → Upload files** → arrastrar los archivos nuevos (reemplazan a los viejos) → **Commit changes**. Railway redeploya solo en un par de minutos. La carta y los pedidos no se tocan porque viven en el volumen.

## Checklist antes de mostrárselo al cliente

- [ ] Número de WhatsApp probado desde un celular sin el número agendado (¿lleva el 9? `5492324353266`).
- [ ] Horario real (Instagram dice 20:00, Pency dice 19:30).
- [ ] Costo de envío real (Pency dice $2.500 / $3.000; el sitio tiene $1.500 de ejemplo).
- [ ] Contenido de los combos confirmado.
- [ ] Contraseña del panel cambiada.
- [ ] Texto de "Nosotros" escrito por el dueño.
