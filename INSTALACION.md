# 🚀 Instrucciones de Instalación YFoods Chile MVP

## Paso 1: Abrir PowerShell como Administrador

1. Click derecho en "PowerShell" en el inicio
2. Selecciona "Ejecutar como Administrador"

## Paso 2: Ejecutar los siguientes comandos

### A. Cambiar política de ejecución (si es necesario)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### B. Navegar a la carpeta del proyecto
```powershell
cd "c:\Users\user\Desktop\Nueva carpeta (2)"
```

### C. Instalar dependencias
```powershell
npm install
```

(Esto instalará: express, sqlite3, body-parser, cors, uuid)

## Paso 3: Iniciar el servidor

```powershell
npm start
```

Deberías ver en la consola:
```
🚀 Servidor corriendo en http://localhost:3000
📊 Base de datos: yfoods.db
```

## Paso 4: Abrir en tu navegador

```
http://localhost:3000
```

---

## 📋 Estructura creada:

✅ **Base de datos (SQLite)** con tablas para:
   - Productos/fórmulas nutricionales
   - Usuarios/clientes
   - Órdenes y detalles
   - Suscripciones (semanal/mensual)
   - Costos de producción y márgenes
   - Información de fórmulas científicas

✅ **API REST Backend** con endpoints para:
   - /api/products - Gestionar productos
   - /api/orders - Crear y ver órdenes
   - /api/subscriptions - Gestionar suscripciones
   - /api/production-costs - Registrar costos

✅ **Frontend E-commerce** con:
   - Catálogo de productos con información nutricional
   - Carrito de compras funcional
   - Información de clientes objetivos
   - Diseño responsive

✅ **Plan de ejecución detallado** (PLAN_EJECUCION.md) con:
   - 6 fases de desarrollo (26 semanas)
   - Checklist de tareas
   - Contactos de laboratorios en Chile
   - Presupuesto estimado
   - KPIs a monitorear

---

## 🔥 Próximos Pasos (Operacionales)

Una vez que el servidor esté corriendo:

1. **Agregar productos de prueba** a la base de datos:
   - Vainilla & Proteína
   - Fresa & Plátano
   - Chocolate & Almendra

2. **Probar el carrito** y checkout

3. **Validar los endpoints** con Postman o Insomnia

4. **Comenzar Fase 1** del plan: Contratar nutricionista e ingeniero en alimentos

---

## 🆘 Si tienes problemas:

**Error "npm not found":**
- Instala Node.js desde: https://nodejs.org (18+ LTS)

**Error "Permission denied":**
- Ejecuta PowerShell como Administrador
- Ejecuta: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Puerto 3000 en uso:**
- Cambia el puerto en server.js: `const PORT = 3001;`

---

¡Adelante con YFoods Chile! 🥤 💪
