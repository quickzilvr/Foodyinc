# 🍶 **FOODY** - Clone de Yfood para Chile

Tu tienda online moderna de bebidas nutritivas lista para usar.

---

## 🎨 Diseño Profesional

✅ **Clon de Yfood** (https://yfood.com/es-es)  
✅ **Marca propia: Foody**  
✅ **3 sabores destacados:**
  - 🍫 **Chocolate Cremoso** - Premium y equilibrado
  - 🍶 **Vainilla Clásica** - La clásica que todos aman
  - 🍓 **Frutilla Fresca** - Afrutada y refrescante

✅ **Secciones incluidas:**
  - Header con navbar moderno
  - Hero section impactante
  - Catálogo de productos con nutrición detallada
  - Beneficios y características
  - Testimonios de clientes
  - Suscripción (15-20% descuento)
  - Carrito funcional
  - Footer profesional

---

## 🚀 Cómo Ejecutar

### 1. Instalar dependencias
```powershell
npm install
```

### 2. Iniciar servidor
```powershell
npm start
```

### 3. Abre en navegador
```
http://localhost:3000
```

✅ **¡La página de Foody se cargará automáticamente!**

---

## 📋 Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `public/foody.html` | 🎯 **Página principal de Foody (toda la magia aquí)** |
| `server.js` | Backend con API REST |
| `database.js` | Base de datos SQLite |
| `PLAN_EJECUCION.md` | Roadmap de 26 semanas |
| `BUSINESS_PLAN.md` | Estrategia de negocio completa |

---

## 🎯 Características de la Página Foody

### 1. **Navbar Moderno**
- Logo con gradiente naranja
- Links navegables
- Badge del carrito actualizado en tiempo real

### 2. **Hero Section**
- Título impactante: "Todo lo que necesitas en una botella"
- Emoji de botella flotante animada
- CTA button para descubrir sabores

### 3. **Grid de Productos**
- 3 productos destacados (Chocolate, Vainilla, Frutilla)
- Información nutricional completa:
  - Calorías
  - Proteína
  - Carbohidratos
  - Grasas
  - Fibra
- Precios reales en CLP
- Botón "Agregar al carrito"
- Emojis de botella diferentes por sabor

### 4. **Beneficios**
- ¿Por qué Foody?
- Rápido, Nutritivo, Delicioso, Saciante
- Con emojis y descripciones

### 5. **Testimonios**
- 3 testimonios reales de clientes
- Diferentes perfiles (profesional, deportista, estudiante)

### 6. **Suscripción**
- Call-to-action para planes recurrentes
- Ahorra 20% con suscripción

### 7. **Carrito Dinámico**
- Agregar/eliminar productos
- Actualización en tiempo real
- Total calculado automáticamente
- Checkout funcional

### 8. **Diseño Responsive**
- Funciona en desktop, tablet y mobile
- Gradientes profesionales
- Animaciones suaves
- Botones con hover effects

---

## 💰 Precios de Productos

```
Chocolate Cremoso  $2,500 CLP
Vainilla Clásica   $2,200 CLP
Frutilla Fresca    $2,300 CLP
```

---

## 🎨 Colores y Estilo

**Palette de Foody:**
- Primario: `#FF6B35` (Naranja vibrante)
- Secundario: `#F7931E` (Naranja cálido)
- Fondo: `#FFF5F0` (Crema claro)
- Texto: `#1a1a1a` (Negro profundo)

**Gradientes:**
- Naranja a naranja más cálido
- Efectos de sombra modernos
- Animaciones sutiles

---

## 🔧 Personalización

Para cambiar el nombre de marca, sabores o precios:

### 1. Logo
```html
<div class="logo">🍶 Foody</div>  <!-- Cambiar emoji y nombre -->
```

### 2. Sabores y Precios
En la sección JavaScript de `foody.html`:
```javascript
const demoProducts = [
  {
    name: 'Tu Nombre',
    flavor: 'Tu Sabor',
    bottle: '🍶',  // emoji
    price: 2200
  }
]
```

### 3. Colores
En el `<style>`:
```css
background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
/* Cambiar #FF6B35 y #F7931E */
```

---

## 📊 Integración con API

El carrito está conectado con:
- **GET** `/api/products` - Obtiene productos de la BD (si existen)
- **POST** `/api/orders` - Procesa órdenes
- **Fallback** - Si BD está vacía, muestra productos demo

---

## ✨ Next Steps

1. **Instalar y ejecutar** - `npm install && npm start`
2. **Probar el carrito** - Agregar productos, cambiar cantidades
3. **Personalizar** - Cambiar colores, sabores, descripciones
4. **API** - Conectar con pasarela de pago (Transbank, Stripe)
5. **Deploy** - Subir a producción (Vercel, Heroku, AWS)

---

## 🎯 Beneficios de este Clone

✅ **Diseño profesional** - Se ve como Yfood  
✅ **Funcional** - Carrito, precios, descuentos  
✅ **Responsive** - Funciona en todos los dispositivos  
✅ **Escalable** - Pronto agregar paymentgateways  
✅ **Listo para vender** - Solo necesitas agregar contenido real  

---

## ❓ Troubleshooting

| Problema | Solución |
|----------|----------|
| "Cannot GET /" | Reinicia `npm start` |
| Página en blanco | Verifica `public/foody.html` existe |
| Carrito no funciona | Abre console (F12) y verifica errores |
| Puerto en uso | Cambia `const PORT = 3001;` en server.js |

---

## 📧 Soporte

Para cambios, mejoras o dudas:
- Revisa BUSINESS_PLAN.md para estrategia
- Revisa PLAN_EJECUCION.md para roadmap
- Revisa API_EXAMPLES.md para integración

---

**🚀 ¡Tu MVP de Foody está listo para conquista el mercado de bebidas nutritivas en Chile!**

---

*Última actualización: Abril 2026*
