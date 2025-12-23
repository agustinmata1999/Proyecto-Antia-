# Guía de Deployment para antiapay.com

## Problema Común: Errores 404 de Chunks de Next.js

Los errores como:
- `GET https://antiapay.com/_next/static/chunks/app/layout-xxx.js 404 Not Found`
- `ChunkLoadError: Loading chunk xxx failed`

Ocurren cuando hay un **desajuste entre el build del frontend y los archivos desplegados**.

---

## Solución: Proceso de Deployment Correcto

### Paso 1: Variables de Entorno para Producción

**Backend (.env en producción):**
```env
DATABASE_URL="mongodb+srv://<tu-usuario>:<tu-password>@<cluster>.mongodb.net/tipify-platform-antia?retryWrites=true&w=majority"
PORT=8001
APP_URL="https://antiapay.com"
JWT_SECRET="tu-secret-seguro"
TELEGRAM_BOT_TOKEN="tu-token"
STRIPE_API_KEY="sk_live_xxx"
STRIPE_SECRET_KEY="sk_live_xxx"
```

**Frontend (.env en producción):**
```env
REACT_APP_BACKEND_URL="https://antiapay.com"
NEXT_PUBLIC_API_URL="https://antiapay.com/api"
```

### Paso 2: Build del Frontend

Cada vez que hagas cambios, necesitas hacer un nuevo build:

```bash
cd /app/frontend
yarn build
```

### Paso 3: Copiar Archivos Estáticos (CRÍTICO)

Next.js con `output: standalone` requiere copiar los archivos estáticos:

```bash
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/ 2>/dev/null || true
```

### Paso 4: Reiniciar Servicios

```bash
sudo supervisorctl restart frontend backend
```

---

## Configuración de Deployment en Emergent

Cuando despliegas desde Emergent a tu dominio `antiapay.com`:

### Variables de Entorno Requeridas en los Secrets de Deployment:

**Para el Backend:**
| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | Tu MongoDB Atlas connection string |
| `APP_URL` | `https://antiapay.com` |
| `JWT_SECRET` | Tu secret seguro |
| `TELEGRAM_BOT_TOKEN` | Token del bot |
| `STRIPE_API_KEY` | Tu API key de Stripe |

**Para el Frontend:**
| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://antiapay.com/api` |

---

## Verificación Post-Deployment

1. **Verificar Health Endpoint:**
   ```bash
   curl https://antiapay.com/api/health
   ```

2. **Verificar Carga de Página:**
   - Abre https://antiapay.com en una ventana de incógnito
   - Abre DevTools (F12) y verifica que no hay errores 404 en la consola

3. **Limpiar Caché del Navegador:**
   - Los errores de chunks viejos pueden persistir por caché
   - Hacer hard refresh: `Ctrl + Shift + R`

---

## Errores Comunes y Soluciones

### Error: ChunkLoadError 404
**Causa:** Build ID desactualizado o archivos estáticos no copiados
**Solución:** Hacer nuevo build y copiar archivos estáticos

### Error: MIME type 'text/plain'
**Causa:** El servidor está sirviendo un HTML de error en lugar del JS
**Solución:** Verificar que los archivos `.next/static` existen y están accesibles

### Error: MongoDB Connection Failed
**Causa:** Connection string incorrecto o IP no whitelisted
**Solución:** 
1. Verificar que el connection string usa el nombre de base de datos correcto
2. En MongoDB Atlas, whitelist la IP `0.0.0.0/0` para permitir todas las conexiones

---

## Contacto para Soporte

Si los problemas persisten después de seguir esta guía, verifica:
1. Los logs del backend: `/var/log/supervisor/backend.err.log`
2. Los logs del frontend: `/var/log/supervisor/frontend.err.log`
