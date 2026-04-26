# 📊 Estructura de Base de Datos - YFoods MVP

## Diagrama Relacional

```
┌─────────────────────────────────────────────────────────────────┐
│                        YFOODS CHILE DB                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│     PRODUCTS         │
│ (Bebidas/Fórmulas)   │
├──────────────────────┤
│ id (PK) UUID         │ ─┐
│ name TEXT            │  │
│ description TEXT     │  │
│ flavor TEXT          │  │ 1═════════════N
│ calories INTEGER     │  │  
│ protein REAL         │  │
│ carbs REAL           │  │
│ fat REAL             │  │
│ fiber REAL           │  │
│ price REAL           │  │
│ status TEXT          │  │
│ created_at DATETIME  │  │
└──────────────────────┘  │
                          │
                  ┌───────┴────────┐
                  │                │
          ┌───────▼──────────┐  ┌────▼────────────┐
          │  FORMULAS        │  │  ORDER_ITEMS    │
          │ (Recetas)        │  │  (Detalle orden)│
          ├──────────────────┤  ├─────────────────┤
          │ id (PK) UUID     │  │ id (PK) UUID    │
          │ product_id (FK)──┼──┤ product_id (FK)─┤──┐
          │ ingredients TEXT │  │ order_id (FK)───┤──┼──┐
          │ prep_method TEXT │  │ quantity INT    │  │  │
          │ shelf_life TEXT  │  │ price REAL      │  │  │
          │ pH REAL          │  └─────────────────┘  │  │
          │ viscosity TEXT   │                       │  │
          │ micro_test TEXT  │                       │  │
          │ status TEXT      │       ┌───────────────┘  │
          └──────────────────┘       │                  │
                                     │                  │
                  ┌──────────────────┴──────┐           │
                  │                         │           │
          ┌───────▼──────────┐    ┌────────▼────────┐  │
          │  ORDERS          │    │  USERS          │  │
          │  (Compras)       │    │  (Clientes)     │  │
          ├──────────────────┤    ├─────────────────┤  │
          │ id (PK) UUID     │    │ id (PK) UUID    │  │
          │ user_id (FK)─────┼────┤ user_id (FK)    │  │
          │ order_date DT    │    │ email TEXT      │  │
          │ status TEXT      │    │ password TEXT   │  │
          │ total REAL       │    │ name TEXT       │  │
          └──────────────────┘    │ phone TEXT      │  │
                                  │ address TEXT    │  │
                                  │ user_type TEXT  │  │
                                  │ created_at DT   │  │
                                  └─────────────────┘  │
                                           ▲           │
                                           │           │
                          ┌────────────────┘           │
                          │                            │
                  ┌───────▼──────────────┐    ┌────────▼────────────┐
                  │  SUBSCRIPTIONS       │    │ PRODUCTION_COSTS    │
                  │  (Planes suscripci)  │    │ (Costos unitarios)  │
                  ├──────────────────────┤    ├─────────────────────┤
                  │ id (PK) UUID         │    │ id (PK) UUID        │
                  │ user_id (FK)─────────┼───▶│ product_id (FK)─────┤──┐
                  │ product_id (FK)──────┼───▶│ raw_material_cost   │  │
                  │ frequency TEXT       │    │ packaging_cost      │  │
                  │ quantity INT         │    │ labor_cost          │  │
                  │ price REAL           │    │ transportation_cost │  │
                  │ status TEXT          │    │ total_unit_cost     │  │
                  │ next_delivery DT     │    │ margin_percentage   │  │
                  └──────────────────────┘    │ selling_price       │  │
                                              │ created_at DT       │  │
                                              └─────────────────────┘  │
                                                            ▲           │
                                                            └───────────┘
```

---

## Especificación de Tablas

### 1. `products` - Catálogo de Bebidas

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,                    -- UUID generado
  name TEXT NOT NULL,                     -- Ej: "Vainilla & Proteína"
  description TEXT,                       -- Descripción larga
  flavor TEXT,                            -- Ej: "Vainilla Francesa"
  calories INTEGER,                       -- Ej: 350 kcal
  protein REAL,                           -- Ej: 25.5 gramos
  carbs REAL,                             -- Ej: 35.0 gramos
  fat REAL,                               -- Ej: 8.5 gramos
  fiber REAL,                             -- Ej: 5.0 gramos
  price REAL NOT NULL,                    -- Ej: 2200 CLP
  status TEXT DEFAULT 'active',           -- 'active', 'inactive', 'development'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Ejemplo:**
```
id: a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6
name: Vainilla & Proteína
flavor: Vainilla Francesa
calories: 350
protein: 25
price: 2200
status: active
```

---

### 2. `users` - Base de Clientes

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID generado
  email TEXT UNIQUE NOT NULL,             -- Ej: usuario@example.com
  password TEXT NOT NULL,                 -- Hash (bcrypt recom)
  name TEXT,                              -- Ej: "Juan Pérez"
  phone TEXT,                             -- Ej: "+56912345678"
  address TEXT,                           -- Dirección para delivery
  user_type TEXT DEFAULT 'customer',      -- 'customer', 'admin', 'partner'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Tipos de usuario:**
- `customer`: Cliente normal
- `admin`: Administrador sistema
- `partner`: Gimnasio/negocio asociado

---

### 3. `orders` - Órdenes/Compras

```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,                    -- UUID generado
  user_id TEXT NOT NULL,                  -- Link a usuario
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',          -- Estados posibles
  total REAL,                             -- Total en CLP
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Estados de orden:**
```
pending      → Orden creada, esperando pago
confirmed    → Pago confirmado
shipped      → Enviado a delivery
delivered    → Entregado
cancelled    → Cancelado
refunded     → Devuelto
```

---

### 4. `order_items` - Detalles de Orden

```sql
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,                    -- UUID generado
  order_id TEXT NOT NULL,                 -- Link a orden
  product_id TEXT NOT NULL,               -- Link a producto
  quantity INTEGER,                       -- Cantidad: Ej 3 unidades
  price REAL,                             -- Precio al momento de compra
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Ejemplo:**
```
order_id: order-123
product_id: prod-vainilla
quantity: 3
price: 2200
Subtotal: 6,600 CLP
```

---

### 5. `subscriptions` - Planes Recurrentes

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,                    -- UUID generado
  user_id TEXT NOT NULL,                  -- Cliente
  product_id TEXT NOT NULL,               -- Producto
  frequency TEXT DEFAULT 'weekly',        -- Frecuencia
  quantity INTEGER,                       -- Cuántas unidades por ciclo
  price REAL,                             -- Precio unitario
  status TEXT DEFAULT 'active',           -- 'active', 'paused', 'cancelled'
  start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  next_delivery DATETIME,                 -- Próxima entrega  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Frecuencias:**
- `weekly`: Cada semana (7 días) = 4 entregas/mes
- `biweekly`: Cada 2 semanas = 2 entregas/mes
- `monthly`: Una vez al mes = 1 entrega/mes
- `daily`: Diariamente (futuro)

---

### 6. `formulas` - Recetas Científicas

```sql
CREATE TABLE formulas (
  id TEXT PRIMARY KEY,                    -- UUID generado
  product_id TEXT NOT NULL,               -- Vinculado a producto
  ingredients TEXT,                       -- JSON: lista de ingredientes
  preparation_method TEXT,                -- Pasos de preparación
  shelf_life TEXT,                        -- Ej: "6 meses a temp ambiente"
  ph_level REAL,                          -- Ej: 3.8 (acidez)
  viscosity TEXT,                         -- Ej: "150 centipoises"
  microbiological_test TEXT,              -- Estado: pending, passed, failed
  stability_test TEXT,                    -- Estado del test
  status TEXT DEFAULT 'development',      -- Fase: development, testing, approved
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Estados de fórmula:**
```
development  → En desarrollo en laboratorio
testing      → En pruebas microbiológicas
approved     → Aprobada por ISP/MINSAL
production   → Listo para producir
```

---

### 7. `production_costs` - Margen & Precio

```sql
CREATE TABLE production_costs (
  id TEXT PRIMARY KEY,                    -- UUID generado
  product_id TEXT NOT NULL,               -- Producto
  raw_material_cost REAL,                 -- Costo ingredientes (CLP)
  packaging_cost REAL,                    -- Costo botella/etiqueta (CLP)
  labor_cost REAL,                        -- Costo mano de obra (CLP)
  transportation_cost REAL,               -- Costo logística (CLP)
  total_unit_cost REAL,                   -- Total costo unitario
  margin_percentage REAL,                 -- % margen deseado
  selling_price REAL,                     -- Precio final recomendado
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Ejemplo de cálculo:**
```
raw_material:      250 CLP
packaging:         180 CLP
labor:             100 CLP
transportation:     50 CLP
─────────────────────────
total_unit_cost:   580 CLP

margin_percentage: 300% (3x)
selling_price:     580 × (1 + 300/100) = 2,320 CLP

Ganancia por unidad: 2,320 - 580 = 1,740 CLP (75% margen)
```

---

## 📈 Queries Comunes

### Obtener orden completa con detalles
```sql
SELECT 
  o.id, o.order_date, o.total,
  u.name, u.email,
  oi.quantity, oi.price, p.name as product_name
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.id = 'order-123';
```

### Suscripciones activas de un cliente
```sql
SELECT s.*, p.name, p.flavor
FROM subscriptions s
JOIN products p ON s.product_id = p.id
WHERE s.user_id = 'cliente-123' AND s.status = 'active';
```

### Ingresos del mes
```sql
SELECT 
  SUM(total) as total_revenue,
  COUNT(DISTINCT user_id) as unique_customers
FROM orders
WHERE strftime('%m', order_date) = '04'
  AND strftime('%Y', order_date) = '2026';
```

### Margen promedio por producto
```sql
SELECT 
  p.name,
  p.price,
  pc.total_unit_cost,
  (p.price - pc.total_unit_cost) as profit,
  ROUND((p.price - pc.total_unit_cost) / p.price * 100, 1) as margin_percentage
FROM products p
LEFT JOIN production_costs pc ON p.id = pc.product_id;
```

---

## 🔄 Flujo de Datos

### Flujo 1: Compra Simple
```
1. Cliente agrega producto al carrito (frontend)
2. Click "Comprar" → POST /api/orders
3. Backend crea order + order_items
4. DB almacena la transacción
5. Enviar confirmación email
6. Workflow delivery
```

### Flujo 2: Suscripción Recurrente
```
1. Cliente selecciona plan (weekly/monthly)
2. POST /api/subscriptions
3. Sistema crea registro en DB
4. Scheduler automático cada 7/30 días
5. Auto-crea orden nueva (order + order_items)
6. Delivery auto
7. Cobra automáticamente
```

### Flujo 3: Desarrollo de Producto
```
1. Nutricionista + Ingeniero definen fórmula
2. POST /api/products + /api/formulas
3. Testean en laboratorio
4. Resultados microbiológicos
5. Status: development → testing → approved
6. Una vez approved → status: active en products
7. Disponible para vender
```

---

## 📋 Tabla de Referencia - Estados y Frecuencias

| Campo | Valores Posibles |
|-------|-----------------|
| Product Status | active, inactive, development, discontinued |
| Order Status | pending, confirmed, shipped, delivered, cancelled, refunded |
| User Type | customer, admin, partner |
| Subscription Status | active, paused, cancelled |
| Subscription Frequency | weekly, biweekly, monthly |
| Formula Status | development, testing, approved, production |
| Microtest Status | pending, passed, failed |

---

## 🛡️ Seguridad

**Campos sensibles:**
- `users.password` → Debe hashear con bcrypt, nunca almacenar en texto plano
- `users.email` → UNIQUE constraint, verificar con OTP
- `orders.total` → Validar cantidad y precio en backend

**Recomendaciones:**
1. Usar HTTPS en producción
2. JWT tokens para autenticación
3. Rate limiting en endpoints de pago
4. Encripción de datos de usuario
5. Logs de auditoria para cambios

---

## 🚀 Próximos Pasos para el MVP

1. ✅ Base de datos diseñada
2. ✅ API construida
3. ⏳ Agregar autenticación (JWT)
4. ⏳ Integrar Transbank para pagos
5. ⏳ Setup scheduler para suscripciones automáticas
6. ⏳ Panel de admin para ver datos
7. ⏳ Integración con delivery (Didi/Lyft/Zapp)

---

Última actualización: Abril 2026
