# Burger 2324 — Auditoría del sitio original y propuestas

## 1. Para quién es el sitio y qué tiene que lograr

**Negocio:** hamburguesería de barrio en Mercedes (Bs. As.), solo delivery y take away, horario nocturno (19:30 a 23:30), pedidos por WhatsApp. Compite con Breaking Burger, Angus Brother, Morfi Burger, La Burguesía y con PedidosYa.

**Usuario típico:** entra desde el celular (más del 70 % del tráfico de restaurantes es mobile), muchas veces desde el link de Instagram, entre las 19 y las 23 hs, con hambre y poca paciencia. Quiere saber en 10 segundos: **¿está abierto?, ¿qué hay?, ¿cuánto sale?, ¿cómo pido?**

**Objetivo único del sitio:** convertir la visita en un pedido por WhatsApp con la menor fricción posible, sin pagar comisión a apps de delivery. Todo lo demás (historia, fotos, animaciones) es secundario.

## 2. Auditoría del sitio original (hecho con ChatGPT gratis)

Lo bueno: la identidad visual es fuerte (paleta verde/rojo/crema, tipografía Anton + serif), las fotos de producto son reales y la carta está completa. Eso se conservó.

Problemas encontrados, ordenados por impacto en ventas:

| # | Problema | Impacto | Estado |
|---|---|---|---|
| 1 | El botón "PEDIR" abría WhatsApp **vacío**: el cliente tenía que escribir el pedido a mano, el tamaño elegido no viajaba. | Alto: fricción máxima justo en el momento de conversión; errores de pedido. | ✅ Carrito + mensaje prellenado con ítems, tamaños, cantidades, dirección, pago y total. |
| 2 | No había forma de saber si el local estaba **abierto**. | Alto: mensajes a las 15 hs sin respuesta, cliente frustrado. | ✅ Estado ABIERTO/CERRADO calculado por horarios, próxima apertura, aviso al pedir fuera de horario. |
| 3 | Todos los precios y productos estaban **hardcodeados en el JS**: cambiar un precio requería a un programador. | Alto: con la inflación argentina, la carta cambia cada pocas semanas. | ✅ Panel de administración completo. |
| 4 | No existía "agotado": si se acababa un producto, seguía vendible. | Medio | ✅ Toggle de agotado por producto, visible como "AGOTADO HOY". |
| 5 | Sin costo de envío, zonas, mínimo ni medios de pago informados. | Medio: genera preguntas por WhatsApp y abandonos. | ✅ Configurable y visible en el sitio y en el mensaje. |
| 6 | Fotos de bebidas **hotlinkeadas** desde Jumbo, Día, Toledo, etc. (se pueden romper en cualquier momento y es uso indebido). Fotos de fondo de Unsplash genéricas. | Medio | ✅ Recortadas de la carta oficial y alojadas localmente; solo fotos propias. |
| 7 | Texto placeholder visible en producción: "[AGREGAR HISTORIA, AÑO DE FUNDACIÓN Y FILOSOFÍA]". | Medio: da imagen de sitio sin terminar. | ✅ Texto real editable desde el panel (el dueño debe completar su historia). |
| 8 | Animación de intro de 3 segundos **en cada visita**. | Medio: en mobile con hambre es una eternidad; penaliza en Google. | ✅ Se muestra una vez por sesión, dura 1,9 s, se puede saltar, y no aparece si el usuario prefiere menos animación. |
| 9 | El header no era fijo: al bajar se perdía el botón de pedir. | Medio | ✅ Header fijo con carrito, más barra inferior en mobile con total. |
| 10 | El botón del menú en mobile usaba `style.display` inline y no cerraba al elegir; sin estados de foco ni `aria` correctos. | Bajo/medio | ✅ Menú mobile accesible, cierra al navegar, foco visible. |
| 11 | SEO casi nulo: descripción genérica, sin Open Graph (al compartir en WhatsApp no aparece foto ni título), sin datos estructurados, sin favicon, sin sitemap/robots. | Medio: Google Maps/búsqueda local es la principal fuente de clientes nuevos. | ✅ Meta tags, Open Graph, JSON-LD de tipo Restaurant con horarios, favicon, sitemap, robots. |
| 12 | El mapa era un bloque naranja con un link. | Bajo | ✅ Google Maps embebido sin API key, editable. |
| 13 | Sprites de bebidas con `background-position` a mano: los ítems "Aquarius" y "Agua" mostraban texto recortado de la carta. | Bajo | ✅ Imágenes individuales. |
| 14 | Sin `width/height` en imágenes, sin `lazy loading`, CSS en una sola línea imposible de mantener. | Bajo | ✅ Reescrito. |
| 15 | Números de teléfono en formato ambiguo para WhatsApp. | **A verificar** | ⚠️ Ver punto 4. |

## 3. Qué tiene el sitio nuevo

**Sitio público**
- Carta por categorías con navegación pegajosa, tamaños (simple/doble/triple), etiquetas ("MÁS PEDIDA"), estado agotado.
- Carrito lateral con cantidades, aclaraciones por ítem, retiro o delivery, datos del cliente recordados, medio de pago, cálculo de envío (con envío gratis desde X y pedido mínimo).
- Envío por WhatsApp con mensaje completo y número de pedido.
- Estado abierto/cerrado en vivo, franja de avisos, franja de promos, producto destacado, sección "Nosotros", galería, horarios por día, mapa.
- Mobile first, accesible, rápido (sin frameworks, una sola petición de datos).

**Panel (`/admin`)**
- Inicio: pedidos y ventas de hoy y de la semana, pendientes, más pedidos del mes, forzar abierto/cerrado, aviso en el sitio.
- Pedidos: historial con estados (nuevo → confirmado → en preparación → listo → entregado / cancelado), botón para escribirle al cliente.
- Productos: alta, edición, foto (subir o elegir de biblioteca), precios por tamaño, agotado, visible, destacado, orden, buscador.
- Categorías, promos con fechas, galería.
- Configuración: local y contacto, horarios por día, delivery y retiro, medios de pago, textos de todas las secciones, imágenes, textos para Google.
- Cuenta: cambio de contraseña, backup JSON.

## 4. Cosas que el dueño tiene que confirmar antes de publicar

1. **Número de WhatsApp.** El sitio original usa `542324353266`. Para celulares argentinos, WhatsApp suele exigir el **9** después del 54: `5492324353266`. Probar el link `https://wa.me/542324353266` desde un celular que no tenga el número agendado; si no abre el chat, cambiarlo en Configuración → Local.
2. **Costo de envío, zonas y pedido mínimo.** Quedaron valores de ejemplo ($1.500, "Mercedes zona urbana").
3. **Medios de pago.** Quedaron Efectivo, Transferencia y Mercado Pago.
4. **Historia del local** (sección Nosotros) y subtítulos que inventé para dos burgers sin nombre: LA FLORIDA "Completa" y GOLDNEY "BBQ Crispy".
5. **Horarios**: martes a domingo 19:30 a 23:30, según el sitio original.
6. **Dominio** y dónde se va a alojar (ver README).

## 5. Propuestas de features (para que elijas)

### Ventas y pedidos
- **F1. Combos y armá-tu-combo.** Burger + papas + bebida con precio especial. Es lo que más sube el ticket promedio.
- **F2. Extras/adicionales por producto** (bacon extra, huevo, cheddar extra, sin cebolla) con precio, desde el panel.
- **F3. Cupones y descuentos** (código, porcentaje o monto, vencimiento, solo delivery/retiro, primer pedido).
- **F4. Programar pedido** ("para las 21:30") con validación contra los horarios.
- **F5. Envío por zonas** con precio distinto por barrio/radio, o cálculo por distancia con Google Maps.
- **F6. Pago online con Mercado Pago** (link de pago dentro del mensaje o checkout en el sitio). Reduce el "¿me pasás el alias?".
- **F7. Cliente recurrente**: "repetir mi último pedido" y favoritos guardados en el celular.
- **F8. Propina / redondeo** en el carrito (opcional, poco usado en Argentina).

### Operación del local
- **F9. Notificación de pedido nuevo al celular del dueño** (WhatsApp Cloud API, Telegram o email) aunque el cliente no mande el mensaje.
- **F10. Pantalla de cocina** (`/cocina`): lista de pedidos en vivo en una tablet, con sonido y cambio de estado con un toque.
- **F11. Impresión de comanda** en impresora térmica desde el navegador.
- **F12. Stock real**: cantidad disponible por producto, se descuenta con cada pedido y se marca agotado solo.
- **F13. Horarios especiales por fecha** (feriados, vacaciones) sin tocar el horario semanal.
- **F14. Varios usuarios** con roles (dueño, cajero, cocina).
- **F15. Registro de cambios** (quién cambió qué precio y cuándo).

### Marketing
- **F16. Integrar reseñas de Google** en la portada (con las estrellas) y botón "dejanos tu reseña".
- **F17. Feed de Instagram** real en la galería (últimos posts, sin subir fotos a mano).
- **F18. Newsletter / lista de WhatsApp**: captura de teléfono con permiso para avisar promos.
- **F19. Códigos QR** para la mesa/vidriera/bolsa que abren el menú con seguimiento de cuántos escanean.
- **F20. Google Analytics / Meta Pixel** con eventos de "agregó al carrito" y "envió pedido", para medir campañas de Instagram.
- **F21. Página de promo con link propio** (`/promo/2x1-martes`) para pautar en redes.

### Contenido y experiencia
- **F22. Modo oscuro** automático según el celular.
- **F23. Alérgenos e info nutricional** por producto (celiacos, vegetarianos: hoy no hay opción sin carne, vale pensar una).
- **F24. Buscador en la carta** y filtros (sin cerdo, picante, para compartir).
- **F25. Fotos optimizadas automáticamente** al subirlas (recorte cuadrado, WebP, varios tamaños): hoy pesan hasta 900 KB cada una.
- **F26. Idioma**: no aplica todavía; Mercedes es turismo interno.

### Técnico
- **F27. PWA**: instalable en el celular con ícono propio, funciona con mala conexión.
- **F28. Backups automáticos** diarios de `data/` a Google Drive o S3.
- **F29. Tests automáticos** de la API de pedidos (cálculo de totales, agotados, horarios).
- **F30. Monitoreo**: aviso si el sitio se cae (UptimeRobot, gratis).
- **F31. Importar/exportar carta en Excel** para actualizar muchos precios de una vez (útil con inflación).

### Mi recomendación para la primera tanda (mayor impacto / menor esfuerzo)
1. **F9** notificación al dueño (sin esto el panel de pedidos depende de que el cliente mande el WhatsApp).
2. **F2** adicionales por producto y **F1** combos.
3. **F31** actualización masiva de precios.
4. **F25** optimización de fotos.
5. **F16** reseñas de Google + **F20** medición.
6. **F27** PWA.

## Fuentes consultadas
- DoorDash Merchants, "Restaurant Website Checklist": <https://merchants.doordash.com/en-us/commerce-platform/restaurant-website-checklist>
- Homebase, "11 Restaurant Website Features You Need in 2026": <https://www.joinhomebase.com/blog/restaurant-website>
- Chowly, "Restaurant Website Design: 7 Must-Have Elements (2026)": <https://chowly.com/resources/blogs/restaurant-website-design-7-elements-of-a-high-converting-restaurant-website/>
- Menubly, "The Complete Guide To WhatsApp for Restaurants (2026)": <https://www.menubly.com/blog/whatsapp-for-restaurants/>
- Fudie, "WhatsApp Ordering for Restaurants: Setup Guide (2026)": <https://fudie.ai/blog/whatsapp-ordering-restaurants-guide/>
- MenuDigital, "Checklist: Cómo Digitalizar tu Restaurante en 2026": <https://menudigitalplus.com/checklist-digitalizar-restaurante>
- OlaClick, "Todo lo que necesitas tener en una hamburguesería": <https://olaclick.com/es/sistema-para/hamburgueseria/todo-lo-que-necesitas-tener-en-una-hamburgueseria/>
- Competencia local: Breaking Burger (<https://app.pedidosbcn.com/tienda/breaking-burger>), Angus Brother (<https://app.pedidosbcn.com/tienda/angus-brother>), PedidosYa Mercedes (<https://www.pedidosya.com.ar/restaurantes/mercedes/hamburguesas-delivery>)
