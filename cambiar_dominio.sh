#!/bin/bash
# Script para cambiar el dominio de AFFILIA-GO
# Uso: ./cambiar_dominio.sh nuevo-dominio.preview.emergentagent.com

NUEVO_DOMINIO=$1

if [ -z "$NUEVO_DOMINIO" ]; then
    echo "❌ Error: Debes proporcionar el nuevo dominio"
    echo ""
    echo "Uso: $0 <nuevo-dominio>"
    echo "Ejemplo: $0 affiliboost-3.preview.emergentagent.com"
    exit 1
fi

echo "🔄 Actualizando dominio a: https://$NUEVO_DOMINIO"
echo ""

# 1. Actualizar frontend/.env
echo "1️⃣ Actualizando frontend/.env..."
if [ -f /app/frontend/.env ]; then
    sed -i "s|REACT_APP_BACKEND_URL=.*|REACT_APP_BACKEND_URL=https://$NUEVO_DOMINIO|" /app/frontend/.env
    echo "   ✅ Frontend actualizado"
else
    echo "   ⚠️  Archivo frontend/.env no encontrado"
fi

# 2. Actualizar backend/.env
echo "2️⃣ Actualizando backend/.env..."
if [ -f /app/backend/.env ]; then
    # Solo actualizar si existen las variables
    grep -q "FRONTEND_URL" /app/backend/.env && sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$NUEVO_DOMINIO|" /app/backend/.env
    grep -q "WEBHOOK_BASE_URL" /app/backend/.env && sed -i "s|WEBHOOK_BASE_URL=.*|WEBHOOK_BASE_URL=https://$NUEVO_DOMINIO|" /app/backend/.env
    echo "   ✅ Backend actualizado"
else
    echo "   ⚠️  Archivo backend/.env no encontrado"
fi

# 3. Actualizar webhook de Telegram
echo "3️⃣ Configurando webhook de Telegram..."
BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN /app/backend/.env 2>/dev/null | cut -d'=' -f2)
if [ -n "$BOT_TOKEN" ]; then
    RESULT=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=https://$NUEVO_DOMINIO/api/telegram/webhook&allowed_updates=%5B%22message%22%2C%22callback_query%22%2C%22my_chat_member%22%2C%22chat_join_request%22%5D")
    if echo "$RESULT" | grep -q '"ok":true'; then
        echo "   ✅ Webhook de Telegram configurado"
    else
        echo "   ⚠️  Error configurando webhook: $RESULT"
    fi
else
    echo "   ⚠️  Token de Telegram no encontrado"
fi

# 4. Reiniciar servicios
echo "4️⃣ Reiniciando servicios..."
sudo supervisorctl restart backend frontend 2>/dev/null
sleep 3
echo "   ✅ Servicios reiniciados"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ DOMINIO ACTUALIZADO: https://$NUEVO_DOMINIO"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Verificación:"
echo "   - Frontend URL: $(grep REACT_APP_BACKEND_URL /app/frontend/.env 2>/dev/null | cut -d'=' -f2)"
echo "   - Webhook Telegram: https://$NUEVO_DOMINIO/api/telegram/webhook"
echo ""
echo "⚠️  ACCIONES MANUALES PENDIENTES:"
echo "   1. Actualizar webhook en Stripe (si lo usas)"
echo "   2. Actualizar URLs en Redsys (si lo usas)"
echo "   3. Si los canales de Telegram no funcionan, pide a los tipsters"
echo "      que quiten y vuelvan a añadir el bot @Antiabetbot"
echo ""
