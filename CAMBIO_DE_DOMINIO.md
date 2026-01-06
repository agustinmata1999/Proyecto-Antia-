# 🔄 Cambio de Dominio - AFFILIA-GO

## Resumen

Cuando forkeas este proyecto a un nuevo chat, el dominio de preview cambia. Este documento explica cómo actualizar todas las configuraciones necesarias.

## 🤖 Bot de Telegram - Modo POLLING

**IMPORTANTE:** El bot de Telegram ahora usa **POLLING** en lugar de webhooks.

### ¿Qué significa esto?
- ✅ El bot funciona **automáticamente** en cualquier entorno preview
- ✅ No necesita configuración de webhooks
- ✅ No depende del dominio externo
- ✅ Funciona aunque cambies de chat/dominio

### ¿Por qué POLLING?
El sistema de preview de Emergent (`*.preview.emergentagent.com`) envuelve las respuestas en un iframe, lo que impide que los webhooks de Telegram funcionen correctamente. Con POLLING, el bot consulta activamente a Telegram por nuevas actualizaciones, evitando este problema.

## 🛠️ Script Automático

Ejecuta el siguiente comando reemplazando `NUEVO-DOMINIO` con tu dominio actual:

```bash
/app/cambiar_dominio.sh NUEVO-DOMINIO.preview.emergentagent.com
```

### Ejemplo:
Si tu preview es `https://aff-metrics-fix.preview.emergentagent.com`, ejecuta:

```bash
/app/cambiar_dominio.sh tipster-platform.preview.emergentagent.com
```

## 📝 Lo que hace el script

1. **Frontend (.env)**: Actualiza `REACT_APP_BACKEND_URL` y `NEXT_PUBLIC_API_URL`
2. **Backend (.env)**: Actualiza `APP_URL`
3. **Supervisor**: Actualiza la variable `APP_URL` en la configuración del servicio
4. **Servicios**: Reinicia frontend y backend

## 📋 Verificación Manual

Después de ejecutar el script, verifica:

```bash
# Ver configuración del frontend
cat /app/frontend/.env

# Ver configuración del backend
cat /app/backend/.env | head -10

# Verificar servicios
sudo supervisorctl status

# Verificar bot de Telegram
curl -s http://localhost:8001/api/health
```

## ⚠️ Notas Importantes

1. **El bot NO necesita webhook** - Funciona con polling automáticamente
2. **Los canales de Telegram existentes siguen funcionando** - No es necesario reconectar
3. **Si hay problemas con el bot**, simplemente reinicia el backend:
   ```bash
   sudo supervisorctl restart backend
   ```

## 📧 Mensaje para el Nuevo Chat

Copia y pega esto al inicio de un nuevo fork:

```
CAMBIO DE DOMINIO - Ejecuta esto primero:

1. Identifica tu dominio de preview (aparece en la URL)
2. Ejecuta: /app/cambiar_dominio.sh TU-DOMINIO.preview.emergentagent.com

Ejemplo: /app/cambiar_dominio.sh tipster-platform.preview.emergentagent.com

El bot de Telegram usa POLLING, así que funciona automáticamente sin configuración adicional.
```
