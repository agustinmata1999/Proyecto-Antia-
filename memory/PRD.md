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
- [ ] Rediseño Dashboard Tipster (aplicar tema oscuro)
- [ ] Rediseño Panel Admin (aplicar tema oscuro)
- [ ] Rediseño páginas de Login/Register

### P1 - Media Prioridad
- [ ] Login con Google OAuth
- [ ] Login con Telegram Widget
- [ ] Subida de fotos de perfil
- [ ] Suscripción trimestral
- [ ] Mejorar datos de referidos anónimos (simulador) para mostrar más info

### P2 - Baja Prioridad
- [ ] Emails transaccionales (cancelación/expiración)
- [ ] Consolidar módulos duplicados de tickets (/tickets y /support)
- [ ] Términos y Condiciones / Privacidad
- [ ] Disclaimer +18

---

## Notas Técnicas

### Telegram Bot
El bot usa **POLLING** (no webhooks). Esto es intencional para evitar problemas con el routing del entorno preview.

### Simulador de Afiliados
Disponible en `/api/simulator/*` para testing end-to-end del flujo de afiliación.

### Routing
- Todas las rutas de API deben usar prefijo `/api`
- El entorno preview tiene limitaciones con webhooks externos
