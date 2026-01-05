# 🎰 Simulador de Casa de Apuestas - Documentación

## Resumen

Este simulador permite probar el flujo completo de tracking de afiliados sin necesidad de una casa de apuestas real. Funciona exactamente como lo haría una casa real, enviando postbacks al sistema de Antía.

## ¿Cómo funciona el sistema de tracking?

### Flujo Completo (Respondiendo la duda de Alex):

```
1. Tipster crea campaña "Navidad 2025"
         ↓
   Sistema genera automáticamente:
   - Slug: "fausto-perez-navidad-2025"
   - URL: antia.com/go/fausto-perez-navidad-2025
   - SubID de tracking: 694313406d86ad866d3f118f (único por tipster)
         ↓
2. Usuario hace clic en casa de apuestas desde la landing
         ↓
   URL generada automáticamente:
   - casa.com/registro?affiliate=antia&subid=694313406d86ad866d3f118f
         ↓
3. Casa recibe el subid y el usuario se registra
         ↓
4. Casa envía postback:
   POST /api/r/postback { subid: "694313406d86ad866d3f118f", event: "REGISTRATION" }
         ↓
5. Sistema detecta: "Este subid pertenece a Fausto Perez → Le sumamos 50€ de comisión"
```

## URLs del Simulador

### Landing del Simulador (simula página de registro)
```
/api/simulator/landing?subid=<TIPSTER_ID>&affiliate=antia
```

### Estado y Estadísticas
```
/api/simulator/status     → Ver historial de clics, registros y postbacks
/api/simulator/api/stats  → JSON con estadísticas
/api/simulator/clear      → Limpiar datos del simulador
```

## Probar desde la Landing Pública

1. Ve a una landing de campaña: `/go/fausto-perez-reto-navidad-2025`
2. Acepta la verificación de edad
3. Haz clic en el botón "Registrarse" de **🧪 TestBet Simulator**
4. Se abrirá el simulador con el SubID del tipster ya cargado
5. Rellena email y username ficticios
6. Haz clic en "Simular Registro"
7. ¡Verás confirmación del postback enviado!

## Verificar Conversiones

### En la base de datos:
```bash
# Ver conversiones recientes
curl http://localhost:8001/api/affiliate/metrics
```

### En el dashboard del tipster:
El tipster verá las conversiones en su panel con la comisión correspondiente (50€ por registro).

## El SubID - La Clave del Tracking

El **SubID** es el "DNI" del tipster en el sistema:

| Característica | Descripción |
|---------------|-------------|
| Único | Cada tipster tiene un SubID único |
| Automático | Se añade automáticamente a todos los links |
| Persistente | Las casas lo devuelven en el postback |
| Atribución | Sistema lo usa para atribuir comisiones |

### Ejemplo de SubID:
- **Fausto Perez:** `694313406d86ad866d3f118f`

## ¿Por qué el tipster NO necesita generar links?

| Otras empresas | Antía |
|---------------|-------|
| Tipster genera link manualmente | Sistema genera TODO automático |
| Un link por cada casa | UNA landing con todas las casas |
| Tracking manual | Tracking 100% automático |
| Usuario ve muchos links | Usuario ve landing limpia |

## Postback Format

El simulador envía postbacks en este formato:

```json
POST /api/r/postback
{
  "subid": "694313406d86ad866d3f118f",
  "house": "simulator",
  "event": "REGISTRATION",
  "txid": "unique_transaction_id"
}
```

### Eventos soportados:
- `REGISTRATION` → Usuario se registró
- `DEPOSIT` → Usuario hizo depósito (incluye `amount` y `currency`)

## Testear Depósitos

Después de un registro, puedes simular un depósito:
```
/api/simulator/deposit?userId=<USER_ID>&amount=100
```

Esto enviará otro postback con evento `DEPOSIT` y el monto especificado.

---

## Resumen para Alex

**¿El tipster tiene que generar links manualmente?**
**NO.** Todo es automático:

1. **Crear campaña** → Sistema genera slug y SubID
2. **Compartir link** → Solo copia URL de landing
3. **Usuario hace clic** → Sistema añade SubID automáticamente
4. **Casa envía postback** → Con el mismo SubID
5. **Atribución** → Sistema detecta qué tipster trajo al usuario

**La magia está en el SubID único que se propaga automáticamente por todo el sistema.**
