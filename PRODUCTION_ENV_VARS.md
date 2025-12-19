# Variables de Entorno para Producción (antiapay.com)

## Variables Críticas que DEBEN configurarse en Emergent Secrets:

### Backend
```
APP_URL=https://antiapay.com
FRONTEND_URL=https://antiapay.com
CHECKOUT_BASE_URL=https://antiapay.com/checkout
```

### Frontend  
```
REACT_APP_BACKEND_URL=https://antiapay.com
NEXT_PUBLIC_API_URL=https://antiapay.com/api
```

### Base de Datos (ya configurado por Emergent)
```
MONGO_URL=<atlas-connection-string>
DATABASE_URL=<atlas-connection-string>
```

### Telegram Bot
```
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_BOT_NAME=Antiabetbot
```

### Pagos
```
STRIPE_API_KEY=<your-stripe-key>
STRIPE_SECRET_KEY=<your-stripe-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
REDSYS_MERCHANT_CODE=<your-merchant-code>
REDSYS_TERMINAL=001
REDSYS_SECRET_KEY=<your-secret-key>
REDSYS_ENVIRONMENT=production
```

### Autenticación
```
JWT_SECRET=<strong-random-secret>
```

## Cómo Agregar en Emergent:
1. Ve a tu proyecto en Emergent
2. Click en "Secrets" o "Environment Variables"
3. Agrega cada variable listada arriba
4. Vuelve a hacer deploy

## Verificación Post-Deploy:
- Visita https://antiapay.com/api/health
- Debería devolver: `{"status":"ok","database":"connected"}`
