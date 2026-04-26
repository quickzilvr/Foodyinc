require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

function clp(n) {
  return '$' + Number(n).toLocaleString('es-CL');
}

function base(content) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    body { margin:0; padding:0; background:#f5f0e8; font-family:'Helvetica Neue',Arial,sans-serif; }
    .wrap { max-width:560px; margin:32px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
    .header { background:#1c1c1c; padding:28px 32px; }
    .header-brand { font-size:1.6rem; font-weight:700; color:#c8a55e; letter-spacing:-.02em; font-family:Georgia,serif; }
    .header-tag { font-size:.72rem; color:rgba(255,255,255,.35); text-transform:uppercase; letter-spacing:.1em; margin-top:4px; }
    .body { padding:32px; color:#1c1c1c; }
    .body h2 { font-size:1.2rem; font-weight:700; margin:0 0 8px; }
    .body p { font-size:.93rem; line-height:1.6; color:#555; margin:0 0 16px; }
    .divider { border:none; border-top:1px solid #eee; margin:24px 0; }
    .order-box { background:#f8f5f0; border-radius:10px; padding:20px; margin-bottom:20px; }
    .order-row { display:flex; justify-content:space-between; font-size:.87rem; color:#555; margin-bottom:6px; }
    .order-row:last-child { margin-bottom:0; }
    .order-total { display:flex; justify-content:space-between; font-size:1rem; font-weight:700; color:#1c1c1c; padding-top:12px; border-top:1px solid #e0d9ce; margin-top:12px; }
    .pill { display:inline-block; background:#c8a55e; color:#fff; border-radius:50px; padding:4px 12px; font-size:.75rem; font-weight:700; }
    .cta { display:block; background:#1c1c1c; color:#fff; text-decoration:none; text-align:center; padding:14px; border-radius:10px; font-weight:700; font-size:.95rem; margin-top:24px; }
    .footer { background:#f5f0e8; padding:20px 32px; text-align:center; font-size:.75rem; color:#aaa; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-brand">Foody</div>
      <div class="header-tag">Nutrición que te mueve</div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">Foody Chile &mdash; Nutrición premium &middot; Este mensaje es automático, no respondas a este correo.</div>
  </div>
</body>
</html>`;
}

// ── Bienvenida al registrarse ──
async function sendWelcome({ email, name }) {
  const html = base(`
    <h2>Bienvenido/a a Foody, ${name}</h2>
    <p>Tu cuenta fue creada exitosamente. Ya puedes explorar nuestros productos y hacer tu primera orden.</p>
    <p>Foody es nutrición diseñada para personas que se mueven. Proteína premium, sabores reales, sin vueltas.</p>
    <a class="cta" href="https://foodyinc.vercel.app">Explorar productos</a>
  `);
  await transporter.sendMail({
    from: `"Foody" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Bienvenido/a a Foody, ${name}`,
    html,
  });
}

// ── Confirmación de orden al cliente ──
async function sendOrderConfirmation({ email, name, orderId, items, total }) {
  const itemsHtml = items.map(i =>
    `<div class="order-row"><span>${i.product_name || i.name} ×${i.quantity}</span><span>${clp(i.price * i.quantity)}</span></div>`
  ).join('');

  const html = base(`
    <h2>Tu orden fue recibida</h2>
    <p>Hola ${name}, confirmamos que recibimos tu pedido. Lo estamos preparando y te avisaremos cuando esté en camino.</p>
    <div class="order-box">
      <div style="margin-bottom:12px;"><span class="pill">Orden #${orderId.slice(0,8).toUpperCase()}</span></div>
      ${itemsHtml}
      <div class="order-total"><span>Total</span><span>${clp(total)}</span></div>
    </div>
    <p style="font-size:.82rem;color:#aaa;">¿Alguna pregunta? Responde a este correo o escríbenos.</p>
    <a class="cta" href="https://foodyinc.vercel.app">Ver más productos</a>
  `);

  await transporter.sendMail({
    from: `"Foody" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Orden confirmada #${orderId.slice(0,8).toUpperCase()} — Foody`,
    html,
  });
}

// ── Alerta de nueva orden al admin ──
async function sendAdminOrderAlert({ orderId, customerName, customerEmail, total, items }) {
  const itemsHtml = items.map(i =>
    `<div class="order-row"><span>${i.product_name || i.name} ×${i.quantity}</span><span>${clp(i.price * i.quantity)}</span></div>`
  ).join('');

  const html = base(`
    <h2>Nueva orden recibida</h2>
    <div class="order-box">
      <div style="margin-bottom:12px;"><span class="pill">Orden #${orderId.slice(0,8).toUpperCase()}</span></div>
      <div class="order-row"><span>Cliente</span><span>${customerName || 'Invitado'}</span></div>
      <div class="order-row"><span>Email</span><span>${customerEmail || '—'}</span></div>
      <hr style="border:none;border-top:1px solid #e0d9ce;margin:12px 0;">
      ${itemsHtml}
      <div class="order-total"><span>Total</span><span>${clp(total)}</span></div>
    </div>
    <a class="cta" href="https://foodyinc.vercel.app/admin">Ir al panel de órdenes</a>
  `);

  await transporter.sendMail({
    from: `"Foody Sistema" <${process.env.GMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `Nueva orden ${clp(total)} — #${orderId.slice(0,8).toUpperCase()}`,
    html,
  });
}

// ── Confirmación de suscripción ──
async function sendSubscriptionConfirmation({ email, name, productName, frequency, quantity, price }) {
  const freqLabel = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' }[frequency] || frequency;
  const html = base(`
    <h2>Suscripción activada</h2>
    <p>Hola ${name}, tu suscripción fue creada exitosamente.</p>
    <div class="order-box">
      <div class="order-row"><span>Producto</span><span>${productName}</span></div>
      <div class="order-row"><span>Frecuencia</span><span>${freqLabel}</span></div>
      <div class="order-row"><span>Cantidad</span><span>${quantity}</span></div>
      <div class="order-total"><span>Precio por entrega</span><span>${clp(price)}</span></div>
    </div>
    <p style="font-size:.82rem;color:#aaa;">Puedes cancelar tu suscripción en cualquier momento desde tu perfil.</p>
    <a class="cta" href="https://foodyinc.vercel.app">Ver mi cuenta</a>
  `);

  await transporter.sendMail({
    from: `"Foody" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Suscripción activada — ${productName}`,
    html,
  });
}

module.exports = { sendWelcome, sendOrderConfirmation, sendAdminOrderAlert, sendSubscriptionConfirmation };
