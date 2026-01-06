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

### 2026-01-06 - Corrección Completa Sistema de Métricas de Afiliación
**Completado:**
- ✅ **Tarjetas de Campañas**: Ahora muestran vistas y clicks reales
  - Corregido: Los contadores `total_clicks` y `total_impressions` no se actualizaban por problema con ObjectId
  - Solución: Queries agregadas a `landing_click_events` y `landing_impression_events` para obtener conteos reales
- ✅ **Estadísticas Tipster**: Panel completo funcionando
  - Corregido: Usaba `affiliate_click_events` vacío en lugar de `landing_click_events` 
  - Corregido: Filtro de fechas con `{ $date: ... }` no funcionaba en MongoDB raw commands
  - Solución: Obtener todos los clicks y filtrar por fecha en memoria
  - Stats: 30 clicks, 3 conversiones, €75.00, 10% tasa conversión
  - Por País: España (21), Argentina (9), Estados Unidos (0)
  - Por Casa: Bwin (15), TestBet (8), Betway (4)
  - Por Campaña: Muestra cada landing con sus clicks
- ✅ **Estadísticas Admin**: Panel completo funcionando
  - Mismo fix de filtro de fechas aplicado
  - Por Tipster: Fausto Perez - 30 clicks, 3 conv., €75.00
  - Filtros por Tipster, Campaña, Casa y Fechas funcionando
- ✅ **Modal Métricas (por campaña)**: Funcionando correctamente
  - Vistas, Clicks, Conversiones, Ganancias
  - Tasa de conversión calculada correctamente
  - Clicks por País y por Casa

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
