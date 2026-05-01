require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./database');
const { hashPassword, verifyPassword, generateToken } = require('./utils');
const { sendWelcome, sendOrderConfirmation, sendAdminOrderAlert, sendSubscriptionConfirmation } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Necesario para el retorno de Transbank
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'foody.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

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
  sendWelcome({ email: email.toLowerCase().trim(), name }).catch(() => {});
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

  // Emails post-respuesta (no bloquean al cliente)
  const { data: userData } = await supabase.from('users').select('name, email').eq('id', user_id).single();
  const emailItems = items.map(i => ({ product_name: i.name || i.product_id, quantity: i.quantity, price: i.price }));
  if (userData?.email) {
    sendOrderConfirmation({ email: userData.email, name: userData.name, orderId: order_id, items: emailItems, total }).catch(() => {});
  }
  sendAdminOrderAlert({ orderId: order_id, customerName: userData?.name, customerEmail: userData?.email, total, items: emailItems }).catch(() => {});
});

app.put('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: `Estado inválido. Opciones: ${valid.join(', ')}` });
  const { data, error } = await supabase.from('orders').update({ status }).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  if (!data?.length) return res.status(404).json({ error: 'Orden no encontrada' });
  res.json({ message: 'Estado actualizado' });

  // Notificación WhatsApp al cliente (post-respuesta, no bloquea)
  const order = data[0];
  if (order?.user_id) {
    const { data: user } = await supabase.from('users').select('name, phone').eq('id', order.user_id).single();
    if (user?.phone) {
      const shortId = req.params.id.slice(0, 8).toUpperCase();
      const msgs = {
        confirmed: `✅ ¡Hola ${user.name}! Tu pedido *#${shortId}* de Foody fue confirmado. Pronto empezamos a prepararlo 🚀`,
        preparing: `🥤 ¡${user.name}, estamos preparando tu Foody! Pedido *#${shortId}* en proceso.`,
        shipped:   `🚚 ¡Tu Foody va en camino! Pedido *#${shortId}*. Te avisamos cuando llegue.`,
        delivered: `✅ ¡Tu Foody llegó, ${user.name}! Esperamos que lo disfrutes 💪 Cualquier consulta escríbenos.`,
        cancelled: `Tu pedido *#${shortId}* fue cancelado. Si tienes dudas contáctanos directo por aquí.`
      };
      if (msgs[status]) sendWhatsAppMessage(user.phone, msgs[status]).catch(() => {});
    }
  }
});

// ==================== SUSCRIPCIONES ====================
app.post('/api/subscriptions', validate(['product_id', 'quantity', 'price']), async (req, res) => {
  const user_id = req.body.user_id || 'guest';
  const { product_id, frequency, quantity, price } = req.body;
  const validFreq = ['weekly', 'biweekly', 'monthly'];
  const id = uuidv4();
  const chosenFreq = validFreq.includes(frequency) ? frequency : 'weekly';
  const { error } = await supabase.from('subscriptions').insert({
    id, user_id, product_id, frequency: chosenFreq, quantity, price
  });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ id, message: 'Suscripción creada exitosamente' });

  const [{ data: userData }, { data: productData }] = await Promise.all([
    supabase.from('users').select('name, email').eq('id', user_id).single(),
    supabase.from('products').select('name').eq('id', product_id).single(),
  ]);
  if (userData?.email) {
    sendSubscriptionConfirmation({ email: userData.email, name: userData.name, productName: productData?.name || product_id, frequency: chosenFreq, quantity, price }).catch(() => {});
  }
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

// ==================== PAGOS — TRANSBANK WEBPAY PLUS ====================
const { WebpayPlus, Options, Environment, IntegrationCommerceCodes, IntegrationApiKeys } = require('transbank-sdk');

// Mapa en memoria: tbk_token → { order_id, total }
// El round-trip suele durar segundos; reinicio de servidor durante pago es improbable en MVP.
const pendingTbk = new Map();

function tbkTx() {
  if (process.env.NODE_ENV === 'production') {
    return new WebpayPlus.Transaction(new Options(
      process.env.TBK_COMMERCE_CODE,
      process.env.TBK_API_KEY,
      Environment.Production
    ));
  }
  return new WebpayPlus.Transaction(new Options(
    IntegrationCommerceCodes.WEBPAY_PLUS,
    IntegrationApiKeys.WEBPAY,
    Environment.Integration
  ));
}

// Paso 1: crear orden en DB e iniciar transacción con Transbank
app.post('/api/payment/transbank/init', async (req, res) => {
  const { items, user_id } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'El carrito está vacío' });

  const total = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0));
  if (total <= 0) return res.status(400).json({ error: 'Total inválido' });

  const order_id = uuidv4();
  const { error: oErr } = await supabase.from('orders').insert({
    id: order_id, user_id: user_id || null, total, status: 'pending'
  });
  if (oErr) return res.status(500).json({ error: oErr.message });

  const orderItems = items.map(i => ({
    id: uuidv4(), order_id,
    product_id: i.product_id, quantity: i.quantity, price: i.price
  }));
  const { error: iErr } = await supabase.from('order_items').insert(orderItems);
  if (iErr) {
    await supabase.from('orders').delete().eq('id', order_id);
    return res.status(500).json({ error: iErr.message });
  }

  const buy_order = order_id.replace(/-/g, '').substring(0, 26);
  const session_id = `${user_id || 'guest'}-${Date.now()}`.substring(0, 61);
  const return_url = process.env.TRANSBANK_RETURN_URL;

  try {
    const { token, url } = await tbkTx().create(buy_order, session_id, total, return_url);
    pendingTbk.set(token, { order_id, total });
    res.json({ token, url });
  } catch (err) {
    await supabase.from('orders').delete().eq('id', order_id);
    console.error('[Transbank] init error:', err.message);
    res.status(500).json({ error: 'Error al iniciar pago. Intenta de nuevo.' });
  }
});

// Paso 2: Transbank hace POST aquí tras el pago
app.post('/payment/transbank/return', async (req, res) => {
  const { token_ws, TBK_TOKEN } = req.body;

  // Usuario canceló o hubo timeout (no hay token_ws, solo TBK_TOKEN)
  if (!token_ws) {
    const pending = pendingTbk.get(TBK_TOKEN);
    if (pending) {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', pending.order_id);
      pendingTbk.delete(TBK_TOKEN);
    }
    return res.redirect('/?payment=cancelled');
  }

  // Timeout con ambos tokens (flujo raro de Transbank)
  if (token_ws && TBK_TOKEN) {
    const pending = pendingTbk.get(token_ws);
    if (pending) {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', pending.order_id);
      pendingTbk.delete(token_ws);
    }
    return res.redirect('/?payment=cancelled');
  }

  // Flujo normal: confirmar con Transbank
  const pending = pendingTbk.get(token_ws);
  if (!pending) return res.redirect('/?payment=error');

  try {
    const result = await tbkTx().commit(token_ws);
    pendingTbk.delete(token_ws);

    if (result.response_code === 0) {
      await supabase.from('orders').update({ status: 'confirmed' }).eq('id', pending.order_id);

      // Emails post-pago (no bloquean al cliente)
      const { data: userData } = await supabase
        .from('users').select('name, email').eq('id', pending.order_id).single();
      if (userData?.email) {
        const { data: orderItems } = await supabase
          .from('order_items').select('*, products(name)').eq('order_id', pending.order_id);
        const emailItems = (orderItems || []).map(i => ({
          product_name: i.products?.name || i.product_id, quantity: i.quantity, price: i.price
        }));
        sendOrderConfirmation({ email: userData.email, name: userData.name, orderId: pending.order_id, items: emailItems, total: pending.total }).catch(() => {});
        sendAdminOrderAlert({ orderId: pending.order_id, customerName: userData.name, customerEmail: userData.email, total: pending.total, items: emailItems }).catch(() => {});
      }

      return res.redirect(`/?payment=success&order_id=${pending.order_id}&total=${pending.total}`);
    } else {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', pending.order_id);
      return res.redirect('/?payment=rejected');
    }
  } catch (err) {
    console.error('[Transbank] commit error:', err.message);
    if (pending) {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', pending.order_id);
      pendingTbk.delete(token_ws);
    }
    return res.redirect('/?payment=error');
  }
});

// ==================== PAGOS — MERCADO PAGO ====================
const { MercadoPagoConfig, Preference } = require('mercadopago');

function mpClient() {
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

// Paso 1: crear orden en DB y preferencia de MP
app.post('/api/payment/mp/init', async (req, res) => {
  const { items, user_id } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'El carrito está vacío' });

  const total = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0));
  if (total <= 0) return res.status(400).json({ error: 'Total inválido' });

  const order_id = uuidv4();
  const { error: oErr } = await supabase.from('orders').insert({
    id: order_id, user_id: user_id || null, total, status: 'pending'
  });
  if (oErr) return res.status(500).json({ error: oErr.message });

  const orderItems = items.map(i => ({
    id: uuidv4(), order_id,
    product_id: i.product_id, quantity: i.quantity, price: i.price
  }));
  const { error: iErr } = await supabase.from('order_items').insert(orderItems);
  if (iErr) {
    await supabase.from('orders').delete().eq('id', order_id);
    return res.status(500).json({ error: iErr.message });
  }

  const base = process.env.BASE_URL || `http://localhost:${PORT}`;

  try {
    const pref = new Preference(mpClient());
    const result = await pref.create({
      body: {
        external_reference: order_id,
        items: items.map(i => ({
          id: i.product_id,
          title: i.name || i.product_id,
          quantity: Number(i.quantity),
          unit_price: Number(i.price),
          currency_id: 'CLP'
        })),
        back_urls: {
          success: `${base}/payment/mp/return`,
          failure: `${base}/payment/mp/return`,
          pending: `${base}/payment/mp/return`
        },
        auto_return: 'approved',
        notification_url: `${base}/webhook/mp`
      }
    });

    const is_prod = process.env.NODE_ENV === 'production';
    res.json({ init_point: is_prod ? result.init_point : result.sandbox_init_point });
  } catch (err) {
    await supabase.from('orders').delete().eq('id', order_id);
    console.error('[MercadoPago] init error:', err.message);
    res.status(500).json({ error: 'Error al iniciar pago. Intenta de nuevo.' });
  }
});

// Paso 2: MP redirige aquí tras el pago (GET)
app.get('/payment/mp/return', async (req, res) => {
  const { status, external_reference } = req.query;

  if (status === 'approved') {
    if (external_reference) {
      await supabase.from('orders').update({ status: 'confirmed' }).eq('id', external_reference);

      const { data: userData } = await supabase
        .from('users').select('name, email').eq('id', external_reference).single();
      if (userData?.email) {
        const { data: orderItems } = await supabase
          .from('order_items').select('*, products(name)').eq('order_id', external_reference);
        const emailItems = (orderItems || []).map(i => ({
          product_name: i.products?.name || i.product_id, quantity: i.quantity, price: i.price
        }));
        const { data: ord } = await supabase.from('orders').select('total').eq('id', external_reference).single();
        sendOrderConfirmation({ email: userData.email, name: userData.name, orderId: external_reference, items: emailItems, total: ord?.total || 0 }).catch(() => {});
        sendAdminOrderAlert({ orderId: external_reference, customerName: userData.name, customerEmail: userData.email, total: ord?.total || 0, items: emailItems }).catch(() => {});
      }
    }
    return res.redirect(`/?payment=success&order_id=${external_reference || ''}`);

  } else if (status === 'pending') {
    if (external_reference)
      await supabase.from('orders').update({ status: 'pending' }).eq('id', external_reference);
    return res.redirect('/?payment=pending');

  } else {
    if (external_reference)
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', external_reference);
    return res.redirect('/?payment=cancelled');
  }
});

// Webhook IPN de Mercado Pago (notificaciones server-to-server)
app.post('/webhook/mp', async (req, res) => {
  res.sendStatus(200); // responder rápido
  const { type, data } = req.body;
  if (type !== 'payment' || !data?.id) return;

  try {
    const { Payment } = require('mercadopago');
    const payment = await new Payment(mpClient()).get({ id: data.id });
    const order_id = payment.external_reference;
    if (!order_id) return;

    if (payment.status === 'approved') {
      await supabase.from('orders').update({ status: 'confirmed' }).eq('id', order_id);
    } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(payment.status)) {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order_id);
    }
  } catch (err) {
    console.error('[MercadoPago] webhook error:', err.message);
  }
});

// ==================== FACEBOOK ADS + CLAUDE SCHEDULER ====================
const Anthropic = require('@anthropic-ai/sdk');
const cron      = require('node-cron');

const FB_API = 'https://graph.facebook.com/v20.0';

async function fbGet(path, params = {}) {
  const url = new URL(`${FB_API}${path}`);
  url.searchParams.set('access_token', process.env.FB_ACCESS_TOKEN);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const r = await fetch(url.toString());
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}

async function fbPost(path, body = {}) {
  const url = new URL(`${FB_API}${path}`);
  url.searchParams.set('access_token', process.env.FB_ACCESS_TOKEN);
  const r = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}

// Genera copy con Claude Haiku (optimización de tokens — Haiku para tareas creativas estructuradas)
async function generateFbCopy() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Genera un copy persuasivo para anuncio de Facebook de Foody, una bebida nutricional chilena.
Detalles del producto:
- Shake proteico premium. Sabores: Chocolate, Vainilla, Frutilla
- Precio: $2.200–$2.500 CLP por unidad
- Target: Chilenos activos, 25–40 años
- Tono: Directo, energético, casual chileno
- Diferenciador: Nutrición completa, sin artificiales

Responde ÚNICAMENTE con JSON válido (sin markdown, sin explicaciones):
{"headline":"máx 40 chars","body":"2-3 oraciones persuasivas","cta":"máx 3 palabras","target_audience":"descripción breve del target"}`
    }]
  });

  const text = msg.content[0].text.trim();
  let parsed;
  try { parsed = JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Claude no devolvió JSON válido');
    parsed = JSON.parse(m[0]);
  }

  const id = uuidv4();
  await supabase.from('fb_copies').insert({
    id,
    headline: parsed.headline || '',
    body: parsed.body || '',
    cta: parsed.cta || 'Comprar',
    target_audience: parsed.target_audience || '',
    generated_by: 'claude-haiku',
    status: 'pending'
  });
  return { id, ...parsed, created_at: new Date().toISOString() };
}

// Métricas en tiempo real de la cuenta publicitaria
app.get('/api/admin/fb/metrics', requireAdmin, async (_req, res) => {
  try {
    const accountId = process.env.FB_AD_ACCOUNT_ID;
    if (!accountId || accountId === 'act_000000000000000')
      return res.status(503).json({ error: 'FB_AD_ACCOUNT_ID no configurado' });

    const raw = await fbGet(`/${accountId}/insights`, {
      fields: 'spend,impressions,clicks,cpc,cpm,actions,action_values',
      date_preset: 'today',
      level: 'account'
    });

    const row = raw.data?.[0] || {};
    const conversions = parseInt((row.actions || []).find(a => a.action_type === 'purchase')?.value || 0);
    const revenue     = parseFloat((row.action_values || []).find(a => a.action_type === 'purchase')?.value || 0);
    const spend       = parseFloat(row.spend || 0);
    const metrics = {
      spend,
      impressions: parseInt(row.impressions || 0),
      clicks:      parseInt(row.clicks || 0),
      cpc:         parseFloat(row.cpc || 0),
      cpm:         parseFloat(row.cpm || 0),
      roas:        spend > 0 ? revenue / spend : 0,
      conversions,
      date: new Date().toISOString().slice(0, 10)
    };

    const today = metrics.date;
    await supabase.from('fb_metrics').upsert(
      { id: today, ...metrics, fetched_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
    res.json(metrics);
  } catch (e) {
    console.error('[FB] metrics:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Campañas activas y pausadas
app.get('/api/admin/fb/campaigns', requireAdmin, async (_req, res) => {
  try {
    const accountId = process.env.FB_AD_ACCOUNT_ID;
    if (!accountId || accountId === 'act_000000000000000')
      return res.status(503).json({ error: 'FB_AD_ACCOUNT_ID no configurado' });

    const raw = await fbGet(`/${accountId}/campaigns`, {
      fields: 'id,name,status,objective,daily_budget,created_time',
      effective_status: JSON.stringify(['ACTIVE', 'PAUSED'])
    });
    res.json(raw.data || []);
  } catch (e) {
    console.error('[FB] campaigns:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Crear campaña en Facebook + guardar en DB
app.post('/api/admin/fb/campaigns', requireAdmin, async (req, res) => {
  const { name, objective = 'OUTCOME_SALES', daily_budget = 5000 } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const accountId = process.env.FB_AD_ACCOUNT_ID;
  if (!accountId || accountId === 'act_000000000000000')
    return res.status(503).json({ error: 'FB_AD_ACCOUNT_ID no configurado' });
  try {
    const result = await fbPost(`/${accountId}/campaigns`, {
      name, objective, status: 'PAUSED',
      daily_budget: daily_budget * 100, // centavos de USD
      special_ad_categories: []
    });
    const id = uuidv4();
    await supabase.from('fb_campaigns').insert({
      id, fb_campaign_id: result.id, name, objective,
      status: 'PAUSED', daily_budget
    });
    res.json({ id, fb_campaign_id: result.id, name, message: 'Campaña creada (PAUSADA)' });
  } catch (e) {
    console.error('[FB] create campaign:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Listar copies (DB local)
app.get('/api/admin/fb/copies', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('fb_copies').select('*').order('created_at', { ascending: false }).limit(30);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Generar copy con Claude (on-demand desde el panel)
app.post('/api/admin/fb/copies/generate', requireAdmin, async (_req, res) => {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-your-key-here')
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY no configurada' });
  try {
    const copy = await generateFbCopy();
    res.json(copy);
  } catch (e) {
    console.error('[Claude] copy gen:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Crear anuncio en Facebook con un copy de la DB
app.post('/api/admin/fb/ads', requireAdmin, async (req, res) => {
  const { copy_id, campaign_id, name, daily_budget = 2000 } = req.body;
  if (!copy_id || !campaign_id) return res.status(400).json({ error: 'copy_id y campaign_id son requeridos' });

  const { data: copy } = await supabase.from('fb_copies').select('*').eq('id', copy_id).single();
  if (!copy) return res.status(404).json({ error: 'Copy no encontrado' });
  const { data: camp } = await supabase.from('fb_campaigns').select('*').eq('id', campaign_id).single();
  if (!camp) return res.status(404).json({ error: 'Campaña no encontrada en DB' });

  const accountId = process.env.FB_AD_ACCOUNT_ID;
  const pageId    = process.env.FB_PAGE_ID;
  if (!accountId || accountId === 'act_000000000000000')
    return res.status(503).json({ error: 'FB_AD_ACCOUNT_ID no configurado' });
  if (!pageId || pageId === '000000000000000')
    return res.status(503).json({ error: 'FB_PAGE_ID no configurado' });

  try {
    const adName = name || `Foody · ${copy.headline}`;
    const base   = process.env.BASE_URL || 'https://foodyinc.vercel.app';

    // 1) Ad Set
    const adSet = await fbPost(`/${accountId}/adsets`, {
      name: adName,
      campaign_id: camp.fb_campaign_id,
      daily_budget: daily_budget * 100,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      targeting: {
        geo_locations: { countries: ['CL'] },
        age_min: 22, age_max: 45
      },
      status: 'PAUSED'
    });

    // 2) Creative
    const creative = await fbPost(`/${accountId}/adcreatives`, {
      name: adName,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          message: copy.body,
          link: base,
          name: copy.headline,
          call_to_action: { type: 'SHOP_NOW', value: { link: base } }
        }
      }
    });

    // 3) Ad
    const ad = await fbPost(`/${accountId}/ads`, {
      name: adName,
      adset_id: adSet.id,
      creative: { creative_id: creative.id },
      status: 'PAUSED'
    });

    const id = uuidv4();
    await supabase.from('fb_ads').insert({
      id, fb_ad_id: ad.id, fb_campaign_id: camp.fb_campaign_id,
      copy_id, name: adName, status: 'PAUSED'
    });
    await supabase.from('fb_copies').update({ status: 'used' }).eq('id', copy_id);

    res.json({ id, fb_ad_id: ad.id, message: 'Anuncio creado en Facebook (PAUSADO)' });
  } catch (e) {
    console.error('[FB] create ad:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Listar anuncios (DB local)
app.get('/api/admin/fb/ads', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('fb_ads').select('*, fb_copies(headline, body)')
    .order('created_at', { ascending: false }).limit(30);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Campañas guardadas en DB (sin llamar a FB API — para el modal de crear anuncio)
app.get('/api/admin/fb/campaigns/local', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('fb_campaigns').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Scheduler: genera copies a las 9:00, 14:00 y 19:00 (hora Santiago) ──
cron.schedule('0 9,14,19 * * *', async () => {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-your-key-here') return;
  console.log('[Scheduler] Generando copy Facebook Ads...');
  try {
    const copy = await generateFbCopy();
    console.log('[Scheduler] Copy generado:', copy.headline);

    // Si hay una campaña activa en DB, crea el anuncio automáticamente
    const { data: activeCamps } = await supabase
      .from('fb_campaigns').select('*').eq('status', 'ACTIVE').limit(1);
    if (activeCamps?.length > 0) {
      const camp = activeCamps[0];
      const pageId    = process.env.FB_PAGE_ID;
      const accountId = process.env.FB_AD_ACCOUNT_ID;
      if (accountId && pageId && accountId !== 'act_000000000000000') {
        const base    = process.env.BASE_URL || 'https://foodyinc.vercel.app';
        const adName  = `Auto · ${copy.headline}`;
        const adSet   = await fbPost(`/${accountId}/adsets`, {
          name: adName, campaign_id: camp.fb_campaign_id,
          daily_budget: 200000, billing_event: 'IMPRESSIONS',
          optimization_goal: 'OFFSITE_CONVERSIONS',
          targeting: { geo_locations: { countries: ['CL'] }, age_min: 22, age_max: 45 },
          status: 'PAUSED'
        });
        const creative = await fbPost(`/${accountId}/adcreatives`, {
          name: adName,
          object_story_spec: {
            page_id: pageId,
            link_data: {
              message: copy.body, link: base, name: copy.headline,
              call_to_action: { type: 'SHOP_NOW', value: { link: base } }
            }
          }
        });
        const ad = await fbPost(`/${accountId}/ads`, {
          name: adName, adset_id: adSet.id,
          creative: { creative_id: creative.id }, status: 'PAUSED'
        });
        await supabase.from('fb_ads').insert({
          id: uuidv4(), fb_ad_id: ad.id, fb_campaign_id: camp.fb_campaign_id,
          copy_id: copy.id, name: adName, status: 'PAUSED'
        });
        await supabase.from('fb_copies').update({ status: 'used' }).eq('id', copy.id);
        console.log('[Scheduler] Anuncio auto-creado:', adName);
      }
    }
  } catch (e) {
    console.error('[Scheduler FB]', e.message);
  }
}, { timezone: 'America/Santiago' });

// ==================== HEALTH ====================
app.get('/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// ==================== WHATSAPP WEBHOOK ====================
// Verificación del webhook (Meta llama esto al configurar)
app.get('/webhook/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook WhatsApp verificado');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Forbidden');
});

// Recepción de mensajes
app.post('/webhook/whatsapp', async (req, res) => {
  res.sendStatus(200); // Responder rápido a Meta

  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return;

  const entry    = body.entry?.[0];
  const change   = entry?.changes?.[0];
  const message  = change?.value?.messages?.[0];
  if (!message || message.type !== 'text') return;

  const from = message.from;           // número del remitente
  const text = message.text.body.trim().toLowerCase();

  let reply = '';

  try {
    if (text === 'stats' || text === 'estadísticas' || text === 'estadisticas') {
      const { data } = await supabase.rpc('get_admin_stats');
      const s = data;
      reply = `*Foody — Stats del día*\n\n` +
        `💰 Ingresos hoy: $${Number(s.today_revenue).toLocaleString('es-CL')}\n` +
        `📦 Órdenes hoy: ${s.today_orders}\n` +
        `⏳ Pendientes: ${s.pending_orders}\n` +
        `🔄 Suscripciones activas: ${s.active_subscriptions}\n` +
        `👥 Clientes: ${s.total_customers}\n` +
        `💵 Ingresos totales: $${Number(s.total_revenue).toLocaleString('es-CL')}`;

    } else if (text === 'ordenes' || text === 'órdenes') {
      const { data } = await supabase.rpc('get_admin_orders');
      const pending = data.filter(o => o.status === 'pending').slice(0, 5);
      if (pending.length === 0) {
        reply = '✅ No hay órdenes pendientes.';
      } else {
        reply = `*Órdenes pendientes (${pending.length}):*\n\n` +
          pending.map(o =>
            `#${o.id.slice(0,8).toUpperCase()} — ${o.customer_name || 'Invitado'} — $${Number(o.total).toLocaleString('es-CL')}`
          ).join('\n');
      }

    } else if (text.startsWith('confirmar ')) {
      const shortId = text.replace('confirmar ', '').trim().toUpperCase();
      const { data: orders } = await supabase.rpc('get_admin_orders');
      const order = orders?.find(o => o.id.slice(0,8).toUpperCase() === shortId);
      if (!order) {
        reply = `❌ No encontré la orden #${shortId}`;
      } else {
        await supabase.from('orders').update({ status: 'confirmed' }).eq('id', order.id);
        reply = `✅ Orden #${shortId} confirmada.`;
      }

    } else if (text === 'clientes') {
      const { data } = await supabase.rpc('get_admin_stats');
      reply = `👥 Clientes registrados: ${data.total_customers}`;

    } else if (text === 'ayuda' || text === 'help' || text === 'menu' || text === 'menú') {
      reply = `*Foody Bot — Comandos disponibles:*\n\n` +
        `📊 *stats* — KPIs del día\n` +
        `📦 *ordenes* — Órdenes pendientes\n` +
        `✅ *confirmar XXXXXXXX* — Confirmar una orden\n` +
        `👥 *clientes* — Total de clientes\n` +
        `🌐 *panel* — Link al admin\n\n` +
        `También puedes hacerme cualquier pregunta sobre Foody.`;

    } else if (text === 'panel') {
      reply = '🌐 Panel de administración:\nhttps://foodyinc.vercel.app/admin';

    } else {
      // Cualquier otra cosa → respuesta genérica
      reply = `No reconocí ese comando. Escribe *ayuda* para ver los comandos disponibles.`;
    }
  } catch (e) {
    reply = `⚠️ Error procesando el comando: ${e.message}`;
  }

  if (reply) {
    await sendWhatsAppMessage(from, reply).catch(console.error);
  }
});

async function sendWhatsAppMessage(to, text) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token         = process.env.WHATSAPP_ACCESS_TOKEN;
  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    })
  });
}

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
