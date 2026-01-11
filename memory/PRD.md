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
- SuperAdmin: `admin@antia.com` / `SuperAdmin123!`
- Tipster: `fausto.perez@antia.com` / `Tipster123!`
- Cliente: `cliente@example.com` / `Client123!`

---

## Changelog

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
