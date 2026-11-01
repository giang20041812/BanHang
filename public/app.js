let products = [];
let orders = [];
let pendingOrderItems = [];

const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} ₫`;

// Tab switching
function switchTab(tab) {
  const ordersTab = document.getElementById('tab-orders');
  const revenueTab = document.getElementById('tab-revenue');
  const productsTab = document.getElementById('tab-products');
  const ordersBtn = document.getElementById('tab-orders-btn');
  const revenueBtn = document.getElementById('tab-revenue-btn');
  const productsBtn = document.getElementById('tab-products-btn');

  const tabs = [ordersTab, revenueTab, productsTab];
  const btns = [ordersBtn, revenueBtn, productsBtn];

  tabs.forEach(t => t?.classList.add('hidden'));
  btns.forEach(b => {
    if (b) b.className = 'px-4 py-1.5 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900';
  });

  if (tab === 'orders') {
    ordersTab?.classList.remove('hidden');
    ordersBtn.className = 'px-4 py-1.5 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm';
    loadOrders();
  } else if (tab === 'revenue') {
    revenueTab?.classList.remove('hidden');
    revenueBtn.className = 'px-4 py-1.5 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm';
    renderDailyRevenue();
  } else {
    productsTab?.classList.remove('hidden');
    productsBtn.className = 'px-4 py-1.5 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm';
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

// ================= QUẢN LÝ CHẾ ĐỘ XEM ĐƠN (BẢNG / KANBAN) =================
let orderViewMode = localStorage.getItem('order_view_mode') || 'table';

function setOrderViewMode(mode) {
  orderViewMode = mode;
  localStorage.setItem('order_view_mode', mode);

  const tableContainer = document.getElementById('orders-table-container');
  const kanbanContainer = document.getElementById('orders-kanban-container');
  const btnTable = document.getElementById('view-mode-table');
  const btnKanban = document.getElementById('view-mode-kanban');

  if (mode === 'kanban') {
    tableContainer?.classList.add('hidden');
    kanbanContainer?.classList.remove('hidden');
    if (btnTable && btnKanban) {
      btnTable.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-gray-600 hover:text-gray-900 transition';
      btnKanban.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-gray-900 shadow-sm transition';
    }
    renderKanban();
  } else {
    kanbanContainer?.classList.add('hidden');
    tableContainer?.classList.remove('hidden');
    if (btnTable && btnKanban) {
      btnKanban.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-gray-600 hover:text-gray-900 transition';
      btnTable.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-gray-900 shadow-sm transition';
    }
  }
}

// Cấu hình các cột Kanban
const KANBAN_COLUMNS = [
  {
    status: 'Chờ xử lý',
    title: 'Chờ xử lý',
    icon: '⏳',
    badgeClass: 'bg-amber-100 text-amber-800',
    dotColor: 'bg-amber-400',
    topBorder: 'border-t-4 border-amber-400'
  },
  {
    status: 'Đang giao',
    title: 'Đang giao',
    icon: '🚚',
    badgeClass: 'bg-blue-100 text-blue-800',
    dotColor: 'bg-blue-500',
    topBorder: 'border-t-4 border-blue-500'
  },
  {
    status: 'Đã giao',
    title: 'Đã giao',
    icon: '✅',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    dotColor: 'bg-emerald-500',
    topBorder: 'border-t-4 border-emerald-500'
  },
  {
    status: 'Đã hủy',
    title: 'Đã hủy',
    icon: '❌',
    badgeClass: 'bg-rose-100 text-rose-800',
    dotColor: 'bg-rose-400',
    topBorder: 'border-t-4 border-rose-400'
  }
];

let draggedOrderId = null;

function renderKanban() {
  const container = document.getElementById('kanban-board');
  if (!container) return;

  const filter = document.getElementById('filter-status')?.value || 'all';

  container.innerHTML = KANBAN_COLUMNS.map(col => {
    let colOrders = orders.filter(o => o.status === col.status);
    if (filter !== 'all' && filter !== col.status) {
      colOrders = [];
    }

    const colTotal = colOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const cardsHtml = colOrders.length > 0
      ? colOrders.map(o => {
          const items = o.order_items || [];
          const date = o.created_at ? new Date(o.created_at) : null;
          const timeText = date && !isNaN(date.getTime())
            ? `${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
            : '';

          return `
            <div draggable="true"
                 ondragstart="handleKanbanDragStart(event, ${o.id})"
                 ondragend="handleKanbanDragEnd(event)"
                 class="kanban-card bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing space-y-2.5">
              
              <div class="flex items-center justify-between text-xs">
                <span class="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">#${o.id}</span>
                <div class="flex items-center gap-1.5">
                  <span class="text-gray-400 text-[11px]">${timeText}</span>
                  <button type="button" onclick="handleDeleteOrder(${o.id})" title="Xóa đơn" class="text-gray-300 hover:text-rose-500 font-bold px-1 transition">&times;</button>
                </div>
              </div>

              <div>
                <div class="text-sm font-semibold text-gray-900 flex items-center gap-1">
                  <span class="text-xs">📞</span> ${escapeHtml(o.customer_phone)}
                </div>
                <div class="text-xs text-gray-500 line-clamp-2 mt-0.5" title="${escapeHtml(o.shipping_address)}">
                  📍 ${escapeHtml(o.shipping_address)}
                </div>
              </div>

              <div class="bg-gray-50 rounded p-2 text-xs text-gray-600 space-y-1 border border-gray-100">
                ${items.map(it => `
                  <div class="flex justify-between">
                    <span class="truncate max-w-[150px] font-medium text-gray-700">${escapeHtml(it.product_name)} <span class="text-gray-400 font-normal">x${it.quantity}</span></span>
                    <span class="font-mono text-gray-500">${formatCurrency((it.price || 0) * (it.quantity || 1))}</span>
                  </div>
                `).join('')}
                ${o.shipping_fee ? `
                  <div class="flex justify-between border-t border-gray-200/60 pt-1 text-gray-400 text-[11px]">
                    <span>Tiền ship:</span>
                    <span class="font-mono">${formatCurrency(o.shipping_fee)}</span>
                  </div>
                ` : ''}
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-gray-100">
                <div class="text-sm font-bold text-blue-600">
                  ${formatCurrency(o.total_amount)}
                </div>
                <select onchange="handleUpdateStatus(${o.id}, this.value)" class="text-xs font-medium border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50 hover:bg-white focus:outline-none">
                  <option value="Chờ xử lý" ${o.status === 'Chờ xử lý' ? 'selected' : ''}>Chờ xử lý</option>
                  <option value="Đang giao" ${o.status === 'Đang giao' ? 'selected' : ''}>Đang giao</option>
                  <option value="Đã giao" ${o.status === 'Đã giao' ? 'selected' : ''}>Đã giao</option>
                  <option value="Đã hủy" ${o.status === 'Đã hủy' ? 'selected' : ''}>Đã hủy</option>
                </select>
              </div>
            </div>
          `;
        }).join('')
      : `<div class="h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-xs text-gray-400 gap-1 select-none">
           <span>Kéo thả đơn vào đây</span>
         </div>`;

    return `
      <div class="flex flex-col bg-gray-100/90 rounded-xl p-3 border border-gray-200 shadow-sm ${col.topBorder} min-h-[520px]">
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-gray-200">
          <div class="flex items-center gap-1.5">
            <span class="text-sm">${col.icon}</span>
            <h3 class="font-bold text-sm text-gray-800">${col.title}</h3>
            <span class="text-xs px-2 py-0.5 rounded-full font-bold ${col.badgeClass}">${colOrders.length}</span>
          </div>
          <span class="text-xs font-semibold text-gray-500 font-mono">${formatCurrency(colTotal)}</span>
        </div>

        <div class="kanban-dropzone flex-1 space-y-2.5 p-1 rounded-lg transition-colors min-h-[420px]"
             ondragover="handleKanbanDragOver(event)"
             ondragleave="handleKanbanDragLeave(event)"
             ondrop="handleKanbanDrop(event, '${col.status}')">
          ${cardsHtml}
        </div>
      </div>
    `;
  }).join('');
}

function handleKanbanDragStart(e, orderId) {
  draggedOrderId = orderId;
  e.dataTransfer.setData('text/plain', String(orderId));
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('opacity-40');
}

function handleKanbanDragEnd(e) {
  e.currentTarget.classList.remove('opacity-40');
  document.querySelectorAll('.kanban-dropzone').forEach(el => {
    el.classList.remove('bg-blue-100/60', 'ring-2', 'ring-blue-400');
  });
}

function handleKanbanDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const dropzone = e.currentTarget.closest('.kanban-dropzone') || e.currentTarget;
  dropzone.classList.add('bg-blue-100/60', 'ring-2', 'ring-blue-400');
}

function handleKanbanDragLeave(e) {
  const dropzone = e.currentTarget.closest('.kanban-dropzone') || e.currentTarget;
  dropzone.classList.remove('bg-blue-100/60', 'ring-2', 'ring-blue-400');
}

async function handleKanbanDrop(e, targetStatus) {
  e.preventDefault();
  document.querySelectorAll('.kanban-dropzone').forEach(el => {
    el.classList.remove('bg-blue-100/60', 'ring-2', 'ring-blue-400');
  });

  const orderId = Number(e.dataTransfer.getData('text/plain') || draggedOrderId);
  if (!orderId) return;

  const order = orders.find(o => o.id === orderId);
  if (order && order.status !== targetStatus) {
    await handleUpdateStatus(orderId, targetStatus);
  }
}

function renderOrders() {
  updateOrderStats();
  renderDailyRevenue();
  renderKanban();
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

// ================= DOANH THU THEO NGÀY =================
function renderDailyRevenue() {
  const tbody = document.getElementById('daily-revenue-tbody');
  const tfoot = document.getElementById('daily-revenue-tfoot');
  if (!tbody) return;

  const filterMode = document.getElementById('revenue-status-filter')?.value || 'delivered_only';

  // Lọc đơn theo điều kiện
  let targetOrders = orders;
  if (filterMode === 'delivered_only') {
    targetOrders = orders.filter(o => o.status === 'Đã giao');
  } else if (filterMode === 'exclude_cancelled') {
    targetOrders = orders.filter(o => o.status !== 'Đã hủy');
  }

  // Nhóm theo ngày (YYYY-MM-DD hoặc DD/MM/YYYY)
  const dailyGroups = {};

  targetOrders.forEach(o => {
    let dateStr = 'Không rõ ngày';
    if (o.created_at) {
      const d = new Date(o.created_at);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    }

    if (!dailyGroups[dateStr]) {
      dailyGroups[dateStr] = {
        date: dateStr,
        orderCount: 0,
        itemsAmount: 0,
        shippingFee: 0,
        totalRevenue: 0
      };
    }

    const ship = Number(o.shipping_fee || 0);
    const total = Number(o.total_amount || 0);
    const items = total - ship;

    dailyGroups[dateStr].orderCount += 1;
    dailyGroups[dateStr].shippingFee += ship;
    dailyGroups[dateStr].itemsAmount += (items > 0 ? items : 0);
    dailyGroups[dateStr].totalRevenue += total;
  });

  const dates = Object.keys(dailyGroups);

  if (!dates.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-400">Chưa có dữ liệu doanh thu phù hợp.</td></tr>`;
    if (tfoot) tfoot.innerHTML = '';
    return;
  }

  // Sắp xếp ngày giảm dần
  dates.sort((a, b) => {
    const parse = (s) => {
      const parts = s.split('/');
      return parts.length === 3 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() : 0;
    };
    return parse(b) - parse(a);
  });

  let grandOrders = 0;
  let grandItems = 0;
  let grandShip = 0;
  let grandTotal = 0;

  tbody.innerHTML = dates.map(dStr => {
    const g = dailyGroups[dStr];
    grandOrders += g.orderCount;
    grandItems += g.itemsAmount;
    grandShip += g.shippingFee;
    grandTotal += g.totalRevenue;

    return `
      <tr class="hover:bg-gray-50 transition border-b border-gray-100">
        <td class="p-3 font-medium text-gray-900 text-sm whitespace-nowrap">📅 ${dStr}</td>
        <td class="p-3 text-center text-sm font-semibold text-gray-700">${g.orderCount} đơn</td>
        <td class="p-3 text-right text-sm text-gray-600 font-mono">${formatCurrency(g.itemsAmount)}</td>
        <td class="p-3 text-right text-sm text-gray-600 font-mono">${formatCurrency(g.shippingFee)}</td>
        <td class="p-3 text-right text-sm font-bold text-emerald-600 whitespace-nowrap">${formatCurrency(g.totalRevenue)}</td>
      </tr>
    `;
  }).join('');

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td class="p-3 text-gray-900 font-bold uppercase text-xs">Tổng cộng</td>
        <td class="p-3 text-center font-bold text-gray-900">${grandOrders} đơn</td>
        <td class="p-3 text-right font-bold text-gray-900 font-mono">${formatCurrency(grandItems)}</td>
        <td class="p-3 text-right font-bold text-gray-900 font-mono">${formatCurrency(grandShip)}</td>
        <td class="p-3 text-right font-bold text-emerald-700 text-base font-mono">${formatCurrency(grandTotal)}</td>
      </tr>
    `;
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
  setOrderViewMode(orderViewMode);
  checkStatus();
  loadProducts();
  loadOrders();
});

