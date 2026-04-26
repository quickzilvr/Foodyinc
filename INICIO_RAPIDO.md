# ⚡ INICIO RÁPIDO - FOODY

## En 3 pasos estás vendiendo:

### 1️⃣ Abre PowerShell como Administrador

Click derecho → "Ejecutar como administrador"

### 2️⃣ Ejecuta estos comandos EN ORDEN:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

(Presiona `Y` si te pregunta)

```powershell
cd "c:\Users\user\Desktop\Nueva carpeta (2)"
npm install
npm start
```

### 3️⃣ Abre en navegador:

```
http://localhost:3000
```

---

## ✅ Que deberías ver:

✨ **Página FOODY completamente funcional**
- Logo y navbar moderno
- 3 sabores: Chocolate, Vainilla, Frutilla
- Información nutricional
- Carrito funcionando
- Botones animados
- Diseño profesional (like Yfood)

---

## 🛒 Prueba el Carrito:

1. Click en "Chocolate Cremoso" → **Agregar al carrito**
2. Añade más productos
3. Ve al carrito (🛒 abajo)
4. Click **"Completar Compra"**
5. ¡Listo!

---

## 📱 Características:

| Función | Status |
|---------|--------|
| Página profesional | ✅ Lista |
| 3 sabores | ✅ Chocolate, Vainilla, Frutilla |
| Carrito dinámico | ✅ Funcional |
| Precios en CLP | ✅ Configurados |
| Info nutricional | ✅ Completa |
| Responsive | ✅ Funciona en móvil |
| Animaciones | ✅ Suaves y modernas |

---

## 🎨 Lo que ves:

- **Hero impactante** con botella flotante
- **Productos** con imágenes emoji
- **Beneficios** de Foody
- **Testimonios** de clientes
- **Suscripción** con descuento
- **Footer profesional**

---

## 💾 Archivos Principales:

```
/public/foody.html       ← LA PÁGINA (todo el HTML+CSS+JS)
/server.js               ← Backend que las sirve
/database.js             ← Base de datos (SQLite)
FOODY_README.md          ← Guía completa
```

---

## ⚠️ Si hay problemas:

**"npm: no se reconoce"**
- Instala Node.js desde https://nodejs.org (click en LTS)
- Reinicia PowerShell

**"Puerto 3000 en uso"**
- Busca qué proceso usa 3000:
```powershell
netstat -ano | findstr :3000
```
- Ciérralo o cambia el puerto en server.js

**"Página en blanco"**
- Abre consola con F12
- Verifica si hay errores rojos
- Revisa la URL sea exactamente: `http://localhost:3000`

---

## 🚀 Próximos pasos cuando esto funcione:

1. Personalizado - Cambiar sabores, precios, descripción
2. Productos reales - Conectar con BD
3. Pasarela pago - Integrar Transbank o Stripe
4. Delivery - Integrar con APIs de entrega
5. Marketing - SEO, Ads, Influencers
6. Levantar capital - Con estas métricas
7. Expandir - Sumar más sabores y productos

---

**¡Ya está! En 3 minutos tienes tu tienda online tipo Yfood funcionando.**

Suerte con Foody 🍶🚀
