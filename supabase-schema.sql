CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  user_type TEXT DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flavor TEXT DEFAULT '',
  description TEXT DEFAULT '',
  calories INT DEFAULT 0,
  protein INT DEFAULT 0,
  carbs INT DEFAULT 0,
  fat INT DEFAULT 0,
  fiber INT DEFAULT 0,
  price REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  total REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  order_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  quantity INT DEFAULT 1,
  price REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  product_id TEXT REFERENCES products(id),
  frequency TEXT DEFAULT 'weekly',
  quantity INT DEFAULT 1,
  price REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_costs (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  raw_material_cost REAL DEFAULT 0,
  packaging_cost REAL DEFAULT 0,
  labor_cost REAL DEFAULT 0,
  transportation_cost REAL DEFAULT 0,
  total_unit_cost REAL DEFAULT 0,
  margin_percentage REAL DEFAULT 0,
  selling_price REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_costs DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'total_orders',         (SELECT COUNT(*) FROM orders WHERE status != 'cancelled'),
    'total_revenue',        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelled'),
    'today_orders',         (SELECT COUNT(*) FROM orders WHERE DATE(order_date) = CURRENT_DATE AND status != 'cancelled'),
    'today_revenue',        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE DATE(order_date) = CURRENT_DATE AND status != 'cancelled'),
    'active_subscriptions', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active'),
    'active_products',      (SELECT COUNT(*) FROM products WHERE status = 'active'),
    'total_customers',      (SELECT COUNT(*) FROM users WHERE user_type = 'customer'),
    'pending_orders',       (SELECT COUNT(*) FROM orders WHERE status = 'pending')
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_admin_orders()
RETURNS TABLE (
  id TEXT, order_date TIMESTAMPTZ, status TEXT, total REAL,
  user_id TEXT, customer_name TEXT, customer_email TEXT, items_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.order_date, o.status, o.total, o.user_id,
         u.name, u.email, COUNT(oi.id)
  FROM orders o
  LEFT JOIN users u ON o.user_id = u.id
  LEFT JOIN order_items oi ON o.id = oi.order_id
  GROUP BY o.id, o.order_date, o.status, o.total, o.user_id, u.name, u.email
  ORDER BY o.order_date DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_admin_customers()
RETURNS TABLE (
  id TEXT, name TEXT, email TEXT, phone TEXT,
  created_at TIMESTAMPTZ, total_orders BIGINT, total_spent REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.email, u.phone, u.created_at,
         COUNT(DISTINCT o.id), COALESCE(SUM(o.total), 0)::REAL
  FROM users u
  LEFT JOIN orders o ON u.id = o.user_id
  WHERE u.user_type = 'customer'
  GROUP BY u.id
  ORDER BY COALESCE(SUM(o.total), 0) DESC;
END;
$$ LANGUAGE plpgsql;

-- ── FACEBOOK ADS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fb_copies (
  id TEXT PRIMARY KEY,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  cta TEXT DEFAULT 'Comprar',
  target_audience TEXT DEFAULT '',
  generated_by TEXT DEFAULT 'claude-haiku',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fb_campaigns (
  id TEXT PRIMARY KEY,
  fb_campaign_id TEXT UNIQUE,
  name TEXT NOT NULL,
  objective TEXT DEFAULT 'OUTCOME_SALES',
  status TEXT DEFAULT 'PAUSED',
  daily_budget REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fb_ads (
  id TEXT PRIMARY KEY,
  fb_ad_id TEXT,
  fb_campaign_id TEXT,
  copy_id TEXT REFERENCES fb_copies(id),
  name TEXT,
  status TEXT DEFAULT 'PAUSED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fb_metrics (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  spend REAL DEFAULT 0,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  cpc REAL DEFAULT 0,
  cpm REAL DEFAULT 0,
  roas REAL DEFAULT 0,
  conversions INT DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fb_copies    DISABLE ROW LEVEL SECURITY;
ALTER TABLE fb_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE fb_ads       DISABLE ROW LEVEL SECURITY;
ALTER TABLE fb_metrics   DISABLE ROW LEVEL SECURITY;

INSERT INTO products (id, name, flavor, description, calories, protein, carbs, fat, fiber, price)
VALUES
  ('chocolate-001', 'Foody Chocolate', 'Chocolate Puro',     'Proteína de suero premium con cacao 100% natural. Cremoso, indulgente y completamente nutritivo.', 380, 25, 38, 12, 7, 2500),
  ('vainilla-001',  'Foody Vainilla',  'Vainilla Francesa',  'Clásico y equilibrado. Suave, cremoso y listo para acompañarte en cualquier momento del día.',    350, 25, 35,  8, 5, 2200),
  ('frutilla-001',  'Foody Frutilla',  'Frutilla Silvestre', 'Frutal, fresco y refrescante. La energía natural de la frutilla con toda la nutrición de Foody.',  320, 22, 42,  6, 6, 2300)
ON CONFLICT (id) DO NOTHING;

