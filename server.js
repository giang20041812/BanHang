const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

const rawSupabaseUrl = (process.env.SUPABASE_URL || '').trim();
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

// Cơ chế mã hóa token vĩnh viễn (Stateless - không bao giờ hết hạn, không bị mất khi restart server)
const AUTH_SECRET = process.env.AUTH_SECRET || 'order_mgr_permanent_secret_key_2026';

function createToken(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, username: user.username })).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// Bộ nhớ tạm fallback nếu chưa cấu hình Supabase
let memUsers = [
  { id: 1, username: 'vinh', password: '123456', created_at: new Date().toISOString() }
];

let memBatches = [
  { id: 1, user_id: 1, name: 'Đợt mở bán đầu tiên', status: 'active', created_at: new Date().toISOString() }
];

let memProducts = [
  { id: 1, user_id: 1, batch_id: 1, name: 'Áo thun cotton', price: 150000, created_at: new Date().toISOString() },
  { id: 2, user_id: 1, batch_id: 1, name: 'Quần jeans slimfit', price: 320000, created_at: new Date().toISOString() },
  { id: 3, user_id: 1, batch_id: 1, name: 'Mũ lưỡi trai', price: 90000, created_at: new Date().toISOString() }
];

let memOrders = [
  {
    id: 1,
    user_id: 1,
    batch_id: 1,
    customer_name: 'Nguyễn Văn A',
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

// Hàm di chuyển dữ liệu cũ trên Supabase sang tài khoản 'vinh' và đợt bán mặc định
async function migrateSupabaseData() {
  if (!supabase) return;
  try {
    // 1. Kiểm tra tài khoản vinh
    let { data: vinhUser, error: findErr } = await supabase
      .from('users')
      .select('*')
      .ilike('username', 'vinh')
      .maybeSingle();

    if (findErr) {
      console.warn('Lưu ý Supabase: Chưa tìm thấy bảng "users". Bạn hãy chạy file schema.sql trên Supabase SQL Editor.');
      return;
    }

    if (!vinhUser) {
      const { data: newUser, error: createErr } = await supabase
        .from('users')
        .insert([{ username: 'vinh', password: '123456' }])
        .select()
        .single();
      if (!createErr) {
        vinhUser = newUser;
        console.log('Đã tạo tài khoản mặc định "vinh" trên Supabase thành công.');
      }
    }

    if (vinhUser && vinhUser.id) {
      // 2. Chuyển toàn bộ sản phẩm chưa có user_id sang vinh
      await supabase
        .from('products')
        .update({ user_id: vinhUser.id })
        .is('user_id', null);

      // 3. Chuyển toàn bộ đơn hàng chưa có user_id sang vinh
      await supabase
        .from('orders')
        .update({ user_id: vinhUser.id })
        .is('user_id', null);

      // 4. Kiểm tra đợt bán mặc định cho vinh
      let { data: vinhBatch } = await supabase
        .from('sales_batches')
        .select('*')
        .eq('user_id', vinhUser.id)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!vinhBatch) {
        const { data: newBatch } = await supabase
          .from('sales_batches')
          .insert([{ user_id: vinhUser.id, name: 'Đợt mở bán đầu tiên', status: 'active' }])
          .select()
          .single();
        vinhBatch = newBatch;
      }

      if (vinhBatch && vinhBatch.id) {
        // Gán batch_id cho các sản phẩm & đơn hàng chưa có
        await supabase
          .from('products')
          .update({ batch_id: vinhBatch.id })
          .eq('user_id', vinhUser.id)
          .is('batch_id', null);

        await supabase
          .from('orders')
          .update({ batch_id: vinhBatch.id })
          .eq('user_id', vinhUser.id)
          .is('batch_id', null);
      }

      console.log('Đồng bộ dữ liệu sang tài khoản "vinh" và đợt bán hoàn tất.');
    }
  } catch (err) {
    console.warn('Lỗi khi kiểm tra migration dữ liệu Supabase:', err.message);
  }
}

if (isSupabaseConfigured) {
  migrateSupabaseData();
}

// Middleware xác thực người dùng (xác thực vĩnh viễn)
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.query.token || '');

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }

  req.user = user;
  next();
}

// Trạng thái kết nối
app.get('/api/status', (req, res) => {
  res.json({
    connected: isSupabaseConfigured,
    url: isSupabaseConfigured ? supabaseUrl : null
  });
});

// ================= AUTHENTICATION =================

// Đăng ký
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, confirm_password } = req.body;
    const cleanUsername = (username || '').trim();
    const cleanPassword = (password || '').trim();
    const cleanConfirm = (confirm_password || '').trim();

    if (!cleanUsername) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập' });
    }
    if (!cleanPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu' });
    }
    if (cleanPassword !== cleanConfirm) {
      return res.status(400).json({ error: 'Mật khẩu xác nhận không khớp' });
    }

    if (isSupabaseConfigured) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại, vui lòng chọn tên khác' });
      }

      const { data: newUser, error: insertErr } = await supabase
        .from('users')
        .insert([{ username: cleanUsername, password: cleanPassword }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Tạo sẵn 1 đợt bán đầu tiên cho người dùng
      await supabase
        .from('sales_batches')
        .insert([{ user_id: newUser.id, name: 'Đợt bán số 1', status: 'active' }]);

      const userInfo = { id: newUser.id, username: newUser.username };
      const token = createToken(userInfo);

      return res.status(201).json({
        message: 'Đăng ký thành công',
        token,
        user: userInfo
      });
    }

    // In-memory
    const exists = memUsers.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại, vui lòng chọn tên khác' });
    }

    const newUser = {
      id: Date.now(),
      username: cleanUsername,
      password: cleanPassword,
      created_at: new Date().toISOString()
    };
    memUsers.push(newUser);

    // Tạo sẵn đợt bán đầu tiên trong bộ nhớ
    memBatches.push({
      id: Date.now() + 1,
      user_id: newUser.id,
      name: 'Đợt bán số 1',
      status: 'active',
      created_at: new Date().toISOString()
    });

    const userInfo = { id: newUser.id, username: newUser.username };
    const token = createToken(userInfo);

    res.status(201).json({
      message: 'Đăng ký thành công',
      token,
      user: userInfo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Đăng nhập
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = (username || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanUsername || !cleanPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' });
    }

    if (isSupabaseConfigured) {
      const { data: user, error: findErr } = await supabase
        .from('users')
        .select('*')
        .ilike('username', cleanUsername)
        .eq('password', cleanPassword)
        .maybeSingle();

      if (findErr || !user) {
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
      }

      const userInfo = { id: user.id, username: user.username };
      const token = createToken(userInfo);

      return res.json({
        message: 'Đăng nhập thành công',
        token,
        user: userInfo
      });
    }

    // In-memory
    const user = memUsers.find(
      u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.password === cleanPassword
    );

    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    const userInfo = { id: user.id, username: user.username };
    const token = createToken(userInfo);

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: userInfo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kiểm tra phiên đăng nhập
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Đăng xuất
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Đăng xuất thành công' });
});

// ================= ĐỢT BÁN HÀNG (SALES BATCHES) =================

// Hàm tìm hoặc tạo batch_id hợp lệ cho người dùng (tránh lỗi foreign key constraint)
async function resolveBatchId(userId, requestedBatchId) {
  if (isSupabaseConfigured) {
    if (requestedBatchId) {
      const { data: b } = await supabase
        .from('sales_batches')
        .select('id')
        .eq('id', requestedBatchId)
        .eq('user_id', userId)
        .maybeSingle();
      if (b && b.id) return b.id;
    }

    // Nếu không khớp hoặc không gửi lên, ưu tiên đợt đang active
    let { data: activeBatch } = await supabase
      .from('sales_batches')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeBatch && activeBatch.id) return activeBatch.id;

    // Nếu không có active, lấy đợt bất kỳ của user
    let { data: anyBatch } = await supabase
      .from('sales_batches')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anyBatch && anyBatch.id) return anyBatch.id;

    // Nếu người dùng chưa có bất kỳ đợt nào, tự động tạo "Đợt bán số 1"
    const { data: newBatch, error: createErr } = await supabase
      .from('sales_batches')
      .insert([{ user_id: userId, name: 'Đợt bán số 1', status: 'active' }])
      .select()
      .single();

    if (createErr) {
      console.error('Lỗi khi tự động tạo đợt bán mặc định:', createErr.message);
      return null;
    }
    return newBatch ? newBatch.id : null;
  } else {
    // In-memory fallback
    if (requestedBatchId) {
      const b = memBatches.find(x => String(x.id) === String(requestedBatchId) && String(x.user_id) === String(userId));
      if (b) return b.id;
    }
    let b = memBatches.find(x => String(x.user_id) === String(userId) && x.status === 'active');
    if (!b) b = memBatches.find(x => String(x.user_id) === String(userId));
    if (!b) {
      const newBatch = {
        id: Date.now(),
        user_id: userId,
        name: 'Đợt bán số 1',
        status: 'active',
        created_at: new Date().toISOString()
      };
      memBatches.unshift(newBatch);
      return newBatch.id;
    }
    return b.id;
  }
}

// Lấy danh sách đợt bán hàng kèm thống kê
app.get('/api/batches', requireAuth, async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      let { data: batches, error: batchErr } = await supabase
        .from('sales_batches')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

      if (batchErr) throw batchErr;

      // Nếu tài khoản này chưa có đợt bán nào, tự động khởi tạo sẵn "Đợt bán số 1"
      if (!batches || batches.length === 0) {
        const { data: firstBatch, error: initErr } = await supabase
          .from('sales_batches')
          .insert([{ user_id: req.user.id, name: 'Đợt bán số 1', status: 'active' }])
          .select()
          .single();

        if (!initErr && firstBatch) {
          batches = [firstBatch];
        }
      }

      // Đảm bảo các mặt hàng hoặc đơn hàng cũ chưa có batch_id được gán vào đợt đầu tiên
      if (batches && batches.length > 0) {
        const defaultBatchId = batches[0].id;
        await supabase
          .from('products')
          .update({ batch_id: defaultBatchId })
          .eq('user_id', req.user.id)
          .is('batch_id', null);

        await supabase
          .from('orders')
          .update({ batch_id: defaultBatchId })
          .eq('user_id', req.user.id)
          .is('batch_id', null);
      }

      // Lấy toàn bộ đơn hàng và sản phẩm của user để tính thống kê
      const { data: orders } = await supabase
        .from('orders')
        .select('id, batch_id, status, total_amount')
        .eq('user_id', req.user.id);

      const { data: products } = await supabase
        .from('products')
        .select('id, batch_id')
        .eq('user_id', req.user.id);

      const result = (batches || []).map(b => {
        const bOrders = (orders || []).filter(o => String(o.batch_id) === String(b.id));
        const bProducts = (products || []).filter(p => String(p.batch_id) === String(b.id));
        const nonCancelled = bOrders.filter(o => o.status !== 'Đã hủy');
        const delivered = bOrders.filter(o => o.status === 'Đã giao');

        return {
          ...b,
          order_count: bOrders.length,
          product_count: bProducts.length,
          total_revenue: nonCancelled.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
          delivered_revenue: delivered.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
        };
      });

      return res.json(result);
    }

    // In-memory
    let userBatches = memBatches.filter(b => String(b.user_id) === String(req.user.id));
    if (!userBatches.length) {
      const firstBatch = {
        id: Date.now(),
        user_id: req.user.id,
        name: 'Đợt bán số 1',
        status: 'active',
        created_at: new Date().toISOString()
      };
      memBatches.unshift(firstBatch);
      userBatches = [firstBatch];
    }

    const result = userBatches.map(b => {
      const bOrders = memOrders.filter(o => String(o.batch_id) === String(b.id));
      const bProducts = memProducts.filter(p => String(p.batch_id) === String(b.id));
      const nonCancelled = bOrders.filter(o => o.status !== 'Đã hủy');
      const delivered = bOrders.filter(o => o.status === 'Đã giao');

      return {
        ...b,
        order_count: bOrders.length,
        product_count: bProducts.length,
        total_revenue: nonCancelled.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
        delivered_revenue: delivered.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tạo đợt bán hàng mới (có thể sao chép thực đơn từ đợt khác)
app.post('/api/batches', requireAuth, async (req, res) => {
  try {
    const { name, status = 'active', copy_from_batch_id } = req.body;
    const cleanName = (name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đợt bán hàng' });
    }

    if (isSupabaseConfigured) {
      const { data: newBatch, error: createErr } = await supabase
        .from('sales_batches')
        .insert([{
          user_id: req.user.id,
          name: cleanName,
          status: status === 'closed' ? 'closed' : 'active'
        }])
        .select()
        .single();

      if (createErr) throw createErr;

      let copiedCount = 0;
      if (copy_from_batch_id) {
        const { data: sourceProducts } = await supabase
          .from('products')
          .select('name, price')
          .eq('user_id', req.user.id)
          .eq('batch_id', copy_from_batch_id);

        if (sourceProducts && sourceProducts.length) {
          const newProducts = sourceProducts.map(p => ({
            user_id: req.user.id,
            batch_id: newBatch.id,
            name: p.name,
            price: p.price
          }));
          await supabase.from('products').insert(newProducts);
          copiedCount = newProducts.length;
        }
      }

      return res.status(201).json({
        ...newBatch,
        order_count: 0,
        product_count: copiedCount,
        total_revenue: 0,
        delivered_revenue: 0,
        copied_count: copiedCount
      });
    }

    // In-memory
    const newBatch = {
      id: Date.now(),
      user_id: req.user.id,
      name: cleanName,
      status: status === 'closed' ? 'closed' : 'active',
      created_at: new Date().toISOString()
    };
    memBatches.unshift(newBatch);

    let copiedCount = 0;
    if (copy_from_batch_id) {
      const sourceProducts = memProducts.filter(
        p => String(p.user_id) === String(req.user.id) && String(p.batch_id) === String(copy_from_batch_id)
      );
      sourceProducts.forEach((p, idx) => {
        memProducts.unshift({
          id: Date.now() + idx + 10,
          user_id: req.user.id,
          batch_id: newBatch.id,
          name: p.name,
          price: p.price,
          created_at: new Date().toISOString()
        });
      });
      copiedCount = sourceProducts.length;
    }

    res.status(201).json({
      ...newBatch,
      order_count: 0,
      product_count: copiedCount,
      total_revenue: 0,
      delivered_revenue: 0,
      copied_count: copiedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật đợt bán hàng (tên, trạng thái)
app.patch('/api/batches/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (status) updateData.status = status;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('sales_batches')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    }

    const batch = memBatches.find(b => String(b.id) === String(id) && String(b.user_id) === String(req.user.id));
    if (!batch) return res.status(404).json({ error: 'Không tìm thấy đợt bán hàng' });
    if (name) batch.name = name.trim();
    if (status) batch.status = status;
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sao chép thực đơn từ đợt nguồn vào đợt hiện tại
app.post('/api/batches/:id/copy-menu', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { source_batch_id } = req.body;

    if (!source_batch_id || String(id) === String(source_batch_id)) {
      return res.status(400).json({ error: 'Vui lòng chọn đợt bán nguồn hợp lệ để sao chép' });
    }

    if (isSupabaseConfigured) {
      const { data: targetBatch } = await supabase
        .from('sales_batches')
        .select('id')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();
      if (!targetBatch) return res.status(404).json({ error: 'Đợt đích không tồn tại' });

      const { data: sourceProducts } = await supabase
        .from('products')
        .select('name, price')
        .eq('user_id', req.user.id)
        .eq('batch_id', source_batch_id);

      if (!sourceProducts || !sourceProducts.length) {
        return res.status(400).json({ error: 'Đợt bán nguồn chưa có mặt hàng nào để sao chép' });
      }

      const newProducts = sourceProducts.map(p => ({
        user_id: req.user.id,
        batch_id: Number(id),
        name: p.name,
        price: p.price
      }));

      const { data: inserted, error: insErr } = await supabase
        .from('products')
        .insert(newProducts)
        .select();

      if (insErr) throw insErr;
      return res.json({ success: true, count: inserted.length });
    }

    // In-memory
    const targetBatch = memBatches.find(b => String(b.id) === String(id) && String(b.user_id) === String(req.user.id));
    if (!targetBatch) return res.status(404).json({ error: 'Đợt đích không tồn tại' });

    const sourceProducts = memProducts.filter(
      p => String(p.user_id) === String(req.user.id) && String(p.batch_id) === String(source_batch_id)
    );

    if (!sourceProducts.length) {
      return res.status(400).json({ error: 'Đợt bán nguồn chưa có mặt hàng nào để sao chép' });
    }

    sourceProducts.forEach((p, idx) => {
      memProducts.unshift({
        id: Date.now() + idx + 10,
        user_id: req.user.id,
        batch_id: Number(id),
        name: p.name,
        price: p.price,
        created_at: new Date().toISOString()
      });
    });

    res.json({ success: true, count: sourceProducts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa đợt bán hàng
app.delete('/api/batches/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('sales_batches')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);
      if (error) throw error;
      return res.json({ success: true });
    }

    memBatches = memBatches.filter(b => !(String(b.id) === String(id) && String(b.user_id) === String(req.user.id)));
    // Xóa sản phẩm và đơn hàng thuộc đợt này
    memProducts = memProducts.filter(p => !(String(p.batch_id) === String(id) && String(p.user_id) === String(req.user.id)));
    memOrders = memOrders.filter(o => !(String(o.batch_id) === String(id) && String(o.user_id) === String(req.user.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= MẶT HÀNG / THỰC ĐƠN (PRODUCTS) =================

// Lấy danh sách mặt hàng của đợt bán (hoặc tất cả)
app.get('/api/products', requireAuth, async (req, res) => {
  try {
    const { batch_id } = req.query;

    if (isSupabaseConfigured) {
      let query = supabase
        .from('products')
        .select('*')
        .eq('user_id', req.user.id);

      if (batch_id && batch_id !== 'all') {
        query = query.eq('batch_id', batch_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data || []);
    }

    let userProducts = memProducts.filter(p => String(p.user_id) === String(req.user.id));
    if (batch_id && batch_id !== 'all') {
      userProducts = userProducts.filter(p => String(p.batch_id) === String(batch_id));
    }
    res.json(userProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm mặt hàng vào thực đơn đợt bán
app.post('/api/products', requireAuth, async (req, res) => {
  try {
    const { name, price, batch_id } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Thiếu tên hoặc giá mặt hàng' });
    }

    const targetBatchId = await resolveBatchId(req.user.id, batch_id);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          user_id: req.user.id,
          batch_id: targetBatchId,
          name: name.trim(),
          price: Number(price)
        }])
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    const newProd = {
      id: Date.now(),
      user_id: req.user.id,
      batch_id: targetBatchId ? Number(targetBatchId) : null,
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
app.delete('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);
      if (error) throw error;
      return res.json({ success: true });
    }
    memProducts = memProducts.filter(p => !(String(p.id) === String(id) && String(p.user_id) === String(req.user.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ĐƠN HÀNG (ORDERS) =================

// Lấy danh sách đơn hàng (lọc theo batch_id nếu có)
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const { batch_id } = req.query;

    if (isSupabaseConfigured) {
      let query = supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', req.user.id);

      if (batch_id && batch_id !== 'all') {
        query = query.eq('batch_id', batch_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data || []);
    }

    let userOrders = memOrders.filter(o => String(o.user_id) === String(req.user.id));
    if (batch_id && batch_id !== 'all') {
      userOrders = userOrders.filter(o => String(o.batch_id) === String(batch_id));
    }
    res.json(userOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tạo đơn hàng (gắn theo batch_id)
app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const {
      batch_id,
      customer_name = '',
      customer_phone,
      shipping_address,
      shipping_fee = 0,
      status = 'Chờ xử lý',
      items = []
    } = req.body;

    if (!customer_phone || !shipping_address) {
      return res.status(400).json({ error: 'Vui lòng nhập SĐT và địa chỉ nhận hàng' });
    }
    if (!items.length) {
      return res.status(400).json({ error: 'Đơn hàng phải có ít nhất 1 mặt hàng' });
    }

    const targetBatchId = await resolveBatchId(req.user.id, batch_id);

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
          user_id: req.user.id,
          batch_id: targetBatchId,
          customer_name: (customer_name || '').trim(),
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
      user_id: req.user.id,
      batch_id: targetBatchId ? Number(targetBatchId) : null,
      customer_name: (customer_name || '').trim(),
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

// Chỉnh sửa đơn hàng chi tiết (cho phép ở bất kỳ trạng thái nào)
app.put('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_name = '',
      customer_phone,
      shipping_address,
      shipping_fee = 0,
      status,
      items = [],
      batch_id
    } = req.body;

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
      const updateData = {
        customer_name: (customer_name || '').trim(),
        customer_phone: customer_phone.trim(),
        shipping_address: shipping_address.trim(),
        shipping_fee: shipFee,
        total_amount
      };
      if (status) updateData.status = status;
      if (batch_id) {
        const targetBatchId = await resolveBatchId(req.user.id, batch_id);
        updateData.batch_id = targetBatchId;
      }

      const { data: updatedOrder, error: orderErr } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (orderErr) throw orderErr;
      if (!updatedOrder) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

      // Cập nhật lại danh sách mặt hàng
      const { error: delErr } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id);

      if (delErr) throw delErr;

      const orderItems = items.map(item => ({
        order_id: Number(id),
        product_id: item.product_id || null,
        product_name: item.product_name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1
      }));

      const { error: insertItemsErr } = await supabase.from('order_items').insert(orderItems);
      if (insertItemsErr) throw insertItemsErr;

      const { data: fullOrder, error: fetchErr } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .single();

      if (fetchErr) throw fetchErr;
      return res.json(fullOrder);
    }

    // In-memory
    const orderIndex = memOrders.findIndex(
      o => String(o.id) === String(id) && String(o.user_id) === String(req.user.id)
    );
    if (orderIndex === -1) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    const existing = memOrders[orderIndex];
    const updated = {
      ...existing,
      customer_name: (customer_name || '').trim(),
      customer_phone: customer_phone.trim(),
      shipping_address: shipping_address.trim(),
      shipping_fee: shipFee,
      status: status || existing.status,
      batch_id: batch_id ? Number(batch_id) : existing.batch_id,
      total_amount,
      order_items: items.map((it, idx) => ({
        id: it.id || (Date.now() + idx),
        order_id: Number(id),
        product_name: it.product_name,
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1
      }))
    };
    memOrders[orderIndex] = updated;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật trạng thái đơn hàng
app.patch('/api/orders/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Thiếu trạng thái' });

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select('*, order_items(*)')
        .single();
      if (error) throw error;
      return res.json(data);
    }

    const order = memOrders.find(o => String(o.id) === String(id) && String(o.user_id) === String(req.user.id));
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    order.status = status;
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa đơn hàng
app.delete('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);
      if (error) throw error;
      return res.json({ success: true });
    }
    memOrders = memOrders.filter(o => !(String(o.id) === String(id) && String(o.user_id) === String(req.user.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server chạy tại: http://localhost:${PORT}`);
  console.log(`Chế độ lưu trữ: ${isSupabaseConfigured ? 'Supabase (' + supabaseUrl + ')' : 'Bộ nhớ tạm (Chưa cấu hình .env)'}`);
  console.log(`Hệ thống đợt bán hàng (Sales Batches) đã sẵn sàng!`);
});
