# PRD - Antia Platform

## Descripción General
Plataforma de monetización de contenido para el ecosistema iGaming. Permite a creadores de contenido (tipsters) vender suscripciones, gestionar pagos y participar en programas de afiliados.

## Productos

### AntiaPay
Solución de pagos para creadores:
- Pagos en 1 clic
- Suscripciones automáticas
- Gestión de accesos a Telegram
- Analytics en tiempo real

### AntiaLink
Red de afiliación premium:
- Enlaces geolocalizados
- Tracking en tiempo real
- Partners verificados (casas de apuestas)
- Landing pages personalizadas

## Stack Tecnológico
- **Frontend:** Next.js 14 + React + TailwindCSS
- **Backend:** NestJS + TypeScript
- **Base de datos:** MongoDB + Prisma
- **Pagos:** Stripe + Redsys
- **Comunicación:** Telegram Bot (Polling)
- **Emails:** Resend

## Arquitectura de Páginas

### Páginas Públicas
- `/` - Home principal de Antia
- `/antiapay` - Landing de AntiaPay
- `/antialink` - Landing de AntiaLink
- `/login` - Inicio de sesión
- `/register` - Registro
- `/go/[slug]` - Landing de afiliados

### Páginas Privadas
- `/dashboard/tipster` - Dashboard del tipster
- `/dashboard/client` - Dashboard del cliente
- `/dashboard/admin` - Panel de administración
- `/checkout/[productId]` - Proceso de pago

## Usuarios del Sistema
1. **SuperAdmin** - Gestión total de la plataforma
2. **Tipster** - Creadores de contenido
3. **Cliente** - Suscriptores de contenido

## Credenciales de Prueba
- SuperAdmin: `admin@antia.com` / `Admin123!`
- Tipster: `fausto.perez@antia.com` / `Tipster123!`
- Cliente: `cliente@example.com` / `Client123!`

---

## Changelog

### 2026-01-12 - Sistema de Solicitudes de Retiro (Panel Tipster + Admin)
**Completado:**
- ✅ **Nuevo modelo `WithdrawalRequest`** en Prisma schema:
  - ID, tipsterId, amountCents, currency, status (PENDING/APPROVED/PAID/REJECTED)
  - Datos fiscales del tipster snapshot (nombre, documento, país, dirección)
  - Datos bancarios snapshot (IBAN/PayPal/Crypto)
  - Número de factura único (ANTIA-YYYY-####)
  - URL del PDF de factura generado
  - Timestamps de cada estado (requestedAt, approvedAt, paidAt, rejectedAt)
- ✅ **Backend - Módulo de Retiros:**
  - `GET /api/withdrawals/balance` - Saldo disponible para retiro (ingresos - retirado - pendiente)
  - `POST /api/withdrawals/request` - Crear solicitud de retiro con generación automática de factura
  - `GET /api/withdrawals/my` - Mis solicitudes de retiro
  - `GET /api/admin/withdrawals` - Admin: Listar todas con stats
  - `PATCH /api/admin/withdrawals/:id/approve` - Admin: Aprobar solicitud
  - `PATCH /api/admin/withdrawals/:id/pay` - Admin: Marcar como pagado
  - `PATCH /api/admin/withdrawals/:id/reject` - Admin: Rechazar solicitud
- ✅ **Panel Tipster - Nueva pestaña "Solicitar Retiro" en Liquidaciones:**
  - Tarjeta de saldo disponible con botón "Solicitar Retiro"
  - Estadísticas: Total ventas, Retiros procesados, Solicitudes pendientes
  - Tabla de historial con: Factura, Fecha, Estado, Importe, Ver Factura
  - Modal para crear solicitud con validaciones (mínimo €5, saldo suficiente, datos bancarios requeridos)
  - Botones rápidos para montos comunes (€25, €50, €100, Todo)
- ✅ **Panel Admin - Nueva sección "Retiros / Pagos" en sidebar:**
  - Cards de estadísticas: Pendientes, Aprobadas, Pagadas, Rechazadas (con filtros)
  - Tabla completa: Factura, Tipster (nombre, email, fiscal), Fecha, Estado, Método, Importe
  - Acciones: Aprobar, Marcar Pagado, Rechazar
  - Modal de acción con formulario según tipo (pago: método+referencia, rechazo: motivo obligatorio)
  - Badge en sidebar con cantidad de solicitudes pendientes
- ✅ **Generación de Facturas HTML:**
  - Factura profesional con datos de Antia y del tipster
  - Número de factura único (ANTIA-2026-XXXX)
  - Datos del beneficiario (nombre fiscal, documento, país)
  - Datos bancarios para la transferencia
  - Concepto y desglose del importe
  - Guardado en `/app/backend/public/invoices/`

### 2026-01-12 - Foto de Perfil y Nuevo Diseño Catálogo de Productos
**Completado:**
- ✅ **Subida de Foto de Perfil:**
  - Nuevo endpoint `POST /api/upload/avatar` para subir avatares
  - UI en sección "Perfil" con preview de imagen actual
  - Validación de tipos (JPG, PNG, GIF, WEBP) y tamaño máximo 2MB
  - Avatar se guarda en `uploads/avatars/` y URL en `tipster_profiles.avatar_url`
- ✅ **Nuevo Diseño de "Mis productos" estilo catálogo (según diseño de Alex):**
  - Header banner con gradiente oscuro azul/morado
  - Avatar del tipster (cuadrado con bordes redondeados)
  - Nombre de tienda y subtítulo
  - Tab "Productos" con botón "+ Crear Producto"
  - Cards de productos rediseñadas:
    - Icono según tipo (bolsa = pago único, telegram = suscripción)
    - Título, descripción, badges (Activo/Pausado, tipo, canal Telegram)
    - Precio destacado en grande
    - Botones: Editar, Ver, Copiar Link, Compartir
  - Responsive mobile optimizado
- ✅ **Todas las funcionalidades anteriores mantenidas:**
  - Crear producto, Editar, Ver, Copiar enlaces, Compartir

### 2026-01-12 - Historial de Ventas en Mis Productos
**Completado:**
- ✅ **Renombrado "Crear producto" → "Mis productos"** en el sidebar del tipster
- ✅ **Nueva sección "Historial de Ventas"** debajo de la lista de productos:
  - Fecha y hora de cada venta
  - Nombre del producto y tipo (Suscripción/Pago único)
  - Email del cliente
  - Usuario de Telegram (si lo proporcionó)
  - Método de pago (Stripe, Redsys, Test)
  - Importe con moneda
  - Total de ventas y suma total de importes

### 2026-01-12 - Refactorización Dashboard Layout (P0 Completado)
**Completado:**
- ✅ **Refactorización de los 3 dashboards para usar `DashboardLayout` compartido:**
  - `/app/frontend/src/app/dashboard/client/page.tsx` - Ya estaba refactorizado
  - `/app/frontend/src/app/dashboard/admin/page.tsx` - **REFACTORIZADO**
  - `/app/frontend/src/app/dashboard/tipster/page.tsx` - **REFACTORIZADO**
- ✅ **Eliminación de código duplicado:**
  - Eliminado state `sidebarOpen`, `setSidebarOpen` de cada dashboard
  - Eliminada función `handleMobileNav` de cada dashboard
  - Eliminado JSX duplicado del Mobile Header, Overlay, y Aside (sidebar)
- ✅ **`DashboardLayout` componente compartido ahora maneja:**
  - Sidebar responsive (desktop fijo, mobile con slide-in)
  - Mobile header con botón hamburguesa
  - Overlay para cerrar sidebar en mobile
  - User info section
  - Navigation items con badges
  - Logout button
  - Header actions (NotificationsBell, CurrencySelector)
- ✅ **Build exitoso y tests visuales pasados**

### 2026-01-11 - Nuevo Flujo de Conexión de Telegram Durante Registro
**Completado:**
- ✅ **Conexión de Telegram durante registro (opcional):**
  - Nueva sección "Conecta tu Telegram" en el formulario de registro de tipster
  - El tipster puede conectar Telegram antes de enviar la solicitud (opcional)
  - Si conecta, el `telegramUserId` se guarda con la solicitud
  - Pasos: Abrir bot → START → Copiar código de 8 caracteres → Verificar
- ✅ **Bloqueo post-aprobación sin Telegram:**
  - Si un tipster APROBADO intenta hacer login SIN Telegram conectado:
    - Recibe error especial `TELEGRAM_REQUIRED`
    - Se muestra pantalla "¡Solicitud Aprobada!" con instrucciones para conectar
    - No puede acceder hasta conectar su Telegram
  - Nueva página `/connect-telegram` para este flujo
- ✅ **Eliminación sección Telegram del dashboard:**
  - La sección "Telegram" del menú lateral fue eliminada
  - Los canales se conectan automáticamente al agregar el bot como admin
  - El tipster ya no necesita ir a una sección separada
- ✅ **Nuevos endpoints:**
  - `POST /api/telegram/auth/connect-during-register` - Verificar código sin auth
  - `POST /api/telegram/auth/connect-pre-login` - Conectar con email/password
- ✅ **Tests:** 15/15 backend tests pasaron, frontend 100% funcional

### 2026-01-06 - Sistema de Conexión de Canales Simplificado
**Completado:**
- ✅ **Nuevo modal simplificado**: Solo 2 campos
  - **Nombre del canal** (obligatorio) - El usuario escribe el nombre exacto
  - **Link de invitación** (opcional) - Solo necesario si hay múltiples canales con el mismo nombre
- ✅ **Búsqueda inteligente**: El sistema busca por nombre y si hay duplicados, usa el link para diferenciar
- ✅ **El link se guarda**: Cuando se conecta un canal con link, este se almacena para futuras referencias
- ✅ **Instrucciones claras**: Se indica que deben añadir el bot como admin y enviar un mensaje
- ✅ **Refresh automático**: Si el canal no está en la BD, intenta obtener updates de Telegram

### 2026-01-06 - Mejora Conexión de Canales de Telegram
**Completado:**
- ✅ **Nuevo método de conexión por Channel ID**
  - Problema: Cuando un usuario crea un nuevo canal y añade el bot, a veces el sistema no lo detecta con el link de invitación
  - Solución: Agregado tab "Por Channel ID" en el modal de conexión
  - El usuario puede obtener el ID usando @userinfobot en Telegram
  - El backend verifica que el bot sea admin y conecta el canal automáticamente
- ✅ **Mejoradas las instrucciones de error**
  - Cuando el link no funciona, se muestran instrucciones claras
  - Se sugiere enviar un mensaje en el canal para ayudar a la detección
  - Se ofrece la alternativa de conectar por ID

### 2026-01-06 - Corrección Completa Sistema de Métricas de Afiliación
**Completado:**
- ✅ **Tarjetas de Campañas**: Ahora muestran vistas y clicks reales
  - Corregido: Los contadores `total_clicks` y `total_impressions` no se actualizaban por problema con ObjectId
  - Solución: Queries agregadas a `landing_click_events` y `landing_impression_events` para obtener conteos reales
- ✅ **Estadísticas Tipster**: Panel completo funcionando
  - Corregido: Usaba `affiliate_click_events` vacío en lugar de `landing_click_events` 
  - Corregido: Filtro de fechas con `{ $date: ... }` no funcionaba en MongoDB raw commands
  - Solución: Obtener todos los clicks y filtrar por fecha en memoria
- ✅ **Estadísticas Admin**: Panel completo funcionando
  - Mismo fix de filtro de fechas aplicado
  - Filtros por Tipster, Campaña, Casa y Fechas funcionando
- ✅ **Modal Métricas (por campaña)**: Funcionando correctamente
  - Vistas, Clicks, Conversiones, Ganancias
  - Tasa de conversión calculada correctamente
  - Clicks por País y por Casa
- ✅ **Conversiones del Simulador**: Ahora se aprueban automáticamente
  - Problema: Las conversiones se creaban con status `PENDING` y nunca cambiaban
  - Solución: Agregado parámetro `auto_approve` en el postback
  - El simulador ahora envía `auto_approve: true` para testing
  - Conversiones y ganancias se actualizan en tiempo real

### 2025-01-06 - Rediseño Frontend Landing Pages
**Completado:**
- ✅ Rediseño completo del Home principal (tema oscuro, estilo premium)
- ✅ Nueva página `/antiapay` con hero 3D mockup, selección Particular/Empresa, features con iconos 3D, dashboard mockup, pricing
- ✅ Nueva página `/antialink` con hero + mockup móvil, logos partners, 4 pasos, sección Telegram, campañas (Deportivas/Casino/Póker)
- ✅ Diseño consistente entre las 3 páginas (paleta oscura #0a0a0a)
- ✅ Imagen de fondo en hero (portería de fútbol)
- ✅ Navegación: Home → AntiaPay/AntiaLink
- ✅ AntiaPay: Particular → /register?role=client | Empresa → /register?role=tipster
- ✅ Responsive design + Test IDs

### 2025-01-06 - Corrección Sistema de Métricas
**Completado:**
- ✅ **Tipster Métricas**: Corregido bug donde modal se quedaba cargando
  - Arreglado `getLandingById()` para buscar IDs como string (no solo ObjectId)
  - Modal ahora muestra: Vistas, Clicks, Conversiones, Ganancias, Tasa conversión
  - Clicks por País y Casa, Estado de conversiones (Aprobadas/Pendientes/Rechazadas)
- ✅ **Admin Estadísticas**: Corregida URL del endpoint (`/api/admin/affiliate/stats`)
  - Filtros funcionando: Tipster, Campaña, Casa, Fechas
  - Stats por tipster con clicks, conversiones y comisiones
  - **Filtro Campaña ahora muestra las landings del tipster** (no retos del admin)
- ✅ **Admin Conversiones**: Mostrando datos de referidos con emails
  - Columna Usuario muestra: email, telegram, ID externo
  - Actualizado postback para guardar datos de usuario (user_email, user_telegram, external_ref_id)
  - Simulador ahora envía datos del usuario en postbacks

### 2025-01-06 - Rediseño Panel Liquidaciones (Tipster)
**Completado:**
- ✅ Nuevo diseño estilo AntiaPay según captura de referencia
- ✅ Header "AntiaPay / Liquidaciones"
- ✅ Tabs: Liquidaciones, Facturas, Informe de saldo
- ✅ Filtros: Cartera y Año (dropdowns)
- ✅ Tabla con columnas: Liquidaciones, Fecha, Estado, Ingresos, Deducidos, Gastos, Total
- ✅ Cards de resumen: Balance Pendiente, Total Liquidado, Comisiones Antia
- ✅ Tab Facturas con tabla limpia
- ✅ Tab Informe de saldo con Resumen de Saldo + Historial de Transferencias

### Sesión Anterior - Correcciones Críticas
- ✅ Bot Telegram: Migrado de webhooks a polling (más robusto)
- ✅ Simulador de afiliados TestBet creado y funcional
- ✅ Bug del error 500 en simulador corregido

---

## Backlog

### P0 - Alta Prioridad
- [x] ~~Sistema automatizado de conexión de canales de Telegram~~ ✅ (Implementado 09-01-2026)
- [x] ~~Conexión de Telegram durante registro~~ ✅ (Implementado 11-01-2026)
- [x] ~~Eliminación sección Telegram del dashboard~~ ✅ (Implementado 11-01-2026)
- [ ] Rediseño Dashboard Tipster (aplicar tema oscuro)
- [ ] Rediseño Panel Admin (aplicar tema oscuro)
- [ ] Rediseño páginas de Login/Register

### P1 - Media Prioridad
- [ ] Login con Google OAuth
- [x] ~~Login con Telegram Widget~~ ✅ (Parcialmente - requiere configuración BotFather para producción)
- [ ] Subida de fotos de perfil
- [ ] Suscripción trimestral
- [ ] Mejorar datos de referidos anónimos (simulador) para mostrar más info

### P2 - Baja Prioridad
- [ ] Emails transaccionales (cancelación/expiración)
- [ ] Consolidar módulos duplicados de tickets (/tickets y /support)
- [ ] Términos y Condiciones / Privacidad
- [ ] Disclaimer +18
- [ ] Validación backend para inviteLink en conexión Telegram

---

## Notas Técnicas

### Sistema de Conexión Telegram (Flujo Actualizado - 11-01-2026)

**Dos flujos diferentes con links distintos:**

**FLUJO 1: Durante el Registro (deep link: `vincular_registro`)**
1. El tipster ve opción "Conecta tu Telegram" (opcional) en el formulario de registro
2. Hace clic en "Conectar Telegram" que abre `t.me/BOT?start=vincular_registro`
3. El bot envía un código y un botón "📝 Completar Registro"
4. El botón redirige a `/register?telegram_code=CODE&telegram_username=USERNAME`
5. La página de registro recibe el código, lo verifica automáticamente y pre-llena el username
6. El tipster completa el resto del formulario y envía la solicitud
7. El `telegramUserId` se guarda junto con la solicitud

**FLUJO 2: Post-Aprobación (deep link: `vincular`)**
1. Tipster fue aprobado pero no conectó Telegram durante el registro
2. Intenta hacer login → Backend devuelve error `TELEGRAM_REQUIRED`
3. Frontend redirige a `/connect-telegram?email=EMAIL`
4. El tipster hace clic en "Abre el bot en Telegram" que usa `t.me/BOT?start=vincular`
5. El bot envía un código y un botón "🚀 Vincular y Acceder"
6. El botón redirige a `/connect-telegram?code=CODE`
7. La página muestra el código pre-cargado con mensaje "Código de Telegram recibido"
8. El tipster ingresa su contraseña y hace clic en "Conectar y Acceder"
9. El backend vincula el Telegram y el tipster puede acceder

**Auto-Conexión de Canales:**
- Los canales se conectan automáticamente cuando el bot es agregado como admin
- Se detecta mediante evento `my_chat_member` con `administrator` o `creator`
- El canal se vincula al tipster que tenga el `telegramUserId` del usuario que lo añadió

### Telegram Bot
El bot usa **POLLING** (no webhooks). Esto es intencional para evitar problemas con el routing del entorno preview.

### Sistema de Auto-Conexión de Canales Telegram (NUEVO - 09-01-2026)
1. **Vinculación de cuenta:** Los tipsters pueden vincular su Telegram mediante:
   - Telegram Login Widget (requiere configuración en BotFather para producción)
   - Código de vinculación generado con el comando `/vincular` en el bot
2. **Auto-conexión:** Cuando el tipster añade el bot como admin en un canal:
   - Se detecta automáticamente quién lo añadió (`from.id`)
   - Si el usuario tiene Telegram vinculado, el canal se conecta automáticamente
   - Se envía mensaje de confirmación al canal
3. **Auto-desconexión:** Cuando el bot es removido de un canal:
   - El canal se marca como inactivo
   - Los canales conectados se marcan como desconectados

### Simulador de Afiliados
Disponible en `/api/simulator/*` para testing end-to-end del flujo de afiliación.

### Routing
- Todas las rutas de API deben usar prefijo `/api`
- El entorno preview tiene limitaciones con webhooks externos



---

## Historial de Cambios

### 2026-01-12 - Intento de Refactorización DashboardLayout

**Tarea:** Consolidar la lógica duplicada del sidebar responsive en un componente reutilizable.

**Estado:** BLOQUEADO por error de tooling

**Lo que se intentó:**
1. Crear/mejorar componente `DashboardLayout.tsx` con soporte para:
   - Sidebar colapsable en móvil
   - Navegación dinámica via props `navItems`
   - Badges para notificaciones
   - Colores configurables (azul/rojo)
   - Header actions customizables

2. El componente ya funciona correctamente en `/app/frontend/src/app/dashboard/client/page.tsx`

3. Al intentar aplicar el mismo patrón a `admin/page.tsx` y `tipster/page.tsx`, SWC produce error:
   ```
   Unexpected token `DashboardLayout`. Expected jsx identifier
   ```

**Investigación realizada:**
- Verificado que todos los brackets/paréntesis están balanceados
- Verificado encoding UTF-8 correcto
- El error ocurre en la línea del `return (<DashboardLayout...`
- No es problema de importaciones (DashboardLayout se importa correctamente)
- No es problema de nombres de variables
- El componente funciona en client pero no en admin/tipster

**Decisión:** Dejar la refactorización como deuda técnica. Los dashboards funcionan correctamente con código duplicado.

**Archivos involucrados:**
- `/app/frontend/src/components/DashboardLayout.tsx` - Componente creado y funcional
- `/app/frontend/src/app/dashboard/client/page.tsx` - USA DashboardLayout ✅
- `/app/frontend/src/app/dashboard/admin/page.tsx` - Sidebar duplicado (original)
- `/app/frontend/src/app/dashboard/tipster/page.tsx` - Sidebar duplicado (original)

---

### 2026-01-12 - PWA (Progressive Web App)

**Implementación completa de PWA para instalación como app nativa:**

- **Manifest.json:** Configuración completa con nombre, iconos, shortcuts, tema
- **Service Worker:** Cache de assets estáticos, modo offline, notificaciones push
- **Iconos:** Generados en todas las resoluciones necesarias (72-512px)
- **Apple Support:** Meta tags para iOS/Safari (apple-touch-icon, apple-mobile-web-app-capable)
- **Install Prompt:** Componente que muestra banner para instalar la app
- **Offline Page:** Página dedicada cuando no hay conexión

**Archivos creados:**
- `/app/frontend/public/manifest.json`
- `/app/frontend/public/sw.js`
- `/app/frontend/public/offline.html`
- `/app/frontend/public/icons/*` (todos los tamaños)
- `/app/frontend/src/components/PWAInstallPrompt.tsx`

**Archivos modificados:**
- `/app/frontend/src/app/layout.tsx` - Meta tags, manifest link, SW registration

---

### 2026-01-12 - Responsive Design Completo

**Implementación de diseño responsive para toda la plataforma:**

- **Dashboard Tipster:** Sidebar colapsable con menú hamburguesa en móvil/tablet, visible en desktop
- **Dashboard Cliente:** Mismo patrón de sidebar responsive
- **Dashboard Admin:** Mismo patrón de sidebar responsive
- **Técnica usada:** CSS `-translate-x-full lg:translate-x-0` con `!translate-x-0` cuando está abierto
- **Tailwind safelist:** Agregadas clases de transformación para asegurar disponibilidad
- **Mobile header:** Header fijo con botón hamburguesa, logo, notificaciones y selector de moneda
- **Overlay:** Fondo oscuro al abrir sidebar en móvil
- **Navegación:** El sidebar se cierra automáticamente al navegar en móvil

**Archivos modificados:**
- `/app/frontend/src/app/dashboard/tipster/page.tsx`
- `/app/frontend/src/app/dashboard/client/page.tsx`
- `/app/frontend/src/app/dashboard/admin/page.tsx`
- `/app/frontend/tailwind.config.ts`

**Testing:** 100% success rate (iteration_3.json)

---

### 2026-01-11 - Correcciones de Issues P2

**Issue 1: "Invalid Date" en Dashboard - CORREGIDO**
- El backend devolvía fechas en formato BSON extendido `{"$date": "..."}` cuando usaba `$runCommandRaw`
- El frontend no podía parsear este formato, mostrando "Invalid Date"
- **Solución:** Se agregó función `toISOString()` en `/app/backend/src/orders/orders.service.ts` para convertir fechas BSON a strings ISO estándar
- Las ventas recientes ahora muestran fechas correctamente en formato español (ej: "9/1/2026")

**Issue 2: Validación de DTOs en Telegram Channels - CORREGIDO**
- Los endpoints de conexión de canales no tenían validación formal de DTOs
- **Solución:** Se crearon DTOs con class-validator en `/app/backend/src/telegram/dto/connect-channel.dto.ts`:
  - `ConnectByInviteLinkDto` - Valida `inviteLink` requerido
  - `ConnectByNameDto` - Valida `channelName` requerido, `inviteLink` opcional
  - `ConnectByIdDto` - Valida `channelId` requerido
  - `VerifyChannelDto` - Valida `channelId` requerido
  - `SearchByNameDto` - Valida `channelName` requerido
- Los endpoints ahora devuelven errores 400 con mensajes claros en español

**Issue 3: Módulos de Tickets Duplicados - NO APLICA**
- Se verificó que las rutas `/tickets` y `/support` como carpetas separadas NO existen
- El soporte está integrado dentro del dashboard de tipster como una vista
- Este issue fue reportado incorrectamente en el handoff anterior

---

## Issues Pendientes

### P0 (Refactorización - Bloqueada Técnicamente)
- **Refactorizar Dashboard Layout:** La lógica del sidebar responsive está duplicada en los tres dashboards (tipster, admin, client). Existe un componente `DashboardLayout.tsx` que funciona correctamente con el client dashboard, pero al intentar aplicarlo a admin y tipster, se produce un error de parsing de SWC: "Unexpected token DashboardLayout. Expected jsx identifier". Este error NO está relacionado con la sintaxis del código (todos los brackets están balanceados y el código es válido TypeScript/JSX).
  - **Estado:** Bloqueado por bug de tooling (SWC/Next.js)
  - **Workaround actual:** Los dashboards funcionan con código duplicado
  - **Impacto:** Solo afecta mantenibilidad, no funcionalidad
  - **Nota para siguiente sesión:** Investigar si es problema de encoding UTF-8 o incompatibilidad específica de SWC con archivos grandes (~2000+ líneas)

### P1 (Alta Prioridad)
- ~~Responsive design para toda la plataforma~~ ✅ COMPLETADO

### P2 (Media Prioridad)
- Implementar Login con Google OAuth
- Implementar Login con Widget de Telegram
- Agregar gráficos de visualización de datos
- Implementar subida de fotos de perfil

### P3 (Baja Prioridad)
- Agregar opción de suscripción trimestral

---

## Archivos de Referencia Actualizados

### Backend
- `/app/backend/src/orders/orders.service.ts` - Servicio de órdenes con fix de fechas
- `/app/backend/src/telegram/dto/connect-channel.dto.ts` - DTOs para validación de canales (NUEVO)
- `/app/backend/src/telegram/telegram-channels.controller.ts` - Controlador de canales actualizado

### Frontend
- `/app/frontend/src/app/dashboard/tipster/page.tsx` - Dashboard del tipster (RESPONSIVE)
- `/app/frontend/src/app/dashboard/client/page.tsx` - Dashboard del cliente (RESPONSIVE)
- `/app/frontend/src/app/dashboard/admin/page.tsx` - Dashboard del admin (RESPONSIVE)
- `/app/frontend/tailwind.config.ts` - Safelist para clases de transformación
- `/app/frontend/src/app/register/page.tsx` - Registro multi-paso
- `/app/frontend/src/app/connect-telegram/page.tsx` - Conexión post-aprobación

