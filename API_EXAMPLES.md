# 📊 Ejemplos de API - YFoods MVP

Una vez que el servidor esté corriendo en `http://localhost:3000`, puedes usar estas llamadas.

## 🛠️ Herramienta recomendada: Postman o Insomnia
Descarga gratis desde: https://www.postman.com o https://insomnia.rest

---

## 1️⃣ CREAR PRODUCTOS (Fórmulas)

### POST `/api/products`

```json
{
  "name": "Vainilla & Proteína",
  "description": "Bebida nutritiva completa con proteína premium",
  "flavor": "Vainilla Francesa",
  "calories": 350,
  "protein": 25,
  "carbs": 35,
  "fat": 8,
  "fiber": 5,
  "price": 2200
}
```

**Response:**
```json
{
  "id": "uuid-generado",
  "message": "Producto creado exitosamente"
}
```

---

### Ejemplo 2: Fresa & Plátano

```json
{
  "name": "Fresa & Plátano",
  "description": "Bebida frutal con minerales completos",
  "flavor": "Fresa Orgánica",
  "calories": 320,
  "protein": 22,
  "carbs": 42,
  "fat": 6,
  "fiber": 6,
  "price": 2100
}
```

---

### Ejemplo 3: Chocolate & Almendra

```json
{
  "name": "Chocolate & Almendra",
  "description": "Bebida premium con cacao puro",
  "flavor": "Chocolate Dark 85%",
  "calories": 380,
  "protein": 24,
  "carbs": 38,
  "fat": 12,
  "fiber": 7,
  "price": 2500
}
```

---

## 2️⃣ VER TODOS LOS PRODUCTOS

### GET `/api/products`

No requiere body. Retorna:
```json
[
  {
    "id": "uuid-1",
    "name": "Vainilla & Proteína",
    "flavor": "Vainilla Francesa",
    "calories": 350,
    "protein": 25,
    "price": 2200,
    "status": "active",
    "created_at": "2026-04-09T..."
  },
  ...
]
```

---

## 3️⃣ VER UN PRODUCTO ESPECÍFICO

### GET `/api/products/[ID]`

Reemplaza `[ID]` con el UUID del producto

---

## 4️⃣ CREAR UNA ORDEN

### POST `/api/orders`

```json
{
  "user_id": "cliente-123",
  "items": [
    {
      "product_id": "uuid-vainilla",
      "quantity": 3,
      "price": 2200
    },
    {
      "product_id": "uuid-fresa",
      "quantity": 2,
      "price": 2100
    }
  ]
}
```

**Response:**
```json
{
  "order_id": "uuid-orden",
  "total": 8800,
  "message": "Orden creada"
}
```

---

## 5️⃣ VER ÓRDENES DE UN USUARIO

### GET `/api/orders/[USER_ID]`

Retorna todas las órdenes de ese usuario

---

## 6️⃣ CREAR SUSCRIPCIÓN (Plan semanal/mensual)

### POST `/api/subscriptions`

```json
{
  "user_id": "cliente-123",
  "product_id": "uuid-vainilla",
  "frequency": "weekly",
  "quantity": 4,
  "price": 2200
}
```

**Frequencias permitidas:**
- `weekly` (4 batidas por semana)
- `biweekly` (2 veces al mes)
- `monthly` (1 vez al mes)

**Response:**
```json
{
  "id": "uuid-subscription",
  "message": "Suscripción creada"
}
```

---

## 7️⃣ VER SUSCRIPCIONES ACTIVAS

### GET `/api/subscriptions/[USER_ID]`

Retorna todas las suscripciones activas del usuario con detalles del producto

---

## 8️⃣ REGISTRAR COSTOS DE PRODUCCIÓN

### POST `/api/production-costs`

Esto es **CRÍTICO** para saber márgenes y competitividad

```json
{
  "product_id": "uuid-vainilla",
  "raw_material_cost": 250,
  "packaging_cost": 180,
  "labor_cost": 100,
  "transportation_cost": 50,
  "margin_percentage": 350
}
```

**La API calcula automáticamente:**
- `total_unit_cost` = 250 + 180 + 100 + 50 = 580 CLP
- `selling_price` = 580 × (1 + 350/100) = 2,610 CLP

**Response:**
```json
{
  "id": "uuid-cost",
  "total_unit_cost": 580,
  "selling_price": 2610,
  "message": "Costo registrado"
}
```

---

## 📈 Tabla de Referencia de Costos (Chile)

### Estimado por litro:
| Item | Costo CLP |
|------|-----------|
| Proteína en polvo (importado) | 150-200 |
| Otros ingredientes (frutas, vitaminas) | 80-120 |
| Total ingredientes | 230-320 |
| Botella + tapa + etiqueta | 150-200 |
| Costo de producción (renta de planta) | 50-100 |
| **Costo unitario** | **430-620 CLP** |
| **Precio sugerido (50% margen)** | **860-1,240 CLP** |
| **Precio sugerido (100% margen)** | **860-1,240 CLP** |
| **Precio premium (300% margen)** | **1,720-2,480 CLP** |

---

## 🧪 PLAN DE TESTEO

1. **Crear 3 productos** (Vainilla, Fresa, Chocolate)
2. **Crear una orden** con estos productos
3. **Ver la orden** creada
4. **Crear una suscripción semanal** para un cliente
5. **Registrar costos** para cada producto
6. **Luego usar la web** para agregar productos al carrito

---

## 🔗 Verificar salud del servidor

### GET `/health`

```
Response: { "status": "OK", "message": "Servidor corriendo" }
```

---

## 💡 Atajos en Postman

Si usas Postman, puedes guardar estas variables:
```
{{base_url}} = http://localhost:3000
{{product_id}} = [reemplazar con ID del producto creado]
{{user_id}} = cliente-123
{{order_id}} = [reemplazar con ID de orden]
```

---

## 🚨 Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Cannot POST /api/products" | Servidor no corriendo | Ejecutar `npm start` |
| "EADDRINUSE: address already in use" | Puerto 3000 ocupado | Cambiar puerto en server.js |
| "TypeError: _database__WEBPACK_IMPORTED_MODULE_0__.default.run is not a function" | Importar database correctamente | Verificar require('./database') |

---

## 📚 Base de Datos (SQLite)

Archivo: `yfoods.db`

Ver contenido (con SQLite Browser):
- Descarga: https://sqlitebrowser.org
- Abre el archivo `yfoods.db`
- Inspecciona tablas: products, orders, subscriptions, etc.

---

¡Listo! Ahora puedes testear completamente tu MVP 🚀
