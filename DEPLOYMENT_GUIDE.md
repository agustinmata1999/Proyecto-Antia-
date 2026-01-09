# 🚀 Guía Completa de Deployment para antiapay.com

---

## 🔴 PROBLEMA DE CACHÉ - SOLUCIÓN RÁPIDA

Si ves errores como estos en la consola:
```
Failed to load resource: /_next/static/chunks/xxx.js 404
MIME type ('text/plain') is not executable
```

**SOLUCIÓN:**
1. **Hard Refresh:** `Ctrl + Shift + R` (Windows/Linux) o `Cmd + Shift + R` (Mac)
2. **O limpiar caché:** `Ctrl + Shift + Delete` → "Desde siempre" → Borrar
3. **O modo incógnito:** `Ctrl + Shift + N`

Esto ocurre porque el navegador tiene cacheados archivos viejos de un build anterior.

---

## ⚠️ IMPORTANTE: Leer Antes de Comenzar

Esta guía te ayudará a desplegar correctamente tu aplicación en `antiapay.com`. 
Sigue TODOS los pasos en orden para evitar problemas.

---

## 📋 PASO 1: Preparación (Antes del Deployment)

### 1.1 Limpiar Caché del Navegador (CRÍTICO)

Antes de cualquier deployment, **SIEMPRE** limpia el caché:

**Método 1 - Hard Refresh:**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Método 2 - Limpiar Caché Completo (Recomendado):**
1. Abre Chrome DevTools (`F12`)
2. Ve a `Application` → `Storage`
3. Click en `Clear site data`
4. Marca todas las opciones y click "Clear site data"

**Método 3 - Modo Incógnito:**
- Siempre prueba en una ventana de incógnito para evitar problemas de caché

### 1.2 Verificar que el Preview Funciona

Antes de desplegar a tu dominio, verifica que la app funciona en el preview de Emergent:
- URL de preview: https://campaign-manager-48.preview.emergentagent.com
- Si el preview no funciona, NO despliegues hasta arreglarlo

---

## 📋 PASO 2: Deployment Inicial en Emergent

### 2.1 Hacer Deploy

1. En la interfaz de Emergent, click en el botón **"Deploy"**
2. Click en **"Deploy Now"**
3. **Espera 10-15 minutos** hasta que el deployment se complete
4. Recibirás una URL de Emergent donde tu aplicación está en vivo

---

## 📋 PASO 3: Conectar Dominio Personalizado (antiapay.com)

### 3.1 Configuración DNS (MUY IMPORTANTE)

⚠️ **Si ves "Welcome to nginx!" en tu dominio, el problema está aquí.**

**PRIMERO - Elimina TODOS los registros A existentes:**

1. Ve a tu proveedor de dominio (GoDaddy, Namecheap, Cloudflare, etc.)
2. Accede a la configuración DNS de `antiapay.com`
3. **ELIMINA TODOS los registros "A"** que apunten a direcciones IP
4. Si tienes Cloudflare, **desactiva el proxy (nube naranja → gris)**

### 3.2 Vincular Dominio en Emergent

1. En Emergent, click en **"Link domain"** en la configuración de deployment
2. Escribe tu dominio: `antiapay.com`
3. Click en **"Entri"**
4. Sigue las instrucciones en pantalla

### 3.3 Esperar Propagación DNS

- Los cambios DNS tardan **5-15 minutos** normalmente
- En algunos casos pueden tardar hasta **24 horas**
- Usa herramientas como [dnschecker.org](https://dnschecker.org) para verificar

---

## 📋 PASO 4: Variables de Entorno para Producción

### 4.1 Backend (.env)

```env
# Base de Datos - USA TU CONNECTION STRING DE MONGODB ATLAS
DATABASE_URL="mongodb+srv://<tu-usuario>:<tu-password>@<cluster>.mongodb.net/tipify-platform-antia?retryWrites=true&w=majority"

# Servidor
PORT=8001
APP_URL="https://antiapay.com"

# JWT
JWT_SECRET="tu-secret-seguro-de-produccion"

# Telegram
TELEGRAM_BOT_TOKEN="tu-token-de-bot"

# Stripe (Producción)
STRIPE_API_KEY="sk_live_xxx"
STRIPE_SECRET_KEY="sk_live_xxx"
```

### 4.2 Frontend (.env)

```env
REACT_APP_BACKEND_URL="https://antiapay.com"
NEXT_PUBLIC_API_URL="https://antiapay.com/api"
```

---

## 📋 PASO 5: Verificación Post-Deployment

### 5.1 Checklist de Verificación

- [ ] **Limpiar caché del navegador** (SIEMPRE hacer esto primero)
- [ ] Abrir `https://antiapay.com` en modo incógnito
- [ ] Verificar que NO ves "Welcome to nginx!"
- [ ] Verificar que la página de inicio carga correctamente
- [ ] Probar login con credenciales de prueba
- [ ] Abrir DevTools (F12) y verificar que NO hay errores 404 en Console

### 5.2 Verificar API Health

```bash
curl https://antiapay.com/api/health
```

Respuesta esperada: `{"status":"ok",...}`

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Problema: "Welcome to nginx!"

**Causa:** El DNS no está configurado correctamente.

**Solución:**
1. Elimina TODOS los registros A de tu proveedor de DNS
2. En Emergent, vuelve a vincular el dominio con "Entri"
3. Espera 15-30 minutos para la propagación DNS
4. Limpia el caché del navegador y prueba en incógnito

### Problema: Errores 404 de Chunks de JavaScript

**Síntomas:**
- `GET https://antiapay.com/_next/static/chunks/app/layout-xxx.js 404 Not Found`
- `ChunkLoadError: Loading chunk xxx failed`

**Causa:** Caché viejo del navegador con archivos desactualizados.

**Solución:**
1. **Limpia completamente el caché del navegador**
2. Prueba en una ventana de incógnito
3. Si persiste, haz un hard refresh: `Ctrl + Shift + R`

### Problema: MIME type 'text/plain'

**Causa:** El servidor está sirviendo un error en lugar del JavaScript.

**Solución:**
1. Verifica que el deployment se completó correctamente
2. Espera unos minutos y vuelve a intentar
3. Limpia el caché del navegador

### Problema: MongoDB Connection Failed

**Causa:** Connection string incorrecto o IP no autorizada.

**Solución:**
1. Verifica que el connection string usa el nombre de base de datos correcto: `tipify-platform-antia`
2. En MongoDB Atlas, ve a "Network Access"
3. Agrega `0.0.0.0/0` para permitir todas las conexiones (o las IPs específicas de Emergent)

### Problema: Después de Fork no funciona el deployment

**Causa:** El fork no afecta tu deployment existente, pero si hiciste cambios necesitas redesplegar.

**Solución:**
1. Después de hacer fork, haz click en "Deploy" → "Deploy Now"
2. Espera que el deployment se complete
3. Limpia caché y verifica

---

## 📞 Contacto para Soporte

Si los problemas persisten después de seguir esta guía:

1. **Verifica los logs:**
   - Backend: `/var/log/supervisor/backend.err.log`
   - Frontend: `/var/log/supervisor/frontend.err.log`

2. **Información a proporcionar para soporte:**
   - Screenshot del error
   - URL exacta donde ves el error
   - Qué pasos seguiste antes del error

---

## ✅ Resumen Rápido

1. ⚡ **Siempre limpia el caché** antes de probar
2. 🔗 **Elimina registros A** del DNS antes de vincular el dominio
3. ⏰ **Espera la propagación DNS** (15-30 minutos)
4. 🔒 **Configura las variables de entorno** correctamente
5. 🕵️ **Prueba en modo incógnito** para evitar problemas de caché
