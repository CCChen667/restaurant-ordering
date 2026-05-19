import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Image upload
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
app.use('/uploads', express.static(uploadDir));

// Serve frontend
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));

// Database
const dbPath = path.join(__dirname, 'restaurant.db');
const SQL = await initSqlJs();

let db;
if (fs.existsSync(dbPath)) {
  const buf = fs.readFileSync(dbPath);
  db = new SQL.Database(buf);
} else {
  db = new SQL.Database();
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// Auto-save every 30s
setInterval(saveDb, 30000);

// Schema
db.run(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);
db.run(`
  CREATE TABLE IF NOT EXISTS dishes (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price REAL NOT NULL,
    image TEXT DEFAULT '',
    available INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);
db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    table_no TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    total REAL NOT NULL,
    remark TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);
db.run(`
  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    dish_id TEXT NOT NULL,
    dish_name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1
  );
`);

// Helper: query returning array of objects
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function getOne(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Seed default data if empty
const catCount = getOne('SELECT COUNT(*) as c FROM categories');
if (catCount.c === 0) {
  const cats = [
    { id: 'cat-1', name: '招牌推荐', order: 1 },
    { id: 'cat-2', name: '热菜', order: 2 },
    { id: 'cat-3', name: '凉菜', order: 3 },
    { id: 'cat-4', name: '汤品', order: 4 },
    { id: 'cat-5', name: '主食', order: 5 },
    { id: 'cat-6', name: '饮品', order: 6 },
  ];

  const dishes = [
    { id: 'd-1', cat: 'cat-1', name: '秘制红烧肉', desc: '五花肉慢炖，入口即化', price: 58, order: 1 },
    { id: 'd-2', cat: 'cat-1', name: '招牌酸菜鱼', desc: '鲜嫩鱼片，酸辣开胃', price: 68, order: 2 },
    { id: 'd-3', cat: 'cat-2', name: '宫保鸡丁', desc: '花生酥脆，鸡肉滑嫩', price: 38, order: 1 },
    { id: 'd-4', cat: 'cat-2', name: '鱼香肉丝', desc: '经典川菜，下饭神器', price: 36, order: 2 },
    { id: 'd-5', cat: 'cat-2', name: '水煮牛肉', desc: '麻辣鲜香，肉质嫩滑', price: 52, order: 3 },
    { id: 'd-6', cat: 'cat-2', name: '干锅花菜', desc: '焦香入味，素菜之王', price: 28, order: 4 },
    { id: 'd-7', cat: 'cat-3', name: '拍黄瓜', desc: '清脆爽口，蒜香浓郁', price: 16, order: 1 },
    { id: 'd-8', cat: 'cat-3', name: '凉拌木耳', desc: '酸辣爽脆，开胃小菜', price: 18, order: 2 },
    { id: 'd-9', cat: 'cat-4', name: '番茄蛋花汤', desc: '酸甜可口，营养丰富', price: 18, order: 1 },
    { id: 'd-10', cat: 'cat-4', name: '酸辣汤', desc: '酸辣过瘾，暖胃暖心', price: 20, order: 2 },
    { id: 'd-11', cat: 'cat-5', name: '米饭', desc: '东北大米', price: 3, order: 1 },
    { id: 'd-12', cat: 'cat-5', name: '手工水饺', desc: '现包现煮，皮薄馅大', price: 28, order: 2 },
    { id: 'd-13', cat: 'cat-6', name: '酸梅汤', desc: '冰镇酸梅汤', price: 8, order: 1 },
    { id: 'd-14', cat: 'cat-6', name: '可乐', desc: '冰镇可口可乐', price: 5, order: 2 },
  ];

  cats.forEach(c => {
    db.run('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)', [c.id, c.name, c.order]);
  });
  dishes.forEach(d => {
    db.run('INSERT INTO dishes (id, category_id, name, description, price, sort_order) VALUES (?, ?, ?, ?, ?, ?)', [d.id, d.cat, d.name, d.desc, d.price, d.order]);
  });
  saveDb();
}

// ==================== API ====================

// --- Categories ---
app.get('/api/categories', (req, res) => {
  res.json(query('SELECT * FROM categories ORDER BY sort_order'));
});

app.post('/api/categories', (req, res) => {
  const { name, sort_order = 0 } = req.body;
  const id = `cat-${randomUUID().slice(0, 8)}`;
  db.run('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)', [id, name, sort_order]);
  saveDb();
  res.json({ id, name, sort_order });
});

app.put('/api/categories/:id', (req, res) => {
  const { name, sort_order } = req.body;
  db.run('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?', [name, sort_order, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/categories/:id', (req, res) => {
  db.run('DELETE FROM dishes WHERE category_id = ?', [req.params.id]);
  db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// --- Dishes ---
app.get('/api/dishes', (req, res) => {
  res.json(query('SELECT * FROM dishes ORDER BY sort_order'));
});

app.get('/api/dishes/by-category', (req, res) => {
  const cats = query('SELECT * FROM categories ORDER BY sort_order');
  const dishes = query('SELECT * FROM dishes WHERE available = 1 ORDER BY sort_order');
  const result = cats.map(cat => ({
    ...cat,
    dishes: dishes.filter(d => d.category_id === cat.id)
  })).filter(c => c.dishes.length > 0);
  res.json(result);
});

app.post('/api/dishes', upload.single('image'), (req, res) => {
  const { category_id, name, description = '', price, available = 1, sort_order = 0 } = req.body;
  const id = `dish-${randomUUID().slice(0, 8)}`;
  const image = req.file ? `/uploads/${req.file.filename}` : '';
  db.run('INSERT INTO dishes (id, category_id, name, description, price, image, available, sort_order) VALUES (?,?,?,?,?,?,?,?)',
    [id, category_id, name, description, parseFloat(price), image, parseInt(available), parseInt(sort_order)]);
  saveDb();
  res.json({ id, category_id, name, description, price: parseFloat(price), image, available: parseInt(available), sort_order: parseInt(sort_order) });
});

app.put('/api/dishes/:id', upload.single('image'), (req, res) => {
  const { category_id, name, description, price, available, sort_order } = req.body;
  const existing = getOne('SELECT * FROM dishes WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Dish not found' });

  const image = req.file ? `/uploads/${req.file.filename}` : existing.image;
  db.run('UPDATE dishes SET category_id=?, name=?, description=?, price=?, image=?, available=?, sort_order=? WHERE id=?',
    [category_id, name, description, parseFloat(price), image, parseInt(available ?? 1), parseInt(sort_order ?? 0), req.params.id]);
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/dishes/:id', (req, res) => {
  db.run('DELETE FROM dishes WHERE id = ?', [req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// --- Orders ---
app.post('/api/orders', (req, res) => {
  const { table_no, items, remark = '' } = req.body;
  if (!table_no || !items || items.length === 0) {
    return res.status(400).json({ error: '缺少桌号或菜品' });
  }
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  db.run('INSERT INTO orders (id, table_no, total, remark) VALUES (?,?,?,?)', [orderId, table_no, total, remark]);
  items.forEach(item => {
    db.run('INSERT INTO order_items (id, order_id, dish_id, dish_name, price, quantity) VALUES (?,?,?,?,?,?)',
      [`oi-${randomUUID().slice(0, 8)}`, orderId, item.dish_id, item.dish_name, item.price, item.quantity]);
  });
  saveDb();
  res.json({ id: orderId, table_no, total, status: 'pending' });
});

app.get('/api/orders', (req, res) => {
  const { status, limit = 50 } = req.query;
  let orders;
  if (status) {
    orders = query('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?', [status, parseInt(limit)]);
  } else {
    orders = query('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?', [parseInt(limit)]);
  }
  orders.forEach(o => {
    o.items = query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
  });
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const order = getOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.items = query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  res.json(order);
});

app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  db.run("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, req.params.id]);
  saveDb();
  res.json({ ok: true });
});

// Stats
app.get('/api/stats/today', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const stats = getOne(`
    SELECT COUNT(*) as order_count, COALESCE(SUM(total), 0) as revenue
    FROM orders WHERE date(created_at) = ? AND status != 'cancelled'
  `, [today]);
  res.json(stats);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🍽️  Restaurant ordering server running on http://localhost:${PORT}`);
});
