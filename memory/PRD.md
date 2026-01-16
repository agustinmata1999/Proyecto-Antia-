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
