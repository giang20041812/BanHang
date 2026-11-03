// ================= AUTHENTICATION STATE & HELPERS =================
let currentUser = null;

function getAuthToken() {
  return localStorage.getItem('auth_token') || '';
}

function setAuth(token, user) {
  if (token) localStorage.setItem('auth_token', token);
  if (user) {
    currentUser = user;
    localStorage.setItem('auth_user', JSON.stringify(user));
  }
}

function clearAuth() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  currentUser = null;
}

function handleUnauthorized() {
  clearAuth();
  showAuthScreen();
}

async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Chưa đăng nhập');
  }
  return res;
}

function switchAuthTab(tab) {
  const btnLogin = document.getElementById('auth-tab-login-btn');
  const btnRegister = document.getElementById('auth-tab-register-btn');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const alertBox = document.getElementById('auth-alert');
  if (alertBox) alertBox.classList.add('hidden');

  if (tab === 'login') {
    if (btnLogin) btnLogin.className = 'flex-1 py-2 rounded-lg bg-white text-indigo-700 shadow-sm transition cursor-pointer';
    if (btnRegister) btnRegister.className = 'flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer';
    if (formLogin) formLogin.classList.remove('hidden');
    if (formRegister) formRegister.classList.add('hidden');
  } else {
    if (btnRegister) btnRegister.className = 'flex-1 py-2 rounded-lg bg-white text-indigo-700 shadow-sm transition cursor-pointer';
    if (btnLogin) btnLogin.className = 'flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer';
    if (formRegister) formRegister.classList.remove('hidden');
    if (formLogin) formLogin.classList.add('hidden');
  }
}



function showAuthAlert(msg, type = 'error') {
  const alertBox = document.getElementById('auth-alert');
  if (!alertBox) return;
  alertBox.classList.remove('hidden', 'bg-rose-50', 'text-rose-700', 'border-rose-200', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'bg-blue-50', 'text-blue-700', 'border-blue-200');
  
  if (type === 'success') {
    alertBox.className = 'p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 block';
  } else if (type === 'info') {
    alertBox.className = 'p-3 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 block';
  } else {
    alertBox.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 block';
  }
  alertBox.textContent = msg;
}

function showAuthScreen() {
  document.getElementById('auth-container')?.classList.remove('hidden');
  document.getElementById('app-container')?.classList.add('hidden');
}

function showAppScreen(user) {
  document.getElementById('auth-container')?.classList.add('hidden');
  document.getElementById('app-container')?.classList.remove('hidden');
  
  const userText = document.getElementById('current-username');
  const userAvatar = document.getElementById('user-avatar-initial');
  if (userText && user) {
    userText.textContent = user.username || 'User';
  }
  if (userAvatar && user && user.username) {
    userAvatar.textContent = user.username.charAt(0).toUpperCase();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username')?.value.trim();
  const password = document.getElementById('login-password')?.value;

  if (!username || !password) {
    showAuthAlert('Vui lòng nhập tên đăng nhập và mật khẩu');
    return;
  }

  const btn = document.getElementById('btn-login-submit');
  const originText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Đăng nhập thất bại');
    }
    setAuth(data.token, data.user);
    showAppScreen(data.user);
    await initializeApp();
  } catch (err) {
    showAuthAlert(err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originText;
    }
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('register-username')?.value.trim();
  const password = document.getElementById('register-password')?.value;
  const confirmPassword = document.getElementById('register-confirm-password')?.value;

  if (!username) {
    showAuthAlert('Vui lòng nhập tên đăng nhập');
    return;
  }
  if (!password) {
    showAuthAlert('Vui lòng nhập mật khẩu');
    return;
  }
  if (password !== confirmPassword) {
    showAuthAlert('Mật khẩu xác nhận không khớp');
    return;
  }

  const btn = document.getElementById('btn-register-submit');
  const originText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang đăng ký...';
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        confirm_password: confirmPassword
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Đăng ký không thành công');
    }
    setAuth(data.token, data.user);
    showAppScreen(data.user);
    await initializeApp();
  } catch (err) {
    showAuthAlert(err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originText;
    }
  }
}

async function handleLogout() {
  if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) return;
  try {
    const token = getAuthToken();
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      });
    }
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    clearAuth();
    showAuthScreen();
  }
}

async function checkAuth() {
  const token = getAuthToken();
  if (!token) {
    showAuthScreen();
    return false;
  }
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Chưa đăng nhập');
    const data = await res.json();
    currentUser = data.user;
    showAppScreen(currentUser);
    return true;
  } catch (err) {
    clearAuth();
    showAuthScreen();
    return false;
  }
}

async function initializeApp() {
  checkStatus();
  setOrderViewMode(orderViewMode);
  await loadBatches();
  await Promise.all([loadProducts(), loadOrders()]);
}

let batches = [];
let selectedBatchId = localStorage.getItem('selected_batch_id') || null;
let products = [];
let orders = [];
let pendingOrderItems = [];

const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} ₫`;


// ================= HỆ THỐNG ĐỢT BÁN HÀNG (SALES BATCHES) =================

async function loadBatches() {
  try {
    const res = await authFetch('/api/batches');
    batches = await res.json();

    // Nếu chưa chọn đợt hoặc đợt đã lưu không tồn tại
    const exists = batches.some(b => String(b.id) === String(selectedBatchId));
    if (!exists && batches.length > 0) {
      // Ưu tiên chọn đợt đang mở bán (active) đầu tiên
      const activeBatch = batches.find(b => b.status === 'active') || batches[0];
      selectedBatchId = String(activeBatch.id);
      localStorage.setItem('selected_batch_id', selectedBatchId);
    }

    renderBatchSelector();
    renderBatches();
    updateBatchSubInfo();
  } catch (err) {
    console.error('Lỗi tải đợt bán hàng:', err);
  }
}

function renderBatchSelector() {
  const select = document.getElementById('header-batch-select');
  const badge = document.getElementById('active-batch-status-badge');
  const miniStats = document.getElementById('batch-stats-mini');
  if (!select) return;

  if (!batches.length) {
    select.innerHTML = '<option value="">Chưa có đợt bán nào</option>';
    if (badge) {
      badge.textContent = 'Chưa có đợt';
      badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/20 text-slate-300 border border-slate-500/30';
    }
    return;
  }

  const optionsHtml = batches.map(b => {
    const isSelected = String(b.id) === String(selectedBatchId);
    const statusText = b.status === 'active' ? '🟢 Mở' : '⚪ Đóng';
    return `<option value="${b.id}" ${isSelected ? 'selected' : ''}>${statusText} ${escapeHtml(b.name)} (${b.order_count || 0} đơn)</option>`;
  }).join('');

  select.innerHTML = optionsHtml + `<option value="all" ${selectedBatchId === 'all' ? 'selected' : ''}>🌐 Tất cả các đợt bán</option>`;

  const curr = batches.find(b => String(b.id) === String(selectedBatchId));
  if (badge) {
    if (selectedBatchId === 'all') {
      badge.textContent = '🌐 Xem tất cả đợt';
      badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30';
    } else if (curr && curr.status === 'active') {
      badge.textContent = '🟢 Đang mở bán';
      badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    } else {
      badge.textContent = '⚪ Đã đóng đợt';
      badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/20 text-slate-300 border border-slate-500/30';
    }
  }

  if (miniStats && curr) {
    miniStats.textContent = `• ${curr.product_count || 0} món thực đơn • ${formatCurrency(curr.total_revenue || 0)}`;
  } else if (miniStats) {
    miniStats.textContent = '';
  }
}

function updateBatchSubInfo() {
  const subInfo = document.getElementById('prod-batch-info-sub');
  if (!subInfo) return;
  const curr = batches.find(b => String(b.id) === String(selectedBatchId));
  if (selectedBatchId === 'all') {
    subInfo.textContent = 'Đang hiển thị toàn bộ món ăn của tất cả các đợt';
  } else if (curr) {
    subInfo.textContent = `Đang quản lý thực đơn của: "${curr.name}" (${curr.status === 'active' ? 'Đang mở bán' : 'Đã đóng'})`;
  }
}

async function handleBatchChange(newBatchId) {
  selectedBatchId = newBatchId;
  localStorage.setItem('selected_batch_id', newBatchId);
  renderBatchSelector();
  updateBatchSubInfo();
  await Promise.all([loadProducts(), loadOrders()]);
}

function renderBatches() {
  const totalEl = document.getElementById('stat-total-batches');
  const activeEl = document.getElementById('stat-active-batches');
  const revEl = document.getElementById('stat-batches-revenue');
  const grid = document.getElementById('batches-grid');

  if (totalEl) totalEl.textContent = `${batches.length} đợt`;
  const activeCount = batches.filter(b => b.status === 'active').length;
  if (activeEl) activeEl.textContent = `${activeCount} đợt`;

  const totalRev = batches.reduce((sum, b) => sum + Number(b.total_revenue || 0), 0);
  if (revEl) revEl.textContent = formatCurrency(totalRev);

  if (!grid) return;

  if (!batches.length) {
    grid.innerHTML = `
      <div class="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
        <p class="text-slate-400">Bạn chưa có đợt bán hàng nào.</p>
        <button onclick="openCreateBatchModal()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition">
          ＋ Tạo đợt bán đầu tiên
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = batches.map(b => {
    const isSelected = String(b.id) === String(selectedBatchId);
    const isActive = b.status === 'active';
    const dateStr = b.created_at ? new Date(b.created_at).toLocaleDateString('vi-VN') : '';

    return `
      <div class="bg-white rounded-2xl border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' : 'border-slate-200/90 shadow-sm'} p-4 sm:p-5 flex flex-col justify-between hover:shadow-md transition">
        <div>
          <!-- Header Card -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xl shrink-0">🚀</span>
              <div class="min-w-0">
                <h3 class="font-extrabold text-slate-900 text-sm sm:text-base truncate" title="${escapeHtml(b.name)}">
                  ${escapeHtml(b.name)}
                </h3>
                <span class="text-[11px] text-slate-400 font-mono">Tạo ngày ${dateStr}</span>
              </div>
            </div>

            <button onclick="toggleBatchStatus(${b.id}, '${b.status}')" title="Bấm để đổi trạng thái"
              class="px-2.5 py-1 rounded-full text-xs font-bold border transition shrink-0 cursor-pointer ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}">
              ${isActive ? '🟢 Đang mở' : '⚪ Đã đóng'}
            </button>
          </div>

          <!-- Thống kê đợt -->
          <div class="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
            <div class="bg-slate-50 p-2.5 rounded-xl">
              <span class="text-[11px] text-slate-500 font-bold block">Thực đơn</span>
              <span class="text-sm font-extrabold text-slate-800 font-mono">${b.product_count || 0} món</span>
            </div>
            <div class="bg-blue-50/60 p-2.5 rounded-xl">
              <span class="text-[11px] text-blue-600 font-bold block">Tổng số đơn</span>
              <span class="text-sm font-extrabold text-blue-700 font-mono">${b.order_count || 0} đơn</span>
            </div>
            <div class="bg-indigo-50/60 p-2.5 rounded-xl col-span-2 flex items-center justify-between">
              <div>
                <span class="text-[11px] text-indigo-600 font-bold block">Tổng doanh thu</span>
                <span class="text-sm font-extrabold text-indigo-700 font-mono">${formatCurrency(b.total_revenue || 0)}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-emerald-600 font-bold block">Thực tế (Đã giao)</span>
                <span class="text-xs font-extrabold text-emerald-700 font-mono">${formatCurrency(b.delivered_revenue || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Thao tác dưới đáy card -->
        <div class="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
          <button onclick="handleSelectBatchAndSwitch('${b.id}')"
            class="flex-1 py-1.5 px-2.5 text-center text-xs font-bold rounded-xl transition cursor-pointer ${isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'}">
            ${isSelected ? '✓ Đang làm việc' : '👉 Vào Bán Hàng'}
          </button>

          <button onclick="openCreateBatchModal('${b.id}')" title="Nhân bản thực đơn sang đợt mới"
            class="p-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer">
            📋 Nhân bản
          </button>

          <button onclick="handleEditBatchName(${b.id}, '${escapeHtml(b.name)}')" title="Đổi tên đợt"
            class="p-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer">
            ✏️
          </button>

          <button onclick="handleDeleteBatch(${b.id})" title="Xóa đợt bán này"
            class="p-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function handleSelectBatchAndSwitch(batchId) {
  handleBatchChange(batchId);
  switchTab('orders');
}

async function toggleBatchStatus(batchId, currentStatus) {
  const nextStatus = currentStatus === 'active' ? 'closed' : 'active';
  try {
    const res = await authFetch(`/api/batches/${batchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    if (!res.ok) throw new Error('Không thể cập nhật trạng thái');
    await loadBatches();
  } catch (err) {
    alert(err.message);
  }
}

async function handleEditBatchName(batchId, oldName) {
  const newName = prompt('Nhập tên mới cho đợt bán hàng:', oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;

  try {
    const res = await authFetch(`/api/batches/${batchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() })
    });
    if (!res.ok) throw new Error('Không thể đổi tên đợt');
    await loadBatches();
  } catch (err) {
    alert(err.message);
  }
}

async function handleDeleteBatch(batchId) {
  if (!confirm('Bạn có chắc muốn xóa đợt bán này? Các món và đơn hàng của đợt này sẽ bị xóa cùng.')) return;
  try {
    const res = await authFetch(`/api/batches/${batchId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa đợt bán');
    if (String(selectedBatchId) === String(batchId)) {
      selectedBatchId = null;
    }
    await loadBatches();
    await Promise.all([loadProducts(), loadOrders()]);
  } catch (err) {
    alert(err.message);
  }
}

// Modal tạo đợt mới
function openCreateBatchModal(copyFromId = null) {
  const form = document.getElementById('batch-form');
  if (form) form.reset();
  document.getElementById('batch-form-id').value = '';
  document.getElementById('batch-name').value = '';
  document.getElementById('batch-status').value = 'active';

  // Render options copy thực đơn
  const copySelect = document.getElementById('batch-copy-from-select');
  if (copySelect) {
    copySelect.innerHTML = '<option value="">-- Không sao chép (Tạo thực đơn trống) --</option>' +
      batches.map(b => `<option value="${b.id}" ${String(b.id) === String(copyFromId) ? 'selected' : ''}>${escapeHtml(b.name)} (${b.product_count || 0} món)</option>`).join('');
  }

  document.getElementById('batch-modal')?.classList.remove('hidden');
}

function closeBatchModal() {
  document.getElementById('batch-modal')?.classList.add('hidden');
}

async function handleSaveBatch(e) {
  e.preventDefault();
  const name = document.getElementById('batch-name')?.value.trim();
  const status = document.getElementById('batch-status')?.value || 'active';
  const copyFrom = document.getElementById('batch-copy-from-select')?.value || null;

  if (!name) {
    alert('Vui lòng nhập tên đợt bán');
    return;
  }

  try {
    const res = await authFetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        status,
        copy_from_batch_id: copyFrom ? Number(copyFrom) : null
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi tạo đợt');

    closeBatchModal();
    selectedBatchId = String(data.id);
    localStorage.setItem('selected_batch_id', selectedBatchId);
    await loadBatches();
    await Promise.all([loadProducts(), loadOrders()]);
    if (data.copied_count > 0) {
      alert(`Đã tạo đợt "${data.name}" và sao chép thành công ${data.copied_count} món ăn!`);
    }
  } catch (err) {
    alert(err.message);
  }
}

// Modal sao chép thực đơn vào đợt hiện tại
function openCopyMenuModal() {
  const curr = batches.find(b => String(b.id) === String(selectedBatchId));
  if (!curr) {
    alert('Vui lòng chọn 1 đợt bán cụ thể trước khi sao chép thực đơn');
    return;
  }

  const targetNameEl = document.getElementById('copy-target-batch-name');
  if (targetNameEl) targetNameEl.textContent = curr.name;

  const sourceSelect = document.getElementById('copy-source-batch-select');
  if (sourceSelect) {
    const availableSources = batches.filter(b => String(b.id) !== String(selectedBatchId));
    if (!availableSources.length) {
      alert('Chưa có đợt bán khác để sao chép thực đơn');
      return;
    }
    sourceSelect.innerHTML = availableSources.map(b =>
      `<option value="${b.id}">${escapeHtml(b.name)} (${b.product_count || 0} món)</option>`
    ).join('');
  }

  document.getElementById('copy-menu-modal')?.classList.remove('hidden');
}

function closeCopyMenuModal() {
  document.getElementById('copy-menu-modal')?.classList.add('hidden');
}

async function handleCopyMenuSubmit(e) {
  e.preventDefault();
  const sourceBatchId = document.getElementById('copy-source-batch-select')?.value;
  if (!sourceBatchId) {
    alert('Vui lòng chọn đợt nguồn');
    return;
  }

  try {
    const res = await authFetch(`/api/batches/${selectedBatchId}/copy-menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_batch_id: Number(sourceBatchId) })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi sao chép thực đơn');

    closeCopyMenuModal();
    await loadBatches();
    await loadProducts();
    alert(`Đã sao chép thành công ${data.count} món ăn vào đợt "${batches.find(b => String(b.id) === String(selectedBatchId))?.name}"!`);
  } catch (err) {
    alert(err.message);
  }
}

// Tab switching
function switchTab(tab) {
  const batchesTab = document.getElementById('tab-batches');
  const ordersTab = document.getElementById('tab-orders');
  const revenueTab = document.getElementById('tab-revenue');
  const productsTab = document.getElementById('tab-products');
  const batchesBtn = document.getElementById('tab-batches-btn');
  const ordersBtn = document.getElementById('tab-orders-btn');
  const revenueBtn = document.getElementById('tab-revenue-btn');
  const productsBtn = document.getElementById('tab-products-btn');

  const tabs = [batchesTab, ordersTab, revenueTab, productsTab];
  const btns = [batchesBtn, ordersBtn, revenueBtn, productsBtn];

  tabs.forEach(t => t?.classList.add('hidden'));
  btns.forEach(b => {
    if (b) b.className = 'flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all duration-200 whitespace-nowrap';
  });

  if (tab === 'batches') {
    batchesTab?.classList.remove('hidden');
    if (batchesBtn) batchesBtn.className = 'flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-white text-indigo-700 shadow-sm transition-all duration-200 whitespace-nowrap';
    loadBatches();
  } else if (tab === 'orders') {
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
    const query = (selectedBatchId && selectedBatchId !== 'all') ? `?batch_id=${selectedBatchId}` : '';
    const res = await authFetch(`/api/products${query}`);
    products = await res.json();
    renderProducts();
    updateModalProductSelect();
    const countBadge = document.getElementById('prod-count-badge');
    if (countBadge) countBadge.textContent = `${products.length} mặt hàng`;
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
    const res = await authFetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        price,
        batch_id: (selectedBatchId && selectedBatchId !== 'all') ? Number(selectedBatchId) : null
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể thêm mặt hàng');
    }
    nameInput.value = '';
    priceInput.value = '';
    await loadProducts();
    loadBatches();
  } catch (err) {
    alert(err.message);
  }
}

async function handleDeleteProduct(id) {
  if (!confirm('Xác nhận xóa mặt hàng này?')) return;
  try {
    const res = await authFetch(`/api/products/${id}`, { method: 'DELETE' });
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
    const query = (selectedBatchId && selectedBatchId !== 'all') ? `?batch_id=${selectedBatchId}` : '';
    const res = await authFetch(`/api/orders${query}`);
    orders = await res.json();
    renderOrders();
  } catch (err) {
    console.error('Lỗi tải đơn hàng:', err);
  }
}

// ================= QUẢN LÝ LỌC ĐƠN THEO NGÀY =================
let selectedOrderDate = getLocalDateStr(new Date());
let isAllDates = false;

function getLocalDateStr(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const targetDate = new Date(y, m - 1, d);

  const today = new Date();
  const todayStr = getLocalDateStr(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);

  const formattedDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

  if (dateStr === todayStr) {
    return `Hôm nay (${formattedDate})`;
  } else if (dateStr === yesterdayStr) {
    return `Hôm qua (${formattedDate})`;
  } else if (dateStr === tomorrowStr) {
    return `Ngày mai (${formattedDate})`;
  } else {
    const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = dayNames[targetDate.getDay()] || '';
    return `${dayName}, ${formattedDate}`;
  }
}

function updateDateUI() {
  const picker = document.getElementById('order-date-picker');
  const btnToday = document.getElementById('btn-today');
  const btnAllDates = document.getElementById('btn-all-dates');
  const currentDateText = document.getElementById('current-date-text');
  const dateOrderCount = document.getElementById('date-order-count');

  if (picker) {
    picker.value = selectedOrderDate;
  }

  const todayStr = getLocalDateStr(new Date());

  if (isAllDates) {
    if (currentDateText) currentDateText.textContent = 'Tất cả các ngày';
    if (btnAllDates) {
      btnAllDates.className = 'flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 text-white shadow-sm transition cursor-pointer';
    }
    if (btnToday) {
      btnToday.className = 'flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer';
    }
    if (picker) {
      picker.classList.add('opacity-40');
    }
  } else {
    if (currentDateText) currentDateText.textContent = formatDisplayDate(selectedOrderDate);
    if (picker) {
      picker.classList.remove('opacity-40');
    }
    if (btnAllDates) {
      btnAllDates.className = 'flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer';
    }
    if (btnToday) {
      if (selectedOrderDate === todayStr) {
        btnToday.className = 'flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 text-white shadow-sm border border-indigo-600 transition cursor-pointer';
      } else {
        btnToday.className = 'flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 active:scale-95 transition cursor-pointer';
      }
    }
  }

  const currentDayOrders = isAllDates
    ? orders
    : orders.filter(o => getLocalDateStr(o.created_at) === selectedOrderDate);

  if (dateOrderCount) {
    dateOrderCount.textContent = `${currentDayOrders.length} đơn`;
  }
}

function navigateDate(direction) {
  isAllDates = false;
  if (!selectedOrderDate) {
    selectedOrderDate = getLocalDateStr(new Date());
  }
  const parts = selectedOrderDate.split('-');
  const curr = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  curr.setDate(curr.getDate() + direction);
  selectedOrderDate = getLocalDateStr(curr);
  updateDateUI();
  renderOrders();
}

function goToToday() {
  isAllDates = false;
  selectedOrderDate = getLocalDateStr(new Date());
  updateDateUI();
  renderOrders();
}

function toggleAllDates() {
  isAllDates = !isAllDates;
  if (!isAllDates && !selectedOrderDate) {
    selectedOrderDate = getLocalDateStr(new Date());
  }
  updateDateUI();
  renderOrders();
}

function handleDatePickerChange(val) {
  if (!val) return;
  selectedOrderDate = val;
  isAllDates = false;
  updateDateUI();
  renderOrders();
}

function selectDateAndSwitchToOrders(dateStr) {
  let isoDate = dateStr;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  selectedOrderDate = isoDate;
  isAllDates = false;
  switchTab('orders');
  updateDateUI();
  renderOrders();
}

function updateOrderStats() {
  const totalRevEl = document.getElementById('stat-total-revenue');
  const deliveredRevEl = document.getElementById('stat-delivered-revenue');
  const totalOrdersEl = document.getElementById('stat-total-orders');
  const totalRevSubEl = document.getElementById('stat-total-revenue-sub');
  const deliveredRevSubEl = document.getElementById('stat-delivered-revenue-sub');
  const totalOrdersSubEl = document.getElementById('stat-total-orders-sub');

  if (!totalRevEl || !deliveredRevEl || !totalOrdersEl) return;

  const currentDayOrders = isAllDates
    ? orders
    : orders.filter(o => getLocalDateStr(o.created_at) === selectedOrderDate);

  const nonCancelledOrders = currentDayOrders.filter(o => o.status !== 'Đã hủy');
  const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const deliveredOrders = currentDayOrders.filter(o => o.status === 'Đã giao');
  const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // Thống kê toàn thời gian để đối chiếu
  const allNonCancelled = orders.filter(o => o.status !== 'Đã hủy');
  const allTotalRevenue = allNonCancelled.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  totalRevEl.textContent = formatCurrency(totalRevenue);
  deliveredRevEl.textContent = formatCurrency(deliveredRevenue);
  totalOrdersEl.textContent = `${currentDayOrders.length} đơn (${deliveredOrders.length} đã giao)`;

  if (isAllDates) {
    if (totalRevSubEl) totalRevSubEl.textContent = 'Tất cả các ngày (đã trừ đơn hủy)';
    if (deliveredRevSubEl) deliveredRevSubEl.textContent = 'Toàn bộ đơn đã giao thành công';
    if (totalOrdersSubEl) totalOrdersSubEl.textContent = `Tổng tất cả ${orders.length} đơn trong hệ thống`;
  } else {
    const dayLabel = formatDisplayDate(selectedOrderDate);
    if (totalRevSubEl) totalRevSubEl.textContent = `${dayLabel} • Tất cả: ${formatCurrency(allTotalRevenue)}`;
    if (deliveredRevSubEl) deliveredRevSubEl.textContent = `Đã giao ${dayLabel}`;
    if (totalOrdersSubEl) totalOrdersSubEl.textContent = `Đơn ${dayLabel} (Tổng toàn bộ: ${orders.length} đơn)`;
  }
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

// Hàm tính trạng thái liền kề để chuyển nhanh 1 chạm (◀ / ▶)
function getAdjacentStatuses(currentStatus) {
  switch (currentStatus) {
    case 'Chờ xử lý':
      return { prev: null, next: 'Đang giao' };
    case 'Đang giao':
      return { prev: 'Chờ xử lý', next: 'Đã giao' };
    case 'Đã giao':
      return { prev: 'Đang giao', next: null };
    case 'Đã hủy':
      return { prev: null, next: 'Chờ xử lý' };
    default:
      return { prev: null, next: null };
  }
}

// Chuyển trạng thái 1 chạm siêu nhanh (đặc biệt tiện trên điện thoại)
async function handleQuickMove(orderId, targetStatus) {
  if (!orderId || !targetStatus) return;
  await handleUpdateStatus(orderId, targetStatus);
}

// Xử lý kéo thả bằng ngón tay (Touch Events) cho màn hình cảm ứng di động
let touchGhost = null;
let touchDragOrderId = null;
let activeTouchDropzone = null;
let touchStartX = 0;
let touchStartY = 0;
let isTouchDragging = false;

function setupTouchDrag(cardEl, orderId) {
  cardEl.addEventListener('touchstart', (e) => {
    // Không drag nếu người dùng bấm vào các nút hoặc thẻ select
    if (e.target.closest('button, select, input, a')) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchDragOrderId = orderId;
    isTouchDragging = false;
  }, { passive: true });

  cardEl.addEventListener('touchmove', (e) => {
    if (!touchDragOrderId) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    // Chỉ bắt đầu kéo khi di chuyển ngón tay hơn 7px
    if (!isTouchDragging && (Math.abs(dx) > 7 || Math.abs(dy) > 7)) {
      isTouchDragging = true;
      touchGhost = cardEl.cloneNode(true);
      touchGhost.style.position = 'fixed';
      touchGhost.style.width = Math.min(cardEl.offsetWidth, 160) + 'px';
      touchGhost.style.left = (touch.clientX - 40) + 'px';
      touchGhost.style.top = (touch.clientY - 30) + 'px';
      touchGhost.style.pointerEvents = 'none';
      touchGhost.style.zIndex = '9999';
      touchGhost.style.opacity = '0.9';
      touchGhost.style.transform = 'scale(1.05) rotate(2deg)';
      touchGhost.style.boxShadow = '0 15px 30px rgba(0,0,0,0.3)';
      document.body.appendChild(touchGhost);
      cardEl.classList.add('opacity-30');
    }

    if (isTouchDragging && touchGhost) {
      if (e.cancelable) e.preventDefault();

      touchGhost.style.left = (touch.clientX - 40) + 'px';
      touchGhost.style.top = (touch.clientY - 30) + 'px';

      const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropzone = elemBelow ? elemBelow.closest('.kanban-dropzone') : null;

      if (activeTouchDropzone !== dropzone) {
        if (activeTouchDropzone) {
          activeTouchDropzone.classList.remove('bg-indigo-100/70', 'ring-2', 'ring-indigo-400');
        }
        activeTouchDropzone = dropzone;
        if (activeTouchDropzone) {
          activeTouchDropzone.classList.add('bg-indigo-100/70', 'ring-2', 'ring-indigo-400');
        }
      }
    }
  }, { passive: false });

  const endHandler = async () => {
    if (touchGhost) {
      touchGhost.remove();
      touchGhost = null;
    }
    cardEl.classList.remove('opacity-30');

    if (isTouchDragging && activeTouchDropzone) {
      const targetStatus = activeTouchDropzone.getAttribute('data-status');
      activeTouchDropzone.classList.remove('bg-indigo-100/70', 'ring-2', 'ring-indigo-400');
      activeTouchDropzone = null;

      if (targetStatus && touchDragOrderId) {
        const order = orders.find(o => o.id === touchDragOrderId);
        if (order && order.status !== targetStatus) {
          await handleUpdateStatus(touchDragOrderId, targetStatus);
        }
      }
    }

    if (activeTouchDropzone) {
      activeTouchDropzone.classList.remove('bg-indigo-100/70', 'ring-2', 'ring-indigo-400');
      activeTouchDropzone = null;
    }
    touchDragOrderId = null;
    isTouchDragging = false;
  };

  cardEl.addEventListener('touchend', endHandler, { passive: true });
  cardEl.addEventListener('touchcancel', endHandler, { passive: true });
}

function renderKanban() {
  const container = document.getElementById('kanban-board');
  if (!container) return;

  const filter = document.getElementById('filter-status')?.value || 'all';

  const dateFilteredOrders = isAllDates
    ? orders
    : orders.filter(o => getLocalDateStr(o.created_at) === selectedOrderDate);

  container.innerHTML = KANBAN_COLUMNS.map(col => {
    let colOrders = dateFilteredOrders.filter(o => o.status === col.status);
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
        const { prev: prevStatus, next: nextStatus } = getAdjacentStatuses(o.status);

        return `
            <div draggable="true"
                 data-order-id="${o.id}"
                 ondragstart="handleKanbanDragStart(event, ${o.id})"
                 ondragend="handleKanbanDragEnd(event)"
                 class="kanban-card group bg-white p-1.5 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing space-y-1 sm:space-y-2 min-w-0 overflow-hidden select-none">
              
              <div class="flex items-center justify-between text-xs">
                <span class="font-mono font-bold text-slate-700 bg-slate-100 text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-md border border-slate-200">#${o.id}</span>
                <div class="flex items-center gap-1">
                  <span class="text-slate-400 text-[10px] font-medium hidden sm:inline">${timeText}</span>
                  <button type="button" onclick="openEditOrderModal(${o.id})" title="Chỉnh sửa đơn hàng" class="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded-md transition cursor-pointer text-xs flex items-center justify-center">✏️</button>
                  <button type="button" onclick="handleDeleteOrder(${o.id})" title="Xóa đơn" class="text-slate-300 hover:text-rose-500 font-bold p-1 hover:bg-rose-50 rounded-md transition cursor-pointer text-xs">&times;</button>
                </div>
              </div>

              <div>
                <div class="text-[10px] sm:text-sm font-bold text-slate-900 flex items-center gap-1 truncate" title="${escapeHtml(o.customer_name ? `${o.customer_name} (${o.customer_phone})` : o.customer_phone)}">
                  <span class="text-[10px] text-blue-500 shrink-0">👤</span> <span class="truncate">${escapeHtml(o.customer_name || o.customer_phone)}</span>
                </div>
                ${o.customer_name ? `<div class="text-[9px] sm:text-xs text-slate-500 font-mono truncate">📞 ${escapeHtml(o.customer_phone)}</div>` : ''}
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
              <div class="sm:hidden bg-slate-50 rounded p-1 text-[9px] text-slate-600 font-medium truncate border border-slate-100" title="${escapeHtml(items.map(i => `${i.product_name} x${i.quantity}`).join(', '))}">
                📦 ${items.length} món
              </div>

              <!-- Thanh chuyển trạng thái nhanh 1 chạm (◀ / ▶) -->
              <div class="pt-1 sm:pt-1.5 border-t border-slate-100 space-y-1">
                <div class="flex items-center justify-between gap-1">
                  ${prevStatus ? `
                    <button type="button" onclick="handleQuickMove(${o.id}, '${prevStatus}')" 
                      class="px-1 sm:px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold active:scale-95 transition cursor-pointer" 
                      title="Lùi về ${prevStatus}">
                      ◀
                    </button>
                  ` : '<span class="w-4"></span>'}

                  <div class="text-[10px] sm:text-xs font-extrabold text-indigo-600 font-mono truncate text-center flex-1">
                    ${formatCurrency(o.total_amount)}
                  </div>

                  ${nextStatus ? `
                    <button type="button" onclick="handleQuickMove(${o.id}, '${nextStatus}')" 
                      class="px-1 sm:px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm active:scale-95 transition cursor-pointer" 
                      title="Chuyển sang ${nextStatus}">
                      ▶
                    </button>
                  ` : (o.status === 'Đã hủy' ? `
                    <button type="button" onclick="handleQuickMove(${o.id}, 'Chờ xử lý')" 
                      class="px-1 sm:px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold shadow-sm active:scale-95 transition cursor-pointer" 
                      title="Khôi phục về Chờ xử lý">
                      ↩
                    </button>
                  ` : '<span class="w-4"></span>')}
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
             data-status="${col.status}"
             ondragover="handleKanbanDragOver(event)"
             ondragleave="handleKanbanDragLeave(event)"
             ondrop="handleKanbanDrop(event, '${col.status}')">
          ${cardsHtml}
        </div>
      </div>
    `;
  }).join('');

  // Kích hoạt touch drag & drop cho màn hình cảm ứng di động
  container.querySelectorAll('.kanban-card').forEach(cardEl => {
    const orderId = Number(cardEl.getAttribute('data-order-id'));
    if (orderId) {
      setupTouchDrag(cardEl, orderId);
    }
  });
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
  updateDateUI();
  updateOrderStats();
  renderDailyRevenue();
  renderKanban();

  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  const filter = document.getElementById('filter-status')?.value || 'all';

  const dateFilteredOrders = isAllDates
    ? orders
    : orders.filter(o => getLocalDateStr(o.created_at) === selectedOrderDate);

  const filteredOrders = filter === 'all'
    ? dateFilteredOrders
    : dateFilteredOrders.filter(o => o.status === filter);

  if (!filteredOrders.length) {
    if (!dateFilteredOrders.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="p-8 text-center text-slate-400">
            <div class="flex flex-col items-center justify-center gap-2 py-4">
              <span class="text-3xl">📭</span>
              <p class="text-sm font-semibold text-slate-600">Không có đơn hàng nào trong ${isAllDates ? 'hệ thống' : formatDisplayDate(selectedOrderDate)}.</p>
              <div class="flex flex-wrap items-center justify-center gap-2 mt-1">
                ${!isAllDates ? `<button type="button" onclick="toggleAllDates()" class="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer">Xem tất cả ngày (${orders.length} đơn)</button>` : ''}
                <button type="button" onclick="openOrderModal()" class="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer">+ Tạo đơn mới</button>
              </div>
            </div>
          </td>
        </tr>`;
    } else {
      tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400">Không có đơn hàng nào có trạng thái "${escapeHtml(filter)}" trong ngày đang chọn.</td></tr>`;
    }
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
        <td class="p-3.5 whitespace-nowrap">
          <div class="font-bold text-slate-900 text-sm">${escapeHtml(o.customer_name || o.customer_phone)}</div>
          ${o.customer_name ? `<div class="text-xs text-slate-500 font-mono">${escapeHtml(o.customer_phone)}</div>` : ''}
        </td>
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
          <div class="flex items-center justify-center gap-1.5">
            <button type="button" onclick="openEditOrderModal(${o.id})" title="Chỉnh sửa đơn hàng"
              class="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200/80 rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1">
              <span>✏️</span> <span>Sửa</span>
            </button>
            <button type="button" onclick="handleDeleteOrder(${o.id})" title="Xóa đơn hàng"
              class="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition active:scale-95 cursor-pointer">
              Xóa
            </button>
          </div>
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
    const res = await authFetch(`/api/orders/${orderId}/status`, {
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
    const res = await authFetch(`/api/orders/${id}`, { method: 'DELETE' });
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
        <td class="p-3.5 text-center whitespace-nowrap">
          <button type="button" onclick="selectDateAndSwitchToOrders('${dStr}')"
            class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200/80 rounded-lg transition active:scale-95 cursor-pointer shadow-sm">
            <span>📋</span> <span>Xem đơn</span>
          </button>
        </td>
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
        <td class="p-4"></td>
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

let editingOrderId = null;

function openOrderModal() {
  editingOrderId = null;
  pendingOrderItems = [];
  const form = document.getElementById('order-form');
  if (form) form.reset();
  const editIdInput = document.getElementById('order-edit-id');
  if (editIdInput) editIdInput.value = '';
  const nameInput = document.getElementById('order-customer-name');
  if (nameInput) nameInput.value = '';
  const shipInput = document.getElementById('order-shipping-fee');
  if (shipInput) shipInput.value = 0;
  const statusSelect = document.getElementById('order-status');
  if (statusSelect) statusSelect.value = 'Chờ xử lý';

  const modalTitle = document.getElementById('modal-order-title');
  if (modalTitle) modalTitle.textContent = 'Tạo Đơn Hàng Mới';
  const modalSubtitle = document.getElementById('modal-order-subtitle');
  if (modalSubtitle) modalSubtitle.textContent = 'Điền thông tin khách hàng và chọn mặt hàng';
  const modalIcon = document.getElementById('modal-order-icon');
  if (modalIcon) modalIcon.textContent = '📝';
  const submitBtn = document.getElementById('modal-order-submit-btn');
  if (submitBtn) submitBtn.innerHTML = '💾 Lưu Đơn Hàng';

  renderPendingItems();
  updateModalProductSelect();
  document.getElementById('order-modal')?.classList.remove('hidden');
}

function openEditOrderModal(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    alert('Không tìm thấy thông tin đơn hàng');
    return;
  }

  editingOrderId = order.id;
  updateModalProductSelect();

  const editIdInput = document.getElementById('order-edit-id');
  if (editIdInput) editIdInput.value = order.id;

  const nameInput = document.getElementById('order-customer-name');
  if (nameInput) nameInput.value = order.customer_name || '';

  const phoneInput = document.getElementById('order-phone');
  if (phoneInput) phoneInput.value = order.customer_phone || '';

  const addressInput = document.getElementById('order-address');
  if (addressInput) addressInput.value = order.shipping_address || '';

  const shipInput = document.getElementById('order-shipping-fee');
  if (shipInput) shipInput.value = order.shipping_fee || 0;

  const statusSelect = document.getElementById('order-status');
  if (statusSelect) statusSelect.value = order.status || 'Chờ xử lý';

  // Nạp danh sách mặt hàng của đơn cần sửa
  pendingOrderItems = (order.order_items || []).map(it => ({
    product_id: it.product_id || null,
    product_name: it.product_name,
    price: Number(it.price) || 0,
    quantity: Number(it.quantity) || 1
  }));

  const modalTitle = document.getElementById('modal-order-title');
  if (modalTitle) modalTitle.textContent = `Chỉnh Sửa Đơn Hàng #${order.id}`;
  const modalSubtitle = document.getElementById('modal-order-subtitle');
  if (modalSubtitle) modalSubtitle.textContent = `Chỉnh sửa mọi thông tin ở bất kỳ trạng thái nào (Hiện tại: ${order.status})`;
  const modalIcon = document.getElementById('modal-order-icon');
  if (modalIcon) modalIcon.textContent = '✏️';
  const submitBtn = document.getElementById('modal-order-submit-btn');
  if (submitBtn) submitBtn.innerHTML = '💾 Cập Nhật Đơn Hàng';

  renderPendingItems();
  document.getElementById('order-modal')?.classList.remove('hidden');
}

function closeOrderModal() {
  editingOrderId = null;
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

async function handleSaveOrder(e) {
  e.preventDefault();
  if (!pendingOrderItems.length) {
    alert('Vui lòng thêm ít nhất 1 mặt hàng vào đơn');
    return;
  }

  const customerName = document.getElementById('order-customer-name')?.value.trim() || '';
  const phone = document.getElementById('order-phone').value.trim();
  const address = document.getElementById('order-address').value.trim();
  const shipFeeInput = document.getElementById('order-shipping-fee');
  const shippingFee = Number(shipFeeInput ? shipFeeInput.value : 0) || 0;
  const status = document.getElementById('order-status').value;

  const payload = {
    customer_name: customerName,
    customer_phone: phone,
    shipping_address: address,
    shipping_fee: shippingFee,
    status: status,
    items: pendingOrderItems
  };

  try {
    if (editingOrderId) {
      const res = await authFetch(`/api/orders/${editingOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Lỗi cập nhật đơn hàng');
      }

      const updated = await res.json();
      const idx = orders.findIndex(o => o.id === editingOrderId);
      if (idx !== -1) {
        orders[idx] = updated;
      }

      closeOrderModal();
      renderOrders();
    } else {
      const res = await authFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Lỗi tạo đơn');
      }

      closeOrderModal();
      selectedOrderDate = getLocalDateStr(new Date());
      isAllDates = false;
      updateDateUI();
      await loadOrders();
    }
  } catch (err) {
    alert(err.message);
  }
}

const handleCreateOrder = handleSaveOrder;

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
document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await checkAuth();
  if (isAuthenticated) {
    await initializeApp();
  }
});
