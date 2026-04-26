require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./database');
const { hashPassword, verifyPassword, generateToken } = require('./utils');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (_req, res) => res.sendFile('public/foody.html', { root: __dirname }));
app.get('/admin', (_req, res) => res.sendFile('public/admin.html', { root: __dirname }));

// ==================== MIDDLEWARE ====================
async function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  const { data: session } = await supabase.from('sessions').select('user_id').eq('token', token).single();
  if (!session) return res.status(401).json({ error: 'Token inválido' });
  req.userId = session.user_id;
  next();
}

async function requireAdmin(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  const { data: session } = await supabase.from('sessions').select('user_id').eq('token', token).single();
  if (!session) return res.status(403).json({ error: 'Acceso denegado' });
  const { data: user } = await supabase.from('users').select('*').eq('id', session.user_id).eq('user_type', 'admin').single();
  if (!user) return res.status(403).json({ error: 'Acceso denegado' });
  req.userId = user.id;
  req.adminUser = user;
  next();
}

function validate(fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => req.body[f] === undefined || req.body[f] === '');
    if (missing.length > 0)
      return res.status(400).json({ error: `Campos requeridos: ${missing.join(', ')}` });
    next();
  };
}

// ==================== AUTH ====================
app.post('/api/auth/register', validate(['email', 'password', 'name']), async (req, res) => {
  const { email, password, name, phone, address } = req.body;
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const id = uuidv4();
  const { error } = await supabase.from('users').insert({
    id, email: email.toLowerCase().trim(), password: hashPassword(password),
    name, phone: phone || null, address: address || null
  });
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    return res.status(500).json({ error: error.message });
  }
  const token = generateToken();
  await supabase.from('sessions').insert({ token, user_id: id });
  res.status(201).json({ token, user: { id, email, name } });
});

app.post('/api/auth/login', validate(['email', 'password']), async (req, res) => {
  const { email, password } = req.body;
  const { data: user } = await supabase.from('users').select('*').eq('email', email.toLowerCase().trim()).single();
  if (!user || !verifyPassword(password, user.password))
    return res.status(401).json({ error: 'Email o contraseña incorrectos' });

  const token = generateToken();
  await supabase.from('sessions').insert({ token, user_id: user.id });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, user_type: user.user_type } });
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await supabase.from('sessions').delete().eq('token', req.headers['x-auth-token']);
  res.json({ message: 'Sesión cerrada' });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const { data: user } = await supabase
    .from('users').select('id, email, name, phone, address, user_type, created_at')
    .eq('id', req.userId).single();
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

// ==================== ADMIN ====================
app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.rpc('get_admin_stats');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.rpc('get_admin_orders');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/admin/orders/:id/items', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('order_items').select('*, products(name, flavor)').eq('order_id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(item => ({ ...item, product_name: item.products?.name, flavor: item.products?.flavor })));
});

app.get('/api/admin/subscriptions', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('subscriptions').select('*, users(name, email), products(name, flavor)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(s => ({
    ...s,
    customer_name: s.users?.name, customer_email: s.users?.email,
    product_name: s.products?.name, product_flavor: s.products?.flavor
  })));
});

app.get('/api/admin/customers', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.rpc('get_admin_customers');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ==================== PRODUCTOS ====================
app.get('/api/products', async (_req, res) => {
  const { data, error } = await supabase.from('products').select('*').eq('status', 'active').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/products/all', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/products/:id', async (req, res) => {
  const { data, error } = await supabase.from('products').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(data);
});

app.post('/api/products', validate(['name', 'price']), async (req, res) => {
  const { name, description, flavor, calories, protein, carbs, fat, fiber, price } = req.body;
  if (isNaN(price) || price <= 0) return res.status(400).json({ error: 'Precio inválido' });
  const id = uuidv4();
  const { error } = await supabase.from('products').insert({
    id, name, description: description || '', flavor: flavor || '',
    calories: calories || 0, protein: protein || 0, carbs: carbs || 0,
    fat: fat || 0, fiber: fiber || 0, price
  });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ id, message: 'Producto creado exitosamente' });
});

app.put('/api/products/:id', validate(['name', 'price']), async (req, res) => {
  const { name, description, flavor, calories, protein, carbs, fat, fiber, price } = req.body;
  const { data, error } = await supabase.from('products').update({
    name, description: description || '', flavor: flavor || '',
    calories: calories || 0, protein: protein || 0, carbs: carbs || 0,
    fat: fat || 0, fiber: fiber || 0, price
  }).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  if (!data?.length) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ message: 'Producto actualizado' });
});

app.delete('/api/products/:id', async (req, res) => {
  const { data, error } = await supabase.from('products').update({ status: 'inactive' }).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  if (!data?.length) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ message: 'Producto eliminado' });
});

// ==================== ÓRDENES ====================
app.get('/api/orders', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('orders').select('*, order_items(id)').eq('user_id', req.userId).order('order_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(o => ({ ...o, items_count: o.order_items?.length || 0 })));
});

app.get('/api/orders/:userId', async (req, res) => {
  const { data, error } = await supabase.from('orders').select('*, order_items(id)').eq('user_id', req.params.userId).order('order_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(o => ({ ...o, items_count: o.order_items?.length || 0 })));
});

app.post('/api/orders', validate(['items']), async (req, res) => {
  const user_id = req.body.user_id || 'guest';
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'La orden debe tener al menos un producto' });

  const order_id = uuidv4();
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const { error: orderError } = await supabase.from('orders').insert({ id: order_id, user_id, total });
  if (orderError) return res.status(500).json({ error: orderError.message });

  const orderItems = items.map(item => ({
    id: uuidv4(), order_id, product_id: item.product_id,
    quantity: item.quantity, price: item.price
  }));
  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order_id);
    return res.status(500).json({ error: itemsError.message });
  }
  res.status(201).json({ order_id, total, message: 'Orden creada exitosamente' });
});

app.put('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: `Estado inválido. Opciones: ${valid.join(', ')}` });
  const { data, error } = await supabase.from('orders').update({ status }).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  if (!data?.length) return res.status(404).json({ error: 'Orden no encontrada' });
  res.json({ message: 'Estado actualizado' });
});

// ==================== SUSCRIPCIONES ====================
app.post('/api/subscriptions', validate(['product_id', 'quantity', 'price']), async (req, res) => {
  const user_id = req.body.user_id || 'guest';
  const { product_id, frequency, quantity, price } = req.body;
  const validFreq = ['weekly', 'biweekly', 'monthly'];
  const id = uuidv4();
  const { error } = await supabase.from('subscriptions').insert({
    id, user_id, product_id, frequency: validFreq.includes(frequency) ? frequency : 'weekly', quantity, price
  });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ id, message: 'Suscripción creada exitosamente' });
});

app.get('/api/subscriptions/:userId', async (req, res) => {
  const { data, error } = await supabase
    .from('subscriptions').select('*, products(name, flavor, price)')
    .eq('user_id', req.params.userId).eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(s => ({ ...s, name: s.products?.name, flavor: s.products?.flavor, product_price: s.products?.price })));
});

app.delete('/api/subscriptions/:id', async (req, res) => {
  const { data, error } = await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  if (!data?.length) return res.status(404).json({ error: 'Suscripción no encontrada' });
  res.json({ message: 'Suscripción cancelada' });
});

// ==================== COSTOS ====================
app.post('/api/production-costs', validate(['product_id', 'raw_material_cost', 'margin_percentage']), async (req, res) => {
  const { product_id, raw_material_cost, packaging_cost, labor_cost, transportation_cost, margin_percentage } = req.body;
  const id = uuidv4();
  const pkg = packaging_cost || 0, labor = labor_cost || 0, transport = transportation_cost || 0;
  const total_unit_cost = raw_material_cost + pkg + labor + transport;
  const selling_price = total_unit_cost * (1 + margin_percentage / 100);
  const { error } = await supabase.from('production_costs').insert({
    id, product_id, raw_material_cost, packaging_cost: pkg, labor_cost: labor,
    transportation_cost: transport, total_unit_cost, margin_percentage, selling_price
  });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ id, total_unit_cost, selling_price, message: 'Costo registrado' });
});

app.get('/api/production-costs/:productId', async (req, res) => {
  const { data, error } = await supabase.from('production_costs').select('*').eq('product_id', req.params.productId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ==================== HEALTH ====================
app.get('/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, _req, res, _next) => { console.error(err.stack); res.status(500).json({ error: 'Error interno del servidor' }); });

async function initAdmin() {
  const { data } = await supabase.from('users').select('id').eq('user_type', 'admin').limit(1);
  if (data && data.length > 0) return;
  const id = uuidv4();
  const { error } = await supabase.from('users').insert({
    id, email: 'admin@foody.cl', password: hashPassword('admin1234'),
    name: 'Administrador', user_type: 'admin'
  });
  if (!error) console.log('Admin creado — email: admin@foody.cl  contraseña: admin1234');
}

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Panel admin: http://localhost:${PORT}/admin`);
  await initAdmin();
});
