/* ============================================================
   SpendSmart — app.js
   Pure frontend: localStorage, Chart.js, no backend required
   ============================================================ */

// ─── DATA STORE ───────────────────────────────────────────
let store = {
  transactions: [],
  budgets: [],
  goals: [],
};

function loadStore() {
  try {
    const raw = localStorage.getItem('spendsmart_v2');
    if (raw) store = JSON.parse(raw);
    if (!Array.isArray(store.transactions)) store.transactions = [];
    if (!Array.isArray(store.budgets)) store.budgets = [];
    if (!Array.isArray(store.goals)) store.goals = [];
  } catch { store = { transactions: [], budgets: [], goals: [] }; }
}

function saveStore() {
  localStorage.setItem('spendsmart_v2', JSON.stringify(store));
}

// ─── CONSTANTS ────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  { name: 'Food', emoji: '🍜' }, { name: 'Shopping', emoji: '🛍️' },
  { name: 'Travel', emoji: '✈️' }, { name: 'Bills', emoji: '📄' },
  { name: 'Health', emoji: '🏥' }, { name: 'Entertainment', emoji: '🎬' },
  { name: 'Education', emoji: '📚' }, { name: 'Transport', emoji: '🚗' },
  { name: 'Rent', emoji: '🏠' }, { name: 'Groceries', emoji: '🛒' },
  { name: 'Subscriptions', emoji: '📱' }, { name: 'Fuel', emoji: '⛽' },
  { name: 'Others', emoji: '💸' },
];
const INCOME_CATEGORIES = [
  { name: 'Salary', emoji: '💼' }, { name: 'Freelance', emoji: '💻' },
  { name: 'Business', emoji: '🏢' }, { name: 'Investment', emoji: '📈' },
  { name: 'Rental', emoji: '🏡' }, { name: 'Bonus', emoji: '🎁' },
  { name: 'Gift', emoji: '🎀' }, { name: 'Others', emoji: '💰' },
];
const CAT_COLORS = [
  '#6366f1','#10b981','#f59e0b','#f43f5e','#06b6d4','#8b5cf6',
  '#ec4899','#84cc16','#f97316','#14b8a6','#a855f7','#0ea5e9','#64748b',
];

function getCatEmoji(name, type) {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return (list.find(c => c.name === name) || { emoji: '💳' }).emoji;
}

// ─── CURRENCY FORMATTER ───────────────────────────────────
function fmt(n) {
  if (isNaN(n)) return '₹0';
  const abs = Math.abs(n);
  let str;
  if (abs >= 1e7) str = `${(n/1e7).toFixed(1)}Cr`;
  else if (abs >= 1e5) str = `${(n/1e5).toFixed(1)}L`;
  else if (abs >= 1000) str = `${(n/1000).toFixed(1)}K`;
  else str = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  return '₹' + str;
}

function fmtFull(n) {
  return '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n || 0);
}

function fmtDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' });
}

// ─── NAVIGATION ───────────────────────────────────────────
function navigateTo(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) { el.classList.add('active'); el.blur(); }
  else {
    const target = document.querySelector(`[data-page="${page}"]`);
    if (target) target.classList.add('active');
  }
  closeSidebar();
  if (page === 'dashboard') renderDashboard();
  if (page === 'transactions') { populateFilters(); renderTransactions(); }
  if (page === 'budgets') renderBudgets();
  if (page === 'savings') renderGoals();
  if (page === 'analytics') renderAnalytics();
}

// ─── SIDEBAR ──────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ─── THEME ────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('spendsmart_theme', isDark ? 'light' : 'dark');
  updateThemeUI();
  destroyCharts();
  renderDashboard();
  renderAnalytics();
}

function updateThemeUI() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const label = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
  const icon = isDark ? '☀️' : '🌙';
  const el = document.getElementById('themeToggle');
  if (el) el.innerHTML = `<span id="themeIcon">${icon}</span> ${isDark ? 'Light' : 'Dark'} Mode`;
  const mob = document.getElementById('themeIconMobile');
  if (mob) mob.textContent = icon;
}

// ─── CHART INSTANCES ──────────────────────────────────────
let chartInstances = {};

function destroyCharts() {
  Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch {} });
  chartInstances = {};
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    text: isDark ? '#64748b' : '#94a3b8',
    ticks: isDark ? '#94a3b8' : '#64748b',
  };
}

// ─── TOAST ────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span>${msg}`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.style.opacity = '0', 2600);
  setTimeout(() => el.remove(), 3000);
}

// ─── MODALS ───────────────────────────────────────────────
function openModal(name) {
  document.getElementById('modal-' + name).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(name) {
  document.getElementById('modal-' + name).classList.remove('open');
  document.body.style.overflow = '';
}
function closeModalBackdrop(e, name) {
  if (e.target.classList.contains('modal-backdrop')) closeModal(name);
}

// ─── TRANSACTIONS ─────────────────────────────────────────
let txType = 'expense';
let txSortKey = 'date';
let txSortDir = -1;
let txPage = 1;
const TX_PER_PAGE = 15;

function setTxType(t) {
  txType = t;
  document.getElementById('typeIncome').classList.toggle('active', t === 'income');
  document.getElementById('typeExpense').classList.toggle('active', t === 'expense');
  populateTxCategories();
}

function populateTxCategories() {
  const sel = document.getElementById('txCategory');
  const cats = txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  sel.innerHTML = cats.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('');
}

function openAddTransaction(prefill = {}) {
  document.getElementById('txEditId').value = '';
  document.getElementById('txModalTitle').textContent = 'Add Transaction';
  setTxType(prefill.type || 'expense');
  document.getElementById('txTitle').value = prefill.title || '';
  document.getElementById('txAmount').value = prefill.amount || '';
  document.getElementById('txDate').value = prefill.date || new Date().toISOString().split('T')[0];
  document.getElementById('txNotes').value = prefill.notes || '';
  document.getElementById('txRecurring').value = prefill.recurring || '';
  setTimeout(() => {
    const catSel = document.getElementById('txCategory');
    if (prefill.category) {
      const opt = [...catSel.options].find(o => o.value === prefill.category);
      if (opt) catSel.value = prefill.category;
    }
    const mSel = document.getElementById('txMethod');
    if (prefill.method) mSel.value = prefill.method;
  }, 50);
  openModal('addTransaction');
}

function saveTransaction() {
  const id = document.getElementById('txEditId').value;
  const title = document.getElementById('txTitle').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value;
  const date = document.getElementById('txDate').value;
  const method = document.getElementById('txMethod').value;
  const notes = document.getElementById('txNotes').value.trim();
  const recurring = document.getElementById('txRecurring').value;

  if (!title) { toast('Please enter a title', 'error'); return; }
  if (!amount || amount <= 0) { toast('Please enter a valid amount', 'error'); return; }
  if (!date) { toast('Please select a date', 'error'); return; }

  if (id) {
    const idx = store.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      store.transactions[idx] = { ...store.transactions[idx], title, amount, category, date, method, notes, type: txType, recurring };
      toast('Transaction updated!');
    }
  } else {
    const tx = { id: uid(), title, amount, category, date, method, notes, type: txType, recurring, createdAt: new Date().toISOString() };
    store.transactions.unshift(tx);
    toast('Transaction added!');
    // Check budget
    checkBudgetAlert(category, amount, date);
  }

  saveStore();
  closeModal('addTransaction');
  renderDashboard();
  renderTransactions();
}

function editTransaction(id) {
  const tx = store.transactions.find(t => t.id === id);
  if (!tx) return;
  document.getElementById('txEditId').value = id;
  document.getElementById('txModalTitle').textContent = 'Edit Transaction';
  setTxType(tx.type);
  document.getElementById('txTitle').value = tx.title;
  document.getElementById('txAmount').value = tx.amount;
  document.getElementById('txDate').value = tx.date;
  document.getElementById('txNotes').value = tx.notes || '';
  document.getElementById('txRecurring').value = tx.recurring || '';
  setTimeout(() => {
    document.getElementById('txCategory').value = tx.category;
    document.getElementById('txMethod').value = tx.method || 'Cash';
  }, 50);
  openModal('addTransaction');
}

function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  store.transactions = store.transactions.filter(t => t.id !== id);
  saveStore();
  toast('Transaction deleted', 'info');
  renderDashboard();
  renderTransactions();
}

function duplicateTransaction(id) {
  const tx = store.transactions.find(t => t.id === id);
  if (!tx) return;
  const copy = { ...tx, id: uid(), createdAt: new Date().toISOString(), date: new Date().toISOString().split('T')[0] };
  store.transactions.unshift(copy);
  saveStore();
  toast('Transaction duplicated!', 'info');
  renderTransactions();
}

function checkBudgetAlert(category, amount, date) {
  const d = new Date(date);
  const monthKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const budget = store.budgets.find(b => b.category === category && b.month === monthKey);
  if (!budget) return;
  const spent = getSpentForBudget(budget);
  const pct = (spent / budget.limit) * 100;
  if (pct >= 100) toast(`⚠️ Budget exceeded for ${category}! (${fmtFull(spent)} / ${fmtFull(budget.limit)})`, 'error');
  else if (pct >= 80) toast(`⚠️ Budget warning: ${category} at ${Math.round(pct)}%`, 'warning');
}

function sortTx(key) {
  if (txSortKey === key) txSortDir *= -1;
  else { txSortKey = key; txSortDir = -1; }
  renderTransactions();
}

function getFilteredTransactions() {
  const search = document.getElementById('txSearch')?.value.toLowerCase() || '';
  const typeF = document.getElementById('txTypeFilter')?.value || '';
  const catF = document.getElementById('txCatFilter')?.value || '';
  const monthF = document.getElementById('txMonthFilter')?.value || '';

  return store.transactions.filter(t => {
    if (typeF && t.type !== typeF) return false;
    if (catF && t.category !== catF) return false;
    if (monthF) {
      const d = new Date(t.date);
      const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (m !== monthF) return false;
    }
    if (search) {
      const s = `${t.title} ${t.category} ${t.notes || ''}`.toLowerCase();
      if (!s.includes(search)) return false;
    }
    return true;
  }).sort((a, b) => {
    let va = a[txSortKey], vb = b[txSortKey];
    if (txSortKey === 'date') { va = new Date(va); vb = new Date(vb); }
    if (va < vb) return -txSortDir;
    if (va > vb) return txSortDir;
    return 0;
  });
}

function renderTransactions() {
  const txs = getFilteredTransactions();
  const tbody = document.getElementById('txTableBody');
  const empty = document.getElementById('txEmpty');
  const pag = document.getElementById('txPagination');
  if (!tbody) return;

  const totalPages = Math.ceil(txs.length / TX_PER_PAGE);
  if (txPage > totalPages) txPage = Math.max(1, totalPages);
  const pageTxs = txs.slice((txPage-1)*TX_PER_PAGE, txPage*TX_PER_PAGE);

  if (txs.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = '';
    pag.innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = pageTxs.map(t => `
    <tr>
      <td>${fmtDate(t.date)}</td>
      <td>
        <span>${getCatEmoji(t.category, t.type)} ${t.title}</span>
        ${t.recurring ? `<span class="rec-badge">🔄 ${t.recurring}</span>` : ''}
        ${t.notes ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${t.notes}</div>` : ''}
      </td>
      <td><span class="cat-badge">${t.category}</span></td>
      <td><span class="method-badge">${t.method || 'Cash'}</span></td>
      <td class="${t.type==='income'?'tx-amount-income':'tx-amount-expense'}">
        ${t.type==='income'?'+':'-'}${fmtFull(t.amount)}
      </td>
      <td>
        <button class="btn btn-ghost btn-xs" title="Edit" onclick="editTransaction('${t.id}')">✏️</button>
        <button class="btn btn-ghost btn-xs" title="Duplicate" onclick="duplicateTransaction('${t.id}')">📋</button>
        <button class="btn btn-ghost btn-xs" title="Delete" onclick="deleteTransaction('${t.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');

  // Pagination
  pag.innerHTML = '';
  if (totalPages > 1) {
    const prev = document.createElement('button');
    prev.className = 'page-btn'; prev.textContent = '←';
    prev.disabled = txPage === 1;
    prev.onclick = () => { txPage--; renderTransactions(); };
    pag.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
      const b = document.createElement('button');
      b.className = 'page-btn' + (i === txPage ? ' active' : '');
      b.textContent = i;
      b.onclick = ((p) => () => { txPage = p; renderTransactions(); })(i);
      pag.appendChild(b);
    }

    const next = document.createElement('button');
    next.className = 'page-btn'; next.textContent = '→';
    next.disabled = txPage === totalPages;
    next.onclick = () => { txPage++; renderTransactions(); };
    pag.appendChild(next);
  }
}

function populateFilters() {
  const catSet = new Set(store.transactions.map(t => t.category));
  const catSel = document.getElementById('txCatFilter');
  if (catSel) {
    const cur = catSel.value;
    catSel.innerHTML = '<option value="">All Categories</option>' +
      [...catSet].sort().map(c => `<option${c===cur?' selected':''}>${c}</option>`).join('');
  }

  const monthSet = new Set();
  store.transactions.forEach(t => {
    const d = new Date(t.date);
    monthSet.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  });
  const monthSel = document.getElementById('txMonthFilter');
  if (monthSel) {
    const cur = monthSel.value;
    monthSel.innerHTML = '<option value="">All Months</option>' +
      [...monthSet].sort().reverse().map(m => {
        const [y, mo] = m.split('-');
        const label = new Date(y, mo-1, 1).toLocaleDateString('en-IN', { month:'short', year:'numeric' });
        return `<option value="${m}"${m===cur?' selected':''}>${label}</option>`;
      }).join('');
  }
}

// CSV Export
function exportCSV() {
  const txs = getFilteredTransactions();
  const rows = [['Date','Type','Title','Category','Amount','Method','Notes','Recurring']];
  txs.forEach(t => rows.push([t.date, t.type, t.title, t.category, t.amount, t.method||'Cash', t.notes||'', t.recurring||'']));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `spendsmart-${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast('CSV exported!', 'info');
}

// ─── BUDGETS ──────────────────────────────────────────────
let budgetMonth = new Date();

function changeBudgetMonth(delta) {
  budgetMonth = new Date(budgetMonth.getFullYear(), budgetMonth.getMonth() + delta, 1);
  renderBudgets();
}

function getCurrentBudgetMonthKey() {
  return `${budgetMonth.getFullYear()}-${String(budgetMonth.getMonth()+1).padStart(2,'0')}`;
}

function getSpentForBudget(budget) {
  const [y, m] = budget.month.split('-').map(Number);
  return store.transactions
    .filter(t => t.type === 'expense' && t.category === budget.category && (() => {
      const d = new Date(t.date);
      return d.getFullYear() === y && d.getMonth()+1 === m;
    })())
    .reduce((sum, t) => sum + t.amount, 0);
}

function renderBudgets() {
  const key = getCurrentBudgetMonthKey();
  const [y, m] = key.split('-').map(Number);
  document.getElementById('budgetMonthLabel').textContent =
    new Date(y, m-1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const budgets = store.budgets.filter(b => b.month === key);
  const list = document.getElementById('budgetList');
  const empty = document.getElementById('budgetEmpty');

  if (budgets.length === 0) { list.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';

  list.innerHTML = budgets.map(b => {
    const spent = getSpentForBudget(b);
    const pct = Math.min((spent / b.limit) * 100, 100);
    const exceeded = spent > b.limit;
    const warning = !exceeded && pct >= 80;
    const fillColor = exceeded ? '#f43f5e' : warning ? '#f59e0b' : '#10b981';
    return `
      <div class="budget-card ${exceeded?'budget-exceeded':warning?'budget-warning':''}">
        <div class="budget-top">
          <div class="budget-cat">
            ${getCatEmoji(b.category,'expense')} ${b.category}
            <span class="alert-badge ${exceeded?'alert-exceeded':warning?'alert-warning':'alert-safe'}">
              ${exceeded?'Exceeded':warning?'Warning':'On track'}
            </span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-xs btn-outline" onclick="editBudget('${b.id}')">✏️</button>
            <button class="btn btn-xs btn-danger" onclick="deleteBudget('${b.id}')">🗑️</button>
          </div>
        </div>
        <div class="budget-amounts">
          <span class="spent">${fmtFull(spent)}</span> / ${fmtFull(b.limit)}
        </div>
        <div class="progress-track" style="margin-top:10px">
          <div class="progress-fill" style="width:${pct}%;background:${fillColor}"></div>
        </div>
        <div class="budget-status">
          <span>${Math.round(pct)}% used</span>
          <span>${fmtFull(Math.max(b.limit - spent, 0))} remaining</span>
        </div>
      </div>
    `;
  }).join('');
}

function openAddBudget() {
  document.getElementById('budgetEditId').value = '';
  document.getElementById('budgetModalTitle').textContent = 'Add Budget';
  document.getElementById('budgetLimit').value = '';
  document.getElementById('budgetMonth').value = getCurrentBudgetMonthKey();
  openModal('addBudget');
}

function editBudget(id) {
  const b = store.budgets.find(b => b.id === id);
  if (!b) return;
  document.getElementById('budgetEditId').value = id;
  document.getElementById('budgetModalTitle').textContent = 'Edit Budget';
  document.getElementById('budgetCategory').value = b.category;
  document.getElementById('budgetLimit').value = b.limit;
  document.getElementById('budgetMonth').value = b.month;
  openModal('addBudget');
}

function saveBudget() {
  const id = document.getElementById('budgetEditId').value;
  const category = document.getElementById('budgetCategory').value;
  const limit = parseFloat(document.getElementById('budgetLimit').value);
  const month = document.getElementById('budgetMonth').value;
  if (!limit || limit <= 0) { toast('Enter a valid limit', 'error'); return; }
  if (!month) { toast('Select a month', 'error'); return; }
  if (id) {
    const idx = store.budgets.findIndex(b => b.id === id);
    if (idx !== -1) store.budgets[idx] = { ...store.budgets[idx], category, limit, month };
    toast('Budget updated!');
  } else {
    const existing = store.budgets.find(b => b.category === category && b.month === month);
    if (existing) { toast(`Budget for ${category} already exists this month`, 'error'); return; }
    store.budgets.push({ id: uid(), category, limit, month });
    toast('Budget created!');
  }
  saveStore();
  closeModal('addBudget');
  renderBudgets();
  renderDashboard();
}

function deleteBudget(id) {
  if (!confirm('Delete this budget?')) return;
  store.budgets = store.budgets.filter(b => b.id !== id);
  saveStore();
  toast('Budget deleted', 'info');
  renderBudgets();
}

// ─── SAVINGS GOALS ────────────────────────────────────────
function renderGoals() {
  const list = document.getElementById('goalsList');
  const empty = document.getElementById('goalsEmpty');
  if (store.goals.length === 0) { list.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';
  list.innerHTML = store.goals.map(g => {
    const pct = Math.min((g.current / g.target) * 100, 100);
    const completed = g.current >= g.target;
    const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null;
    return `
      <div class="goal-card ${completed?'completed':''}">
        <div class="goal-stripe" style="background:${g.color}"></div>
        <div class="goal-top">
          <div class="goal-icon">${g.icon}</div>
          <div class="goal-info">
            <div class="goal-name">${g.title}</div>
            ${g.desc ? `<div class="goal-desc">${g.desc}</div>` : ''}
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;background:${g.color}"></div>
        </div>
        <div class="goal-amounts">
          <span class="goal-saved" style="color:${g.color}">${fmtFull(g.current)}</span>
          <span>${fmtFull(g.target)}</span>
        </div>
        <div class="goal-pct" style="color:${g.color};margin-top:6px">${Math.round(pct)}%</div>
        ${daysLeft !== null ? `<div class="goal-deadline">${daysLeft > 0 ? `⏳ ${daysLeft} days left` : completed ? '' : `❗ Overdue by ${Math.abs(daysLeft)} days`}</div>` : ''}
        <div class="goal-actions">
          ${!completed ? `<button class="btn btn-sm btn-success" onclick="openAddToGoal('${g.id}','${g.title}')">+ Add Savings</button>` : ''}
          <button class="btn btn-sm btn-outline" onclick="editGoal('${g.id}')">✏️ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteGoal('${g.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function saveGoal() {
  const id = document.getElementById('goalEditId').value;
  const title = document.getElementById('goalTitle').value.trim();
  const target = parseFloat(document.getElementById('goalTarget').value);
  const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
  const deadline = document.getElementById('goalDeadline').value;
  const icon = document.getElementById('goalIcon').value;
  const color = document.getElementById('goalColor').value;
  const desc = document.getElementById('goalDesc').value.trim();
  if (!title) { toast('Enter a goal name', 'error'); return; }
  if (!target || target <= 0) { toast('Enter a valid target amount', 'error'); return; }
  if (id) {
    const idx = store.goals.findIndex(g => g.id === id);
    if (idx !== -1) store.goals[idx] = { ...store.goals[idx], title, target, current, deadline, icon, color, desc };
    toast('Goal updated!');
  } else {
    store.goals.push({ id: uid(), title, target, current: current || 0, deadline, icon, color, desc, createdAt: new Date().toISOString() });
    toast('Goal created! 🎯');
  }
  saveStore();
  closeModal('addGoal');
  renderGoals();
}

function editGoal(id) {
  const g = store.goals.find(g => g.id === id);
  if (!g) return;
  document.getElementById('goalEditId').value = id;
  document.getElementById('goalModalTitle').textContent = 'Edit Goal';
  document.getElementById('goalTitle').value = g.title;
  document.getElementById('goalTarget').value = g.target;
  document.getElementById('goalCurrent').value = g.current;
  document.getElementById('goalDeadline').value = g.deadline || '';
  document.getElementById('goalIcon').value = g.icon;
  document.getElementById('goalColor').value = g.color;
  document.getElementById('goalDesc').value = g.desc || '';
  openModal('addGoal');
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  store.goals = store.goals.filter(g => g.id !== id);
  saveStore();
  toast('Goal deleted', 'info');
  renderGoals();
}

function openAddToGoal(id, title) {
  document.getElementById('addToGoalId').value = id;
  document.getElementById('addToGoalTitle').textContent = `Add to: ${title}`;
  document.getElementById('addToGoalAmount').value = '';
  openModal('addToGoal');
}

function addToGoal() {
  const id = document.getElementById('addToGoalId').value;
  const amount = parseFloat(document.getElementById('addToGoalAmount').value);
  if (!amount || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
  const idx = store.goals.findIndex(g => g.id === id);
  if (idx === -1) return;
  store.goals[idx].current = Math.min(store.goals[idx].current + amount, store.goals[idx].target);
  saveStore();
  if (store.goals[idx].current >= store.goals[idx].target) {
    toast(`🎉 Goal "${store.goals[idx].title}" completed!`, 'success');
  } else {
    toast(`₹${fmtFull(amount)} added to goal!`);
  }
  closeModal('addToGoal');
  renderGoals();
}

// ─── DASHBOARD ────────────────────────────────────────────
function renderDashboard() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const incomes = store.transactions.filter(t => t.type === 'income');
  const expenses = store.transactions.filter(t => t.type === 'expense');
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  const monthExp = expenses.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((s, t) => s + t.amount, 0);

  document.getElementById('totalIncome').textContent = fmt(totalIncome);
  document.getElementById('totalExpense').textContent = fmt(totalExpense);
  document.getElementById('netBalance').textContent = fmt(net);
  document.getElementById('monthExpense').textContent = fmt(monthExp);
  document.getElementById('incomeCount').textContent = `${incomes.length} entries`;
  document.getElementById('expenseCount').textContent = `${expenses.length} entries`;
  document.getElementById('balanceTrend').textContent = net >= 0 ? '📈 Positive balance' : '📉 Deficit';

  const sub = document.getElementById('dashSubtitle');
  if (sub) sub.textContent = `${now.toLocaleDateString('en-IN',{month:'long',year:'numeric'})} • ${store.transactions.length} transactions`;

  renderBarChart();
  renderPieChart();
  renderLineChart();
  renderRecentTx();
  renderBudgetStatus();
}

function getLast6Months() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({ label: d.toLocaleDateString('en-IN',{month:'short'}), year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

function renderBarChart() {
  const months = getLast6Months();
  const incomeData = months.map(m => store.transactions.filter(t => t.type==='income' && (() => { const d=new Date(t.date); return d.getMonth()===m.month && d.getFullYear()===m.year; })()).reduce((s,t)=>s+t.amount,0));
  const expenseData = months.map(m => store.transactions.filter(t => t.type==='expense' && (() => { const d=new Date(t.date); return d.getMonth()===m.month && d.getFullYear()===m.year; })()).reduce((s,t)=>s+t.amount,0));

  const cc = getChartColors();
  const ctx = document.getElementById('barChart');
  if (!ctx) return;
  if (chartInstances.bar) chartInstances.bar.destroy();
  chartInstances.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: 'Income', data: incomeData, backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 6 },
        { label: 'Expenses', data: expenseData, backgroundColor: 'rgba(244,63,94,0.75)', borderRadius: 6 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: cc.ticks, font: { family: 'Inter', size: 12 } } }, tooltip: { callbacks: { label: ctx => ` ${fmtFull(ctx.raw)}` } } },
      scales: {
        x: { grid: { color: cc.grid }, ticks: { color: cc.ticks } },
        y: { grid: { color: cc.grid }, ticks: { color: cc.ticks, callback: v => fmt(v) } }
      }
    }
  });
}

function renderPieChart() {
  const expenses = store.transactions.filter(t => t.type === 'expense');
  const catMap = {};
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const labels = Object.keys(catMap);
  const data = Object.values(catMap);
  const colors = labels.map((_, i) => CAT_COLORS[i % CAT_COLORS.length]);

  const ctx = document.getElementById('pieChart');
  if (!ctx) return;
  if (chartInstances.pie) chartInstances.pie.destroy();

  const legendEl = document.getElementById('pieLegend');
  if (labels.length === 0) {
    if (legendEl) legendEl.innerHTML = '<span style="color:var(--text-muted);font-size:12px">No expense data yet</span>';
    ctx.style.display = 'none'; return;
  }
  ctx.style.display = '';

  chartInstances.pie = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtFull(ctx.raw)}` } }
      }
    }
  });

  if (legendEl) {
    legendEl.innerHTML = labels.map((l, i) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${colors[i]}"></div>
        <span>${l}</span>
      </div>`).join('');
  }
}

function renderLineChart() {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    months.push({ label: d.toLocaleDateString('en-IN',{month:'short'}), year: d.getFullYear(), month: d.getMonth() });
  }
  const data = months.map(m => store.transactions.filter(t => t.type==='expense' && (() => { const d=new Date(t.date); return d.getMonth()===m.month && d.getFullYear()===m.year; })()).reduce((s,t)=>s+t.amount,0));
  const cc = getChartColors();
  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
  if (chartInstances.line) chartInstances.line.destroy();
  chartInstances.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [{
        label: 'Monthly Spending', data,
        borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)',
        fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmtFull(ctx.raw)}` } } },
      scales: {
        x: { grid: { color: cc.grid }, ticks: { color: cc.ticks } },
        y: { grid: { color: cc.grid }, ticks: { color: cc.ticks, callback: v => fmt(v) } }
      }
    }
  });
}

function renderRecentTx() {
  const el = document.getElementById('recentTxList');
  if (!el) return;
  const recent = [...store.transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0, 8);
  if (recent.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:30px"><div class="empty-icon">💳</div><p>No transactions yet</p></div>';
    return;
  }
  el.innerHTML = recent.map(t => `
    <div class="tx-row">
      <div class="tx-icon-wrap tx-icon-${t.type}">${getCatEmoji(t.category, t.type)}</div>
      <div class="tx-info">
        <div class="tx-name">${t.title}</div>
        <div class="tx-meta">${t.category} · ${fmtDate(t.date)}</div>
      </div>
      <div class="${t.type==='income'?'tx-amount-income':'tx-amount-expense'}" style="font-size:13px">
        ${t.type==='income'?'+':'-'}${fmtFull(t.amount)}
      </div>
    </div>`).join('');
}

function renderBudgetStatus() {
  const el = document.getElementById('budgetStatusList');
  if (!el) return;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const budgets = store.budgets.filter(b => b.month === monthKey);
  if (budgets.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">No budgets set for this month.<br><button class="btn-link" onclick="navigateTo(\'budgets\',null)">Create budgets →</button></div>';
    return;
  }
  el.innerHTML = `<div class="budget-status-row">` + budgets.map(b => {
    const spent = getSpentForBudget(b);
    const pct = Math.min((spent / b.limit) * 100, 100);
    const color = pct >= 100 ? '#f43f5e' : pct >= 80 ? '#f59e0b' : '#10b981';
    return `
      <div class="bs-item">
        <div class="bs-top">
          <span class="bs-cat">${getCatEmoji(b.category,'expense')} ${b.category}</span>
          <span class="bs-pct" style="color:${color}">${Math.round(pct)}%</span>
        </div>
        <div class="progress-track" style="height:6px">
          <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted)">${fmtFull(spent)} / ${fmtFull(b.limit)}</div>
      </div>`;
  }).join('') + '</div>';
}

// ─── ANALYTICS ────────────────────────────────────────────
function renderAnalytics() {
  const months = parseInt(document.getElementById('analyticsPeriod')?.value || '6');
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  cutoff.setDate(1);

  const expenses = store.transactions.filter(t => t.type === 'expense' && new Date(t.date) >= cutoff);
  const incomes = store.transactions.filter(t => t.type === 'income' && new Date(t.date) >= cutoff);

  const totalExp = expenses.reduce((s,t) => s+t.amount, 0);
  const totalInc = incomes.reduce((s,t) => s+t.amount, 0);
  const days = Math.max(1, Math.round((new Date() - cutoff) / 86400000));
  const avgDaily = totalExp / days;
  const biggestExp = expenses.length > 0 ? Math.max(...expenses.map(t => t.amount)) : 0;

  const statsEl = document.getElementById('analyticsStats');
  if (statsEl) {
    statsEl.innerHTML = [
      { label: 'Total Income', value: fmtFull(totalInc), color: '#10b981' },
      { label: 'Total Expenses', value: fmtFull(totalExp), color: '#f43f5e' },
      { label: 'Net Savings', value: fmtFull(totalInc - totalExp), color: '#6366f1' },
      { label: 'Avg Daily Spend', value: fmtFull(avgDaily), color: '#f59e0b' },
      { label: 'Biggest Expense', value: fmtFull(biggestExp), color: '#f43f5e' },
      { label: 'Transactions', value: expenses.length + incomes.length, color: '#06b6d4' },
    ].map(s => `<div class="a-stat"><div class="a-label">${s.label}</div><div class="a-value" style="color:${s.color}">${s.value}</div></div>`).join('');
  }

  // Category bar
  const catMap = {};
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const catEntries = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
  const cc = getChartColors();

  const abarCtx = document.getElementById('analyticsBar');
  if (abarCtx) {
    if (chartInstances.abar) chartInstances.abar.destroy();
    chartInstances.abar = new Chart(abarCtx, {
      type: 'bar',
      data: {
        labels: catEntries.map(e => e[0]),
        datasets: [{ label: 'Expenses', data: catEntries.map(e => e[1]), backgroundColor: catEntries.map((_,i) => CAT_COLORS[i%CAT_COLORS.length]), borderRadius: 6 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmtFull(ctx.raw)}` } } },
        scales: {
          x: { grid: { color: cc.grid }, ticks: { color: cc.ticks, callback: v => fmt(v) } },
          y: { grid: { color: cc.grid }, ticks: { color: cc.ticks } }
        }
      }
    });
  }

  // Income doughnut
  const incMap = {};
  incomes.forEach(t => { incMap[t.category] = (incMap[t.category] || 0) + t.amount; });
  const incEntries = Object.entries(incMap);
  const adCtx = document.getElementById('analyticsDoughnut');
  if (adCtx) {
    if (chartInstances.adoughnut) chartInstances.adoughnut.destroy();
    if (incEntries.length > 0) {
      chartInstances.adoughnut = new Chart(adCtx, {
        type: 'doughnut',
        data: {
          labels: incEntries.map(e => e[0]),
          datasets: [{ data: incEntries.map(e => e[1]), backgroundColor: incEntries.map((_,i) => CAT_COLORS[i%CAT_COLORS.length]), borderWidth: 0 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '60%',
          plugins: { legend: { labels: { color: cc.ticks, font: { family: 'Inter' } } }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtFull(ctx.raw)}` } } }
        }
      });
    }
  }

  renderHeatmap(expenses);
  renderTopExpenses(expenses);
}

function renderHeatmap(expenses) {
  const el = document.getElementById('heatmapContainer');
  if (!el) return;
  const dayMap = {};
  expenses.forEach(t => { dayMap[t.date] = (dayMap[t.date] || 0) + t.amount; });
  const maxVal = Math.max(...Object.values(dayMap), 1);

  const weeks = 26;
  const today = new Date();
  today.setHours(0,0,0,0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7));

  const cells = [];
  const d = new Date(startDate);
  while (d <= today) {
    const key = d.toISOString().split('T')[0];
    const val = dayMap[key] || 0;
    const intensity = val > 0 ? Math.max(0.15, val / maxVal) : 0;
    cells.push({ key, val, intensity, dow: d.getDay() });
    d.setDate(d.getDate() + 1);
  }

  // Group into weeks
  const weeksArr = [];
  let week = new Array(7).fill(null);
  cells.forEach(c => {
    week[c.dow] = c;
    if (c.dow === 6) { weeksArr.push(week); week = new Array(7).fill(null); }
  });
  if (week.some(c => c)) weeksArr.push(week);

  const days = ['S','M','T','W','T','F','S'];
  el.innerHTML = `
    <div class="heatmap-row">
      <div class="hm-label" style="display:flex;flex-direction:column;gap:12px">
        ${days.map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="hm-cells">
        ${weeksArr.map(week => `
          <div style="display:flex;flex-direction:column;gap:3px">
            ${week.map(c => c ? `
              <div class="hm-cell"
                style="background:${c.val > 0 ? `rgba(99,102,241,${c.intensity})` : 'var(--surface-2)'}"
                data-tip="${c.key}: ${c.val > 0 ? fmtFull(c.val) : 'No spending'}">
              </div>` : '<div class="hm-cell" style="background:transparent;pointer-events:none"></div>'
            ).join('')}
          </div>`).join('')}
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:11px;color:var(--text-muted)">
      Less
      ${[0.1,0.25,0.5,0.75,1].map(o => `<div class="hm-cell" style="background:rgba(99,102,241,${o});position:relative"></div>`).join('')}
      More
    </div>`;
}

function renderTopExpenses(expenses) {
  const el = document.getElementById('topExpensesList');
  if (!el) return;
  const sorted = [...expenses].sort((a,b) => b.amount - a.amount).slice(0, 10);
  if (sorted.length === 0) { el.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:20px 0">No expenses in this period</p>'; return; }
  el.innerHTML = sorted.map((t, i) => `
    <div class="top-expense-row">
      <div class="te-rank">${i+1}</div>
      <div class="te-info">
        <div class="te-name">${getCatEmoji(t.category,'expense')} ${t.title}</div>
        <div class="te-meta">${t.category} · ${fmtDate(t.date)} · ${t.method||'Cash'}</div>
      </div>
      <div class="te-amount">${fmtFull(t.amount)}</div>
    </div>`).join('');
}

// ─── SEED DATA ────────────────────────────────────────────
function seedDemoData() {
  if (store.transactions.length > 0) return;
  const now = new Date();
  const entries = [];
  for (let i = 0; i < 6; i++) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    // Income
    entries.push({ id:uid(), type:'income', title:'Monthly Salary', amount:85000, category:'Salary', date:new Date(m.getFullYear(),m.getMonth(),1).toISOString().split('T')[0], method:'Net Banking', notes:'', recurring:'monthly', createdAt:new Date().toISOString() });
    if (Math.random()>0.4) entries.push({ id:uid(), type:'income', title:'Freelance Project', amount:Math.round((15000+Math.random()*30000)/500)*500, category:'Freelance', date:new Date(m.getFullYear(),m.getMonth(),15).toISOString().split('T')[0], method:'UPI', notes:'', recurring:'', createdAt:new Date().toISOString() });
    // Expenses
    const exps = [
      ['Zomato / Swiggy', 'Food', 2500+Math.round(Math.random()*2000), 'UPI'],
      ['Grocery Shopping', 'Groceries', 3000+Math.round(Math.random()*2000), 'UPI'],
      ['Electricity Bill', 'Bills', 1800+Math.round(Math.random()*600), 'Net Banking'],
      ['Netflix + Hotstar', 'Subscriptions', 499+299, 'Credit Card'],
      ['Fuel', 'Fuel', 2000+Math.round(Math.random()*1500), 'Cash'],
      ['Shopping', 'Shopping', 3000+Math.round(Math.random()*5000), 'Credit Card'],
      ['Gym', 'Health', 1500, 'UPI'],
    ];
    exps.forEach(([title, cat, amt, method], j) => {
      entries.push({ id:uid(), type:'expense', title, amount:amt, category:cat, date:new Date(m.getFullYear(),m.getMonth(),5+j*3).toISOString().split('T')[0], method, notes:'', recurring:'', createdAt:new Date().toISOString() });
    });
  }
  store.transactions = entries;
  // Budgets for current month
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  store.budgets = [
    { id:uid(), category:'Food', limit:5000, month:monthKey },
    { id:uid(), category:'Shopping', limit:8000, month:monthKey },
    { id:uid(), category:'Bills', limit:3000, month:monthKey },
    { id:uid(), category:'Groceries', limit:5000, month:monthKey },
    { id:uid(), category:'Fuel', limit:3000, month:monthKey },
  ];
  // Goals
  store.goals = [
    { id:uid(), title:'Emergency Fund', icon:'🐷', color:'#10b981', target:300000, current:120000, deadline:`${now.getFullYear()+1}-12-31`, desc:'6 months of expenses', createdAt:new Date().toISOString() },
    { id:uid(), title:'Buy a Bike', icon:'🏍️', color:'#6366f1', target:120000, current:45000, deadline:`${now.getFullYear()}-12-31`, desc:'KTM Duke 390', createdAt:new Date().toISOString() },
    { id:uid(), title:'Goa Vacation', icon:'✈️', color:'#f59e0b', target:50000, current:22000, deadline:`${now.getFullYear()}-10-01`, desc:'Holiday trip with family', createdAt:new Date().toISOString() },
  ];
  saveStore();
}

// ─── UTILS ────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStore();

  // Restore theme
  const savedTheme = localStorage.getItem('spendsmart_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI();

  // Seed demo data for first-time users
  seedDemoData();

  // Populate tx categories
  populateTxCategories();

  // Set today's date as default
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];

  // Set budget month default
  const now = new Date();
  document.getElementById('budgetMonth').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  // Wire budget modal open button
  document.querySelectorAll('[onclick="openModal(\'addBudget\')"]').forEach(btn => {
    btn.onclick = openAddBudget;
  });
  document.querySelectorAll('[onclick="openModal(\'addTransaction\')"]').forEach(btn => {
    btn.onclick = () => openAddTransaction();
  });

  // Render initial page
  renderDashboard();
});
