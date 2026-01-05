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
    sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://$NUEVO_DOMINIO/api|" /app/frontend/.env
    echo "   ✅ Frontend actualizado"
else
    echo "   ⚠️  Archivo frontend/.env no encontrado"
fi

# 2. Actualizar backend/.env
echo "2️⃣ Actualizando backend/.env..."
if [ -f /app/backend/.env ]; then
    sed -i "s|APP_URL=.*|APP_URL=https://$NUEVO_DOMINIO|" /app/backend/.env
    grep -q "FRONTEND_URL" /app/backend/.env && sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$NUEVO_DOMINIO|" /app/backend/.env
    echo "   ✅ Backend actualizado"
else
    echo "   ⚠️  Archivo backend/.env no encontrado"
fi

# 3. Actualizar configuración de supervisor (APP_URL)
echo "3️⃣ Actualizando supervisor config..."
SUPERVISOR_CONF=$(find /etc/supervisor -name "*.conf" -exec grep -l "program:backend" {} \; 2>/dev/null | head -1)
if [ -n "$SUPERVISOR_CONF" ]; then
    # Extraer el dominio antiguo y reemplazarlo
    sed -i "s|APP_URL=\"https://[^\"]*\"|APP_URL=\"https://$NUEVO_DOMINIO\"|g" "$SUPERVISOR_CONF"
    sudo supervisorctl reread 2>/dev/null
    echo "   ✅ Supervisor actualizado"
else
    echo "   ⚠️  Config de supervisor no encontrada"
fi

# 4. Bot usa POLLING - no necesita webhook
echo "4️⃣ Bot de Telegram en modo POLLING..."
echo "   ✅ No requiere configuración de webhook"
echo "   ℹ️  El bot funciona automáticamente en cualquier dominio"

# 5. Reiniciar servicios
echo "5️⃣ Reiniciando servicios..."
sudo supervisorctl update 2>/dev/null
sudo supervisorctl restart backend frontend 2>/dev/null
sleep 5
echo "   ✅ Servicios reiniciados"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ DOMINIO ACTUALIZADO: https://$NUEVO_DOMINIO"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Verificación:"
echo "   - Frontend URL: https://$NUEVO_DOMINIO"
echo "   - Backend API: https://$NUEVO_DOMINIO/api"
echo "   - Bot Telegram: POLLING mode (funciona siempre)"
echo ""
echo "ℹ️  El bot de Telegram usa POLLING, no webhooks."
echo "   Esto significa que funciona en cualquier entorno preview"
echo "   sin necesidad de configuración adicional."
echo ""
