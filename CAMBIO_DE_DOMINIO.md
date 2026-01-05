# Guía de Cambio de Dominio - AFFILIA-GO

## Cuando hacer un Fork o Restaurar a otro Chat

Cuando cambies de chat en Emergent (fork/restore), el dominio de preview cambiará. Ejemplo:
- Dominio anterior: `https://affiliboost-2.preview.emergentagent.com`
- Dominio nuevo: `https://affiliboost-3.preview.emergentagent.com`

**IMPORTANTE:** Debes actualizar las siguientes configuraciones para que todo funcione correctamente.

---

## 1. Variables de Entorno (.env)

### Frontend (`/app/frontend/.env`)
```bash
# Actualizar con el nuevo dominio
REACT_APP_BACKEND_URL=https://NUEVO-DOMINIO.preview.emergentagent.com
```

### Backend (`/app/backend/.env`)
```bash
# Actualizar estas variables
FRONTEND_URL=https://NUEVO-DOMINIO.preview.emergentagent.com
WEBHOOK_BASE_URL=https://NUEVO-DOMINIO.preview.emergentagent.com
```

---

## 2. Webhook de Telegram (CRÍTICO)

El bot de Telegram debe apuntar al nuevo dominio. Ejecutar este comando:

```bash
# Obtener el token del bot
BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN /app/backend/.env | cut -d'=' -f2)

# Configurar el nuevo webhook
NUEVO_DOMINIO="https://TU-NUEVO-DOMINIO.preview.emergentagent.com"

curl "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=${NUEVO_DOMINIO}/api/telegram/webhook&allowed_updates=%5B%22message%22%2C%22callback_query%22%2C%22my_chat_member%22%2C%22chat_join_request%22%5D"
```

### Verificar que el webhook está configurado:
```bash
BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN /app/backend/.env | cut -d'=' -f2)
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
```

---

## 3. Reiniciar Servicios

Después de actualizar las variables de entorno:

```bash
sudo supervisorctl restart backend frontend
```

---

## 4. Verificación Post-Cambio

### Checklist:
- [ ] Variables de entorno actualizadas en frontend/.env
- [ ] Variables de entorno actualizadas en backend/.env
- [ ] Webhook de Telegram configurado con nuevo dominio
- [ ] Servicios reiniciados
- [ ] Probar login de usuario
- [ ] Probar conexión de canal de Telegram (quitar y volver a añadir bot)
- [ ] Probar landing pages de afiliados (/go/[slug])

### Comandos de verificación:
```bash
# Ver dominio actual del frontend
grep REACT_APP_BACKEND_URL /app/frontend/.env

# Ver webhook de Telegram actual
BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN /app/backend/.env | cut -d'=' -f2)
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Webhook URL:', d['result']['url'])"

# Ver logs del backend
tail -20 /var/log/supervisor/backend.out.log
```

---

## Script Automático de Cambio de Dominio

Ejecutar este script pasando el nuevo dominio como argumento:

```bash
#!/bin/bash
# Uso: ./cambiar_dominio.sh nuevo-dominio.preview.emergentagent.com

NUEVO_DOMINIO=$1

if [ -z "$NUEVO_DOMINIO" ]; then
    echo "Uso: $0 <nuevo-dominio>"
    exit 1
fi

echo "Actualizando a: https://$NUEVO_DOMINIO"

# 1. Actualizar frontend/.env
sed -i "s|REACT_APP_BACKEND_URL=.*|REACT_APP_BACKEND_URL=https://$NUEVO_DOMINIO|" /app/frontend/.env

# 2. Actualizar backend/.env
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$NUEVO_DOMINIO|" /app/backend/.env
sed -i "s|WEBHOOK_BASE_URL=.*|WEBHOOK_BASE_URL=https://$NUEVO_DOMINIO|" /app/backend/.env

# 3. Actualizar webhook de Telegram
BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN /app/backend/.env | cut -d'=' -f2)
curl -s "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=https://$NUEVO_DOMINIO/api/telegram/webhook&allowed_updates=%5B%22message%22%2C%22callback_query%22%2C%22my_chat_member%22%2C%22chat_join_request%22%5D"

# 4. Reiniciar servicios
sudo supervisorctl restart backend frontend

echo "✅ Dominio actualizado a: https://$NUEVO_DOMINIO"
echo "⚠️  Recuerda actualizar Stripe y Redsys manualmente si los usas"
```

---

## Notas Importantes

1. **Links de Afiliados:** Los links compartidos (`/go/slug`) cambiarán de dominio. Notifica a los tipsters si es necesario.

2. **Canales de Telegram:** Si un canal no se conecta después del cambio, el tipster debe:
   - Quitar el bot @Antiabetbot del canal
   - Volver a añadirlo como administrador

3. **Sesiones de Usuario:** Los usuarios pueden necesitar volver a iniciar sesión.

---

*Última actualización: Enero 2025*
