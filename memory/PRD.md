# Antia Platform - Product Requirements Document

## Original Problem Statement
Platform for tipsters to sell access to Telegram channels with betting tips, featuring affiliate marketing campaigns for betting houses, payment processing, and channel monitoring.

## Core Features

### 1. Tipster Dashboard
- Product management (with/without Telegram channel)
- Sales tracking and analytics
- Withdrawal management
- Campaign management for affiliate marketing

### 2. Telegram Integration
- Bot for channel access management
- Purchase confirmation via bot
- Request approval notifications with join button
- Conditional messaging based on product type

### 3. Payment Processing (AntiaPay)
- Stripe integration
- Order management
- Conditional checkout flow (Telegram vs non-Telegram products)

### 4. Affiliate Marketing (Campaigns)
- Multi-country campaign support (10 countries: ES, MX, AR, CO, CL, PE, US, UK, PT, DE)
- Per-country betting house configuration
- Landing pages with tracking

## What's Been Implemented

### January 2026
- **Product differentiation:** Products with/without Telegram channel display differently
- **Conditional checkout flow:** Non-Telegram products don't redirect to Telegram
- **Simplified tipster notifications:** Only shows "Importe" (total amount)
- **Join button in approval messages:** Direct channel join from notification
- **Campaign modal parity:** "Nueva Campaña" modal now matches "Editar Campaña" with:
  - Description field
  - All 10 countries available
  - Per-country betting house selection
- **Campaign cover images:** Upload custom cover images for campaigns
  - New endpoint: POST /api/upload/campaign
  - Image preview in create/edit modals
  - Custom image displayed in campaign list (replaces country flags fallback)
- **"Afiliados" tab (Jan 16, 2026):** New tab in affiliate section showing all referrals
  - Table columns: Casa de Apuestas, Nombre, Campaña, Fecha, País, Estado, CPA
  - Stats cards: Total, Aprobados, Pendientes, Ganancias
  - Campaign name resolution using multiple strategies:
    1. Extract clickId from tipsterTrackingId (format: tipsterId_clickId)
    2. Match by house_id from landing_click_events
- **Sales Section as Tab in "Mis Productos" (Jan 16, 2026):** New "Ventas" tab added alongside "Mis productos"
  - **Tabs system:** "Mis productos" (product list + create button) | "Ventas" (sales stats + table)
  - Stats cards: Total ventas, Transacciones, Ventas netas (with +6.9% indicator)
  - Table columns: Nombre (payment logo + product + ID), Fecha, Usuario, Precio, Bruto, Neto, Total
  - Design styled to match AntiaPay reference
    3. Fallback to single campaign if tipster has only one
- **Campaign image save fix (Jan 16, 2026):** Fixed bug where campaign cover images weren't being saved
  - Root cause: MongoDB documents had `_id` stored as string instead of ObjectId
  - Solution: Update query now tries ObjectId first, then falls back to string _id
- **Affiliate Section UI Redesign (Jan 16, 2026):** Complete redesign to match AntiaPay mockups
  - Stats cards at top: Total generado, Afiliados, Clicks totales (with % change indicators)
  - Filter row with dropdowns: País, Categoría, Casa de afiliación
  - "Crear Campaña +" button
  - Search bar below filters
  - Tabs: Campañas activas, Casas de apuestas, Afiliados
  - Campaign table: Image + title, countries (flags), affiliates count, total, copy URL button
  - Houses table: Logo, countries, name, commission type, category
  - Affiliates table: House logo + user name, date, country with flag, CPA

## Architecture

### Backend (NestJS)
- `/app/backend/src/telegram/telegram.service.ts` - Telegram bot logic
- `/app/backend/src/checkout/checkout.service.ts` - Payment processing

### Frontend (Next.js)
- `/app/frontend/src/app/dashboard/tipster/page.tsx` - Tipster dashboard
- `/app/frontend/src/components/AffiliateSection.tsx` - Campaign management
- `/app/frontend/src/app/checkout/success/page.tsx` - Checkout success page

## Known Issues

### P0 - BLOCKED
- Telegram webhook conflict with old server (`paymenz.preview.emergentagent.com`)
- Requires old server to be shut down

### P1 - Pending Verification
- All recent features need user end-to-end testing

## Upcoming Tasks

### P1
- Implement quarterly (trimestral) subscription option

### P2
- Channel Monitor V2 (multimedia support)
- Email notifications for withdrawal processing
- Product `codigo` field (human-readable ID)
- Keyword search in captured messages

## Credentials
- **Admin:** admin@antia.com / Admin123!
- **Tipster:** fausto.perez@antia.com / Tipster123!

## Technical Notes
- Frontend requires manual build: `yarn build && sudo supervisorctl restart frontend`
- Hot reload not working for frontend
- User's preferred language: Spanish
