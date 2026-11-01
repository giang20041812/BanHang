let products = [];
let orders = [];
let pendingOrderItems = [];

const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} ₫`;

// Tab switching
function switchTab(tab) {
  const ordersTab = document.getElementById('tab-orders');
  const productsTab = document.getElementById('tab-products');
  const ordersBtn = document.getElementById('tab-orders-btn');
  const productsBtn = document.getElementById('tab-products-btn');

  if (tab === 'orders') {
    ordersTab.classList.remove('hidden');
    productsTab.classList.add('hidden');
    ordersBtn.className = 'px-4 py-1.5 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm';
    productsBtn.className = 'px-4 py-1.5 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900';
    loadOrders();
  } else {
    ordersTab.classList.add('hidden');
    productsTab.classList.remove('hidden');
    productsBtn.className = 'px-4 py-1.5 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm';
    ordersBtn.className = 'px-4 py-1.5 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900';
    loadProducts();
  }
}

// Kiểm tra kết nối Supabase
async function checkStatus() {
  const badge = document.getElementById('db-status-badge');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.connected) {
      badge.textContent = 'Supabase Connected';
      badge.className = 'text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800';
    } else {
      badge.textContent = 'Bộ nhớ tạm (Chưa nối Supabase)';
      badge.className = 'text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800';
    }
  } catch (e) {
    badge.textContent = 'Lỗi kết nối Server';
    badge.className = 'text-xs px-2.5 py-0.5 rounded-full font-medium bg-rose-100 text-rose-800';
  }
}

// ================= MẶT HÀNG =================
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    products = await res.json();
    renderProducts();
    updateModalProductSelect();
  } catch (err) {
    console.error('Lỗi tải mặt hàng:', err);
  }
}

function renderProducts() {
  const tbody = document.getElementById('products-tbody');
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-400">Chưa có mặt hàng nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr class="hover:bg-gray-50 transition">
      <td class="p-3 text-gray-500 font-mono text-xs">#${p.id}</td>
      <td class="p-3 font-medium text-gray-900">${escapeHtml(p.name)}</td>
      <td class="p-3 text-right font-medium text-emerald-600">${formatCurrency(p.price)}</td>
      <td class="p-3 text-center">
        <button onclick="handleDeleteProduct(${p.id})" class="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-50">
          Xóa
        </button>
      </td>
    </tr>
  `).join('');
}

async function handleCreateProduct(e) {
  e.preventDefault();
  const nameInput = document.getElementById('prod-name');
  const priceInput = document.getElementById('prod-price');

  const name = nameInput.value.trim();
  const price = Number(priceInput.value);

  if (!name || isNaN(price)) return;

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể thêm mặt hàng');
    }
    nameInput.value = '';
    priceInput.value = '';
    await loadProducts();
  } catch (err) {
    alert(err.message);
  }
}

async function handleDeleteProduct(id) {
  if (!confirm('Xác nhận xóa mặt hàng này?')) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể xóa mặt hàng');
    }
    await loadProducts();
  } catch (err) {
    alert(err.message);
  }
}

// ================= ĐƠN HÀNG =================
async function loadOrders() {
  try {
    const res = await fetch('/api/orders');
    orders = await res.json();
    renderOrders();
  } catch (err) {
    console.error('Lỗi tải đơn hàng:', err);
  }
}

function updateOrderStats() {
  const totalRevEl = document.getElementById('stat-total-revenue');
  const deliveredRevEl = document.getElementById('stat-delivered-revenue');
  const totalOrdersEl = document.getElementById('stat-total-orders');

  if (!totalRevEl || !deliveredRevEl || !totalOrdersEl) return;

  // Tổng doanh thu tất cả đơn không tính đơn đã hủy
  const nonCancelledOrders = orders.filter(o => o.status !== 'Đã hủy');
  const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // Doanh thu đơn đã giao thành công
  const deliveredOrders = orders.filter(o => o.status === 'Đã giao');
  const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  totalRevEl.textContent = formatCurrency(totalRevenue);
  deliveredRevEl.textContent = formatCurrency(deliveredRevenue);
  totalOrdersEl.textContent = `${orders.length} đơn (${deliveredOrders.length} đã giao)`;
}

function renderOrders() {
  updateOrderStats();
  const tbody = document.getElementById('orders-tbody');
  const filter = document.getElementById('filter-status').value;

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter);

  if (!filteredOrders.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-gray-400">Không có đơn hàng nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredOrders.map(o => {
    const items = o.order_items || [];
    const itemsText = items.map(it => 
      `<div class="text-xs text-gray-700">${escapeHtml(it.product_name)} <span class="text-gray-400">x${it.quantity}</span> <span class="text-gray-500 font-mono">(${formatCurrency(it.price * it.quantity)})</span></div>`
    ).join('') || '<span class="text-xs text-gray-400 italic">Không có mặt hàng</span>';

    return `
      <tr class="hover:bg-gray-50 transition border-b border-gray-100">
        <td class="p-3 font-mono text-xs text-gray-500 font-semibold">#${o.id}</td>
        <td class="p-3 font-medium text-gray-900 text-sm whitespace-nowrap">${escapeHtml(o.customer_phone)}</td>
        <td class="p-3 text-xs text-gray-600 max-w-xs break-words">${escapeHtml(o.shipping_address)}</td>
        <td class="p-3">${itemsText}</td>
        <td class="p-3 text-right text-xs text-gray-600 whitespace-nowrap font-medium">${formatCurrency(o.shipping_fee || 0)}</td>
        <td class="p-3 text-right font-bold text-sm text-blue-600 whitespace-nowrap">${formatCurrency(o.total_amount)}</td>
        <td class="p-3 whitespace-nowrap">
          <select onchange="handleUpdateStatus(${o.id}, this.value)" class="text-xs font-medium rounded px-2 py-1 border ${getStatusBadgeClass(o.status)}">
            <option value="Chờ xử lý" ${o.status === 'Chờ xử lý' ? 'selected' : ''}>Chờ xử lý</option>
            <option value="Đang giao" ${o.status === 'Đang giao' ? 'selected' : ''}>Đang giao</option>
            <option value="Đã giao" ${o.status === 'Đã giao' ? 'selected' : ''}>Đã giao</option>
            <option value="Đã hủy" ${o.status === 'Đã hủy' ? 'selected' : ''}>Đã hủy</option>
          </select>
        </td>
        <td class="p-3 text-center whitespace-nowrap">
          <button onclick="handleDeleteOrder(${o.id})" class="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-50">
            Xóa
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Chờ xử lý': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Đang giao': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Đã giao': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Đã hủy': return 'bg-gray-100 text-gray-500 border-gray-300';
    default: return 'bg-white text-gray-700 border-gray-300';
  }
}

async function handleUpdateStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error('Không thể cập nhật trạng thái');
    const updated = await res.json();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) orders[idx] = updated;
    renderOrders();
  } catch (err) {
    alert(err.message);
  }
}

async function handleDeleteOrder(id) {
  if (!confirm('Xác nhận xóa đơn hàng này?')) return;
  try {
    const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa đơn hàng');
    await loadOrders();
  } catch (err) {
    alert(err.message);
  }
}

// ================= MODAL TẠO ĐƠN =================
function updateModalProductSelect() {
  const select = document.getElementById('modal-product-select');
  if (!products.length) {
    select.innerHTML = '<option value="">-- Chưa có mặt hàng nào --</option>';
    return;
  }
  select.innerHTML = products.map(p => 
    `<option value="${p.id}" data-name="${escapeHtml(p.name)}" data-price="${p.price}">
      ${escapeHtml(p.name)} - ${formatCurrency(p.price)}
    </option>`
  ).join('');
}

function openOrderModal() {
  pendingOrderItems = [];
  document.getElementById('order-form').reset();
  renderPendingItems();
  updateModalProductSelect();
  document.getElementById('order-modal').classList.remove('hidden');
}

function closeOrderModal() {
  document.getElementById('order-modal').classList.add('hidden');
}

function addItemToOrder() {
  const select = document.getElementById('modal-product-select');
  const qtyInput = document.getElementById('modal-product-qty');
  const selectedOption = select.options[select.selectedIndex];

  if (!selectedOption || !selectedOption.value) {
    alert('Vui lòng tạo mặt hàng trước khi thêm vào đơn');
    return;
  }

  const productId = Number(selectedOption.value);
  const name = selectedOption.getAttribute('data-name');
  const price = Number(selectedOption.getAttribute('data-price'));
  const qty = parseInt(qtyInput.value) || 1;

  const existing = pendingOrderItems.find(i => i.product_id === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    pendingOrderItems.push({
      product_id: productId,
      product_name: name,
      price: price,
      quantity: qty
    });
  }

  qtyInput.value = 1;
  renderPendingItems();
}

function removeItemFromOrder(idx) {
  pendingOrderItems.splice(idx, 1);
  renderPendingItems();
}

function renderPendingItems() {
  const list = document.getElementById('modal-items-list');
  const totalDisplay = document.getElementById('modal-total-display');
  const shipFeeInput = document.getElementById('order-shipping-fee');
  const shipFee = Number(shipFeeInput ? shipFeeInput.value : 0) || 0;

  let itemsSubtotal = 0;
  if (!pendingOrderItems.length) {
    list.innerHTML = '<p class="text-xs text-gray-400 italic">Chưa chọn mặt hàng nào</p>';
  } else {
    list.innerHTML = pendingOrderItems.map((item, idx) => {
      const subtotal = item.price * item.quantity;
      itemsSubtotal += subtotal;
      return `
        <div class="flex items-center justify-between text-xs bg-white p-2 rounded border border-gray-200">
          <div>
            <span class="font-medium text-gray-800">${escapeHtml(item.product_name)}</span>
            <span class="text-gray-400"> x${item.quantity}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-gray-700">${formatCurrency(subtotal)}</span>
            <button type="button" onclick="removeItemFromOrder(${idx})" class="text-rose-500 hover:text-rose-700 font-bold">&times;</button>
          </div>
        </div>
      `;
    }).join('');
  }

  const grandTotal = itemsSubtotal + shipFee;
  totalDisplay.textContent = formatCurrency(grandTotal);
}

async function handleCreateOrder(e) {
  e.preventDefault();
  if (!pendingOrderItems.length) {
    alert('Vui lòng thêm ít nhất 1 mặt hàng vào đơn');
    return;
  }

  const phone = document.getElementById('order-phone').value.trim();
  const address = document.getElementById('order-address').value.trim();
  const shipFeeInput = document.getElementById('order-shipping-fee');
  const shippingFee = Number(shipFeeInput ? shipFeeInput.value : 0) || 0;
  const status = document.getElementById('order-status').value;

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_phone: phone,
        shipping_address: address,
        shipping_fee: shippingFee,
        status: status,
        items: pendingOrderItems
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi tạo đơn');
    }

    closeOrderModal();
    await loadOrders();
  } catch (err) {
    alert(err.message);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Khởi chạy khi load trang
document.addEventListener('DOMContentLoaded', () => {
  checkStatus();
  loadProducts();
  loadOrders();
});

