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
    if (b) b.className = 'flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all duration-200 whitespace-nowrap';
  });

  if (tab === 'orders') {
    ordersTab?.classList.remove('hidden');
    if (ordersBtn) ordersBtn.className = 'flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-white text-indigo-700 shadow-sm transition-all duration-200 whitespace-nowrap';
    loadOrders();
  } else if (tab === 'revenue') {
    revenueTab?.classList.remove('hidden');
    if (revenueBtn) revenueBtn.className = 'flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-white text-indigo-700 shadow-sm transition-all duration-200 whitespace-nowrap';
    renderDailyRevenue();
  } else {
    productsTab?.classList.remove('hidden');
    if (productsBtn) productsBtn.className = 'flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-white text-indigo-700 shadow-sm transition-all duration-200 whitespace-nowrap';
    loadProducts();
  }
}

// Kiểm tra kết nối Supabase
async function checkStatus() {
  const badge = document.getElementById('db-status-badge');
  if (!badge) return;
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.connected) {
      badge.innerHTML = '<span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> <span class="font-bold text-emerald-800">Supabase Connected</span>';
      badge.className = 'inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm transition';
    } else {
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> <span class="font-semibold text-amber-800">Bộ nhớ tạm (Chưa nối)</span>';
      badge.className = 'inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-sm transition';
    }
  } catch (e) {
    badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> <span class="font-semibold text-rose-800">Lỗi kết nối Server</span>';
    badge.className = 'inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-800 border border-rose-200 shadow-sm transition';
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
  if (!tbody) return;
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-400">Chưa có mặt hàng nào. Vui lòng thêm ở trên.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr class="hover:bg-emerald-50/30 transition-colors border-b border-slate-100">
      <td class="p-3.5 text-slate-500 font-mono text-xs font-bold">#${p.id}</td>
      <td class="p-3.5 font-bold text-slate-900 text-sm">${escapeHtml(p.name)}</td>
      <td class="p-3.5 text-right font-extrabold font-mono text-emerald-600 text-sm">${formatCurrency(p.price)}</td>
      <td class="p-3.5 text-center">
        <button onclick="handleDeleteProduct(${p.id})" class="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition active:scale-95 cursor-pointer">
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

  const nonCancelledOrders = orders.filter(o => o.status !== 'Đã hủy');
  const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

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
      btnTable.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all duration-200';
      btnKanban.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-indigo-700 shadow-sm transition-all duration-200';
    }
    renderKanban();
  } else {
    kanbanContainer?.classList.add('hidden');
    tableContainer?.classList.remove('hidden');
    if (btnTable && btnKanban) {
      btnKanban.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all duration-200';
      btnTable.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-indigo-700 shadow-sm transition-all duration-200';
    }
  }
}

// Cấu hình các cột Kanban
const KANBAN_COLUMNS = [
  {
    status: 'Chờ xử lý',
    title: 'Chờ xử lý',
    shortTitle: 'Chờ',
    icon: '⏳',
    badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300/80',
    dotColor: 'bg-amber-400',
    topBorder: 'border-t-2 sm:border-t-4 border-amber-400'
  },
  {
    status: 'Đang giao',
    title: 'Đang giao',
    shortTitle: 'Giao',
    icon: '🚚',
    badgeClass: 'bg-sky-100 text-sky-900 border border-sky-300/80',
    dotColor: 'bg-sky-500',
    topBorder: 'border-t-2 sm:border-t-4 border-sky-500'
  },
  {
    status: 'Đã giao',
    title: 'Đã giao',
    shortTitle: 'Xong',
    icon: '✅',
    badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300/80',
    dotColor: 'bg-emerald-500',
    topBorder: 'border-t-2 sm:border-t-4 border-emerald-500'
  },
  {
    status: 'Đã hủy',
    title: 'Đã hủy',
    shortTitle: 'Hủy',
    icon: '❌',
    badgeClass: 'bg-rose-100 text-rose-900 border border-rose-300/80',
    dotColor: 'bg-rose-400',
    topBorder: 'border-t-2 sm:border-t-4 border-rose-400'
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
                 class="kanban-card group bg-white p-1.5 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing space-y-1 sm:space-y-2.5 min-w-0 overflow-hidden">
              
              <div class="flex items-center justify-between text-xs">
                <span class="font-mono font-bold text-slate-700 bg-slate-100 text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-md border border-slate-200">#${o.id}</span>
                <div class="flex items-center gap-1">
                  <span class="text-slate-400 text-[10px] font-medium hidden sm:inline">${timeText}</span>
                  <button type="button" onclick="handleDeleteOrder(${o.id})" title="Xóa đơn" class="text-slate-300 hover:text-rose-500 font-bold p-0.5 hover:bg-rose-50 rounded transition cursor-pointer text-xs">&times;</button>
                </div>
              </div>

              <div>
                <div class="text-[10px] sm:text-sm font-bold text-slate-900 flex items-center gap-1 truncate">
                  <span class="text-[10px] text-blue-500 shrink-0">📞</span> <span class="truncate">${escapeHtml(o.customer_phone)}</span>
                </div>
                <div class="text-[9px] sm:text-xs text-slate-500 truncate mt-0.5" title="${escapeHtml(o.shipping_address)}">
                  📍${escapeHtml(o.shipping_address)}
                </div>
              </div>

              <!-- Chi tiết mặt hàng (thu nhỏ trên mobile) -->
              <div class="hidden sm:block bg-slate-50/80 rounded-xl p-2.5 text-xs text-slate-600 space-y-1.5 border border-slate-100">
                ${items.map(it => `
                  <div class="flex justify-between items-center text-xs">
                    <span class="truncate max-w-[150px] font-semibold text-slate-800">${escapeHtml(it.product_name)} <span class="text-slate-400 font-normal">x${it.quantity}</span></span>
                    <span class="font-mono text-slate-500 font-medium">${formatCurrency((it.price || 0) * (it.quantity || 1))}</span>
                  </div>
                `).join('')}
                ${o.shipping_fee ? `
                  <div class="flex justify-between border-t border-slate-200/70 pt-1.5 text-slate-400 text-[11px]">
                    <span>Tiền ship:</span>
                    <span class="font-mono font-medium">${formatCurrency(o.shipping_fee)}</span>
                  </div>
                ` : ''}
              </div>
              <div class="sm:hidden bg-slate-50 rounded p-1 text-[9px] text-slate-600 font-medium truncate border border-slate-100" title="${escapeHtml(items.map(i=>`${i.product_name} x${i.quantity}`).join(', '))}">
                📦 ${items.length} món
              </div>

              <div class="pt-1 sm:pt-2 border-t border-slate-100 space-y-1">
                <div>
                  <span class="text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold hidden sm:block leading-none">Tổng cộng</span>
                  <span class="text-[10px] sm:text-sm font-extrabold text-indigo-600 font-mono truncate block">${formatCurrency(o.total_amount)}</span>
                </div>
                <select onchange="handleUpdateStatus(${o.id}, this.value)" class="w-full text-[9px] sm:text-xs font-semibold rounded px-1 py-0.5 bg-slate-50 hover:bg-white border border-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20 cursor-pointer">
                  <option value="Chờ xử lý" ${o.status === 'Chờ xử lý' ? 'selected' : ''}>⏳ Chờ</option>
                  <option value="Đang giao" ${o.status === 'Đang giao' ? 'selected' : ''}>🚚 Giao</option>
                  <option value="Đã giao" ${o.status === 'Đã giao' ? 'selected' : ''}>✅ Xong</option>
                  <option value="Đã hủy" ${o.status === 'Đã hủy' ? 'selected' : ''}>❌ Hủy</option>
                </select>
              </div>
            </div>
          `;
        }).join('')
      : `<div class="h-16 sm:h-32 border-2 border-dashed border-slate-200 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-[9px] sm:text-xs text-slate-400 gap-0.5 select-none text-center p-1">
           <span>Thả đơn</span>
         </div>`;

    return `
      <div class="flex flex-col bg-slate-100/80 rounded-xl sm:rounded-2xl p-1 sm:p-3.5 border border-slate-200/90 shadow-sm ${col.topBorder} min-w-0 w-full min-h-[380px] sm:min-h-[520px]">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-1 pb-1 sm:pb-2.5 mb-1.5 sm:mb-2.5 border-b border-slate-200">
          <div class="flex items-center gap-1 min-w-0">
            <span class="text-xs sm:text-base shrink-0">${col.icon}</span>
            <h3 class="font-extrabold text-[10px] sm:text-sm text-slate-800 truncate">
              <span class="sm:hidden">${col.shortTitle}</span>
              <span class="hidden sm:inline">${col.title}</span>
            </h3>
            <span class="text-[9px] sm:text-xs px-1 sm:px-2 py-0.2 rounded-full font-extrabold ${col.badgeClass} shrink-0">${colOrders.length}</span>
          </div>
          <span class="text-[9px] sm:text-xs font-bold text-slate-500 font-mono truncate text-left sm:text-right">${formatCurrency(colTotal)}</span>
        </div>

        <div class="kanban-dropzone flex-1 space-y-1.5 sm:space-y-3 p-0.5 sm:p-1 rounded-lg sm:rounded-xl transition-colors min-h-[320px] sm:min-h-[420px]"
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
    el.classList.remove('bg-indigo-100/60', 'ring-2', 'ring-indigo-400');
  });
}

function handleKanbanDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const dropzone = e.currentTarget.closest('.kanban-dropzone') || e.currentTarget;
  dropzone.classList.add('bg-indigo-100/60', 'ring-2', 'ring-indigo-400');
}

function handleKanbanDragLeave(e) {
  const dropzone = e.currentTarget.closest('.kanban-dropzone') || e.currentTarget;
  dropzone.classList.remove('bg-indigo-100/60', 'ring-2', 'ring-indigo-400');
}

async function handleKanbanDrop(e, targetStatus) {
  e.preventDefault();
  document.querySelectorAll('.kanban-dropzone').forEach(el => {
    el.classList.remove('bg-indigo-100/60', 'ring-2', 'ring-indigo-400');
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
  if (!tbody) return;

  const filter = document.getElementById('filter-status')?.value || 'all';

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter);

  if (!filteredOrders.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400">Không có đơn hàng nào phù hợp với bộ lọc.</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredOrders.map(o => {
    const items = o.order_items || [];
    const itemsText = items.map(it => 
      `<div class="text-xs text-slate-700 font-medium py-0.5">${escapeHtml(it.product_name)} <span class="text-slate-400 font-normal">x${it.quantity}</span> <span class="text-slate-500 font-mono text-[11px]">(${formatCurrency((it.price || 0) * (it.quantity || 1))})</span></div>`
    ).join('') || '<span class="text-xs text-slate-400 italic">Không có mặt hàng</span>';

    return `
      <tr class="hover:bg-indigo-50/40 transition-colors border-b border-slate-100">
        <td class="p-3.5 whitespace-nowrap">
          <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">#${o.id}</span>
        </td>
        <td class="p-3.5 font-bold text-slate-900 text-sm whitespace-nowrap">${escapeHtml(o.customer_phone)}</td>
        <td class="p-3.5 text-xs text-slate-600 max-w-xs break-words">${escapeHtml(o.shipping_address)}</td>
        <td class="p-3.5">${itemsText}</td>
        <td class="p-3.5 text-right text-xs text-slate-500 font-mono font-medium whitespace-nowrap">${formatCurrency(o.shipping_fee || 0)}</td>
        <td class="p-3.5 text-right font-extrabold text-sm text-indigo-600 font-mono whitespace-nowrap">${formatCurrency(o.total_amount)}</td>
        <td class="p-3.5 text-center whitespace-nowrap">
          <select onchange="handleUpdateStatus(${o.id}, this.value)" class="text-xs rounded-xl px-2.5 py-1.5 border shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${getStatusBadgeClass(o.status)}">
            <option value="Chờ xử lý" ${o.status === 'Chờ xử lý' ? 'selected' : ''}>Chờ xử lý</option>
            <option value="Đang giao" ${o.status === 'Đang giao' ? 'selected' : ''}>Đang giao</option>
            <option value="Đã giao" ${o.status === 'Đã giao' ? 'selected' : ''}>Đã giao</option>
            <option value="Đã hủy" ${o.status === 'Đã hủy' ? 'selected' : ''}>Đã hủy</option>
          </select>
        </td>
        <td class="p-3.5 text-center whitespace-nowrap">
          <button onclick="handleDeleteOrder(${o.id})" class="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition active:scale-95 cursor-pointer">
            Xóa
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Chờ xử lý': return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    case 'Đang giao': return 'bg-sky-100 text-sky-900 border-sky-300 font-bold';
    case 'Đã giao': return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    case 'Đã hủy': return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
    default: return 'bg-slate-100 text-slate-700 border-slate-300 font-medium';
  }
}

async function handleUpdateStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể cập nhật trạng thái');
    }
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể xóa đơn hàng');
    }
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

  let targetOrders = orders;
  if (filterMode === 'delivered_only') {
    targetOrders = orders.filter(o => o.status === 'Đã giao');
  } else if (filterMode === 'exclude_cancelled') {
    targetOrders = orders.filter(o => o.status !== 'Đã hủy');
  }

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
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">Chưa có dữ liệu doanh thu phù hợp.</td></tr>`;
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
      <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
        <td class="p-3.5 font-bold text-slate-900 text-sm whitespace-nowrap">📅 ${dStr}</td>
        <td class="p-3.5 text-center text-sm font-extrabold text-slate-700"><span class="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs">${g.orderCount} đơn</span></td>
        <td class="p-3.5 text-right text-sm text-slate-600 font-mono">${formatCurrency(g.itemsAmount)}</td>
        <td class="p-3.5 text-right text-sm text-slate-600 font-mono">${formatCurrency(g.shippingFee)}</td>
        <td class="p-3.5 text-right text-sm font-extrabold text-emerald-600 font-mono whitespace-nowrap">${formatCurrency(g.totalRevenue)}</td>
      </tr>
    `;
  }).join('');

  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="bg-slate-100/80 text-slate-900 border-t-2 border-slate-200">
        <td class="p-4 font-black uppercase text-xs tracking-wider">Tổng cộng</td>
        <td class="p-4 text-center font-black">${grandOrders} đơn</td>
        <td class="p-4 text-right font-black font-mono">${formatCurrency(grandItems)}</td>
        <td class="p-4 text-right font-black font-mono">${formatCurrency(grandShip)}</td>
        <td class="p-4 text-right font-black text-emerald-700 text-base font-mono">${formatCurrency(grandTotal)}</td>
      </tr>
    `;
  }
}

// ================= MODAL TẠO ĐƠN =================
function updateModalProductSelect() {
  const select = document.getElementById('modal-product-select');
  if (!select) return;
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
  const form = document.getElementById('order-form');
  if (form) form.reset();
  const shipInput = document.getElementById('order-shipping-fee');
  if (shipInput) shipInput.value = 0;
  renderPendingItems();
  updateModalProductSelect();
  document.getElementById('order-modal')?.classList.remove('hidden');
}

function closeOrderModal() {
  document.getElementById('order-modal')?.classList.add('hidden');
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
    list.innerHTML = '<p class="text-xs text-slate-400 italic">Chưa chọn mặt hàng nào</p>';
  } else {
    list.innerHTML = pendingOrderItems.map((item, idx) => {
      const subtotal = item.price * item.quantity;
      itemsSubtotal += subtotal;
      return `
        <div class="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <span class="font-bold text-slate-800">${escapeHtml(item.product_name)}</span>
            <span class="text-slate-400"> x${item.quantity}</span>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="font-bold font-mono text-slate-700">${formatCurrency(subtotal)}</span>
            <button type="button" onclick="removeItemFromOrder(${idx})" class="w-5 h-5 rounded-full hover:bg-rose-50 text-rose-500 hover:text-rose-700 font-bold flex items-center justify-center transition cursor-pointer">&times;</button>
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
      const err = await res.json().catch(() => ({}));
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
