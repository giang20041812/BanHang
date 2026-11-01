const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const rawSupabaseUrl = (process.env.SUPABASE_URL || '').trim();
// Tự động loại bỏ /rest/v1 hoặc dấu gạch chéo cuối nếu người dùng dán nhầm REST URL
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-id')
);

let supabase = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error('Lỗi khởi tạo Supabase:', err.message);
  }
}

// Bộ nhớ tạm fallback nếu chưa cấu hình Supabase
let memProducts = [
  { id: 1, name: 'Áo thun cotton', price: 150000, created_at: new Date().toISOString() },
  { id: 2, name: 'Quần jeans slimfit', price: 320000, created_at: new Date().toISOString() },
  { id: 3, name: 'Mũ lưỡi trai', price: 90000, created_at: new Date().toISOString() }
];

let memOrders = [
  {
    id: 1,
    customer_phone: '0912345678',
    shipping_address: '123 Cầu Giấy, Hà Nội',
    shipping_fee: 30000,
    status: 'Chờ xử lý',
    total_amount: 500000,
    created_at: new Date().toISOString(),
    order_items: [
      { id: 1, order_id: 1, product_name: 'Áo thun cotton', price: 150000, quantity: 1 },
      { id: 2, order_id: 1, product_name: 'Quần jeans slimfit', price: 320000, quantity: 1 }
    ]
  }
];

// Trạng thái kết nối
app.get('/api/status', (req, res) => {
  res.json({
    connected: isSupabaseConfigured,
    url: isSupabaseConfigured ? supabaseUrl : null
  });
});

// Lấy danh sách mặt hàng
app.get('/api/products', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data || []);
    }
    res.json(memProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm mặt hàng
app.post('/api/products', async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Thiếu tên hoặc giá mặt hàng' });
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('products')
        .insert([{ name: name.trim(), price: Number(price) }])
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    const newProd = {
      id: Date.now(),
      name: name.trim(),
      price: Number(price),
      created_at: new Date().toISOString()
    };
    memProducts.unshift(newProd);
    res.status(201).json(newProd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa mặt hàng
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    }
    memProducts = memProducts.filter(p => String(p.id) !== String(id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy danh sách đơn hàng
app.get('/api/orders', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data || []);
    }
    res.json(memOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tạo đơn hàng
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_phone, shipping_address, shipping_fee = 0, status = 'Chờ xử lý', items = [] } = req.body;
    if (!customer_phone || !shipping_address) {
      return res.status(400).json({ error: 'Vui lòng nhập SĐT và địa chỉ nhận hàng' });
    }
    if (!items.length) {
      return res.status(400).json({ error: 'Đơn hàng phải có ít nhất 1 mặt hàng' });
    }

    const shipFee = Math.max(0, Number(shipping_fee) || 0);
    const itemsTotal = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );
    const total_amount = itemsTotal + shipFee;

    if (isSupabaseConfigured) {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert([{
          customer_phone: customer_phone.trim(),
          shipping_address: shipping_address.trim(),
          shipping_fee: shipFee,
          status,
          total_amount
        }])
        .select()
        .single();

      if (orderErr) throw orderErr;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
      if (itemsErr) throw itemsErr;

      const { data: fullOrder, error: fetchErr } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', order.id)
        .single();
      if (fetchErr) throw fetchErr;

      return res.status(201).json(fullOrder);
    }

    const newOrder = {
      id: Date.now(),
      customer_phone: customer_phone.trim(),
      shipping_address: shipping_address.trim(),
      shipping_fee: shipFee,
      status,
      total_amount,
      created_at: new Date().toISOString(),
      order_items: items.map((it, idx) => ({
        id: Date.now() + idx,
        order_id: Date.now(),
        product_name: it.product_name,
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1
      }))
    };
    memOrders.unshift(newOrder);
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật trạng thái đơn hàng
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Thiếu trạng thái' });

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select('*, order_items(*)')
        .single();
      if (error) throw error;
      return res.json(data);
    }

    const order = memOrders.find(o => String(o.id) === String(id));
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    order.status = status;
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa đơn hàng
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    }
    memOrders = memOrders.filter(o => String(o.id) !== String(id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server chạy tại: http://localhost:${PORT}`);
  console.log(`Chế độ lưu trữ: ${isSupabaseConfigured ? 'Supabase (' + supabaseUrl + ')' : 'Bộ nhớ tạm (Chưa cấu hình .env)'}`);
});

