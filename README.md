# Quản lý đơn hàng & mặt hàng (Node.js + Supabase)

### 1. Cài đặt Supabase
1. Vào Supabase Dashboard -> **SQL Editor** -> dán nội dung file `schema.sql` và bấm **Run**.
2. Vào **Project Settings** -> **API**, copy `Project URL` và `anon key` (hoặc `service_role key`).
3. Điền vào file `.env`:
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJh...
PORT=3000
```

### 2. Chạy ứng dụng
```bash
npm start
```
Mở trình duyệt: `http://localhost:3000`

