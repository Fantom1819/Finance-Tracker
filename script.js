// script.js - Phase 3 (merged)
// Full-featured Finance Tracker: editing, sorting/filtering, category management,
// EMI highlighting, backup/restore, charts, widgets, AI insights, exports.

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- DOM helpers ---------- */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  /* ---------- DOM refs ---------- */
  const tabs = $$('.tab-btn');
  const tabPanels = $$('.tab');

  const emiForm = $('#emi-form');
  const emiListEl = $('#emi-list');

  const goalForm = $('#goal-form');
  const goalInput = $('#goal-input');
  const goalDisplay = $('#goal-display');

  const txnForm = $('#transaction-form');
  const typeInput = $('#type');
  const categorySelect = $('#category');
  const amountInput = $('#amount');
  const dateInput = $('#date');
  const repeatSelect = $('#repeat');
  const txnTableBody = $('#transaction-table-body');

  const filterTypeSelect = $('#filter-type');
  const sortSelect = $('#sort-transactions');

  const addCategoryBtn = $('#add-category-btn');
  const manageCategoryBtn = $('#manage-category-btn');
  const newCatName = $('#new-cat-name');
  const newCatEmoji = $('#new-cat-emoji');

  const categoryListEl = $('#category-list');
  const categoryModal = $('#category-modal');
  const closeCategoryModal = $('#close-category-modal');

  const pieCanvas = $('#pieChart');
  const barCanvas = $('#barChart');
  const yearlyCanvas = $('#yearlyChart');
  const netCanvas = $('#netChart');

  const yearSelect = $('#year-select');
  const refreshYearBtn = $('#refresh-year');
  const yearlyTableBody = $('#yearly-table tbody');

  const netForm = $('#net-form');
  const netDate = $('#net-date');
  const netAsset = $('#net-asset');
  const netLiab = $('#net-liab');
  const netTableBody = $('#net-table tbody');

  const aiTableBody = $('#goal-status-table tbody');
  const aiBox = $('#ai-analysis');

  const downloadExcelBtn = $('#download-report');
  const downloadPdfBtn = $('#download-pdf');
  const backupBtn = $('#backup-data');
  const restoreBtn = $('#restore-btn');
  const restoreFileInput = $('#restore-data');

  const refreshDataBtn = $('#refresh-data');
  const clearDataBtn = $('#clear-data');

  const chartModal = $('#chart-modal');
  const chartModalClose = $('#chart-modal-close');
  const chartModalCanvas = $('#chart-modal-canvas');

  const editModal = $('#edit-transaction-modal');
  const closeEditModal = $('#close-edit-transaction');
  const editForm = $('#edit-transaction-form');
  const editType = $('#edit-type');
  const editCategory = $('#edit-category');
  const editAmount = $('#edit-amount');
  const editDate = $('#edit-date');

  const widgetsRow = $('#widgets-row');

  /* ---------- localStorage keys ---------- */
  const LS = {
    emis: 'ft_emis',
    txns: 'ft_transactions',
    goal: 'ft_monthlyGoal',
    cats: 'ft_categories',
    net: 'ft_networth',
    recurring: 'ft_recurring'
  };

  /* ---------- state ---------- */
  let emis = [];
  let transactions = [];
  let monthlyGoal = null; // stored as number (dollars)
  let categories = [];
  let netEntries = [];
  let recurring = [];

  // charts
  let pieChart = null, barChart = null, yearlyChart = null, netChart = null;

  // currently editing transaction index in transactions array
  let editIndex = null;

  /* ---------- helpers (safe math using cents) ---------- */
  function uid(prefix = 'id') { return prefix + '_' + Math.random().toString(36).slice(2,9); }
  function toCents(amount) {
    const n = Number(amount) || 0;
    return Math.round(n * 100);
  }
  function fromCents(cents) {
    const dollars = cents / 100;
    return '$' + dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function saveAll() {
    localStorage.setItem(LS.emis, JSON.stringify(emis));
    localStorage.setItem(LS.txns, JSON.stringify(transactions));
    localStorage.setItem(LS.goal, (monthlyGoal === null) ? '' : String(monthlyGoal));
    localStorage.setItem(LS.cats, JSON.stringify(categories));
    localStorage.setItem(LS.net, JSON.stringify(netEntries));
    localStorage.setItem(LS.recurring, JSON.stringify(recurring));
  }

  /* ---------- load & normalize ---------- */
  function loadAll() {
    try { emis = JSON.parse(localStorage.getItem(LS.emis) || '[]'); } catch { emis = []; }
    try { transactions = JSON.parse(localStorage.getItem(LS.txns) || '[]'); } catch { transactions = []; }
    transactions = transactions.map(tx => ({
      id: tx.id || uid('txn'),
      type: tx.type || 'expense',
      category: tx.category || 'other',
      amount: Number(tx.amount) || 0,
      date: tx.date || (new Date().toISOString().slice(0,10)),
      emiId: tx.emiId || null,
      templateId: tx.templateId || null
    }));
    let g = localStorage.getItem(LS.goal);
    monthlyGoal = (g === null || g === '') ? null : (Number(g) || null);

    try {
      categories = JSON.parse(localStorage.getItem(LS.cats) || 'null');
      if (!categories || !Array.isArray(categories)) categories = null;
    } catch { categories = null; }
    if (!categories || !Array.isArray(categories)) {
      categories = [
        { id: 'salary', name: 'Salary', icon: '💼' },
        { id: 'food', name: 'Food', icon: '🍔' },
        { id: 'emi', name: 'EMI', icon: '🏦' },
        { id: 'utilities', name: 'Utilities', icon: '💡' },
        { id: 'other', name: 'Other', icon: '🔖' }
      ];
      localStorage.setItem(LS.cats, JSON.stringify(categories));
    } else {
      categories = categories.map(c => {
        if (typeof c === 'string') {
          return { id: c.toLowerCase().replace(/\s+/g,'-'), name: c, icon: '' };
        } else {
          return { id: c.id || (c.name? c.name.toLowerCase().replace(/\s+/g,'-') : uid('cat')), name: c.name || c.id, icon: c.icon || '' };
        }
      });
    }

    try { netEntries = JSON.parse(localStorage.getItem(LS.net) || '[]'); } catch { netEntries = []; }
    netEntries = netEntries.map(n => ({ id: n.id || uid('net'), date: n.date || new Date().toISOString().slice(0,10), assets: Number(n.assets) || 0, liab: Number(n.liab) || 0 }));
    try { recurring = JSON.parse(localStorage.getItem(LS.recurring) || '[]'); } catch { recurring = []; }
  }

  /* ---------- category helpers & UI ---------- */
  function populateCategorySelect(sel = categorySelect) {
    if (!sel) return;
    // keep placeholder option for add form; for edit form we don't want placeholder
    sel.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.disabled = true;
    ph.selected = true;
    ph.textContent = sel === editCategory ? undefined : 'Category';
    if (sel !== editCategory) sel.appendChild(ph);
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = (c.icon ? c.icon + ' ' : '') + c.name;
      sel.appendChild(opt);
    });
    // for editCategory we want first real option selected by default if none selected
    if (sel === editCategory && !sel.value && categories.length) sel.value = categories[0].id;
  }

  function openCategoryModal() {
    categoryListEl.innerHTML = '';
    categories.forEach((cat, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div style="display:flex;gap:0.6rem;align-items:center">
          <div style="font-size:1.2rem">${escapeHtml(cat.icon||'')}</div>
          <div>${escapeHtml(cat.name)}</div>
        </div>
        <div style="display:flex;gap:0.4rem">
          <button data-edit-cat="${idx}" title="Rename">✏️</button>
          <button data-del-cat="${idx}" title="Delete">❌</button>
        </div>`;
      categoryListEl.appendChild(li);
    });
    categoryModal.style.display = 'flex';
  }

  /* ---------- EMI rendering with highlight ---------- */
  function daysUntil(dateStr) {
    const today = new Date();
    const d = new Date(dateStr + 'T00:00:00');
    const diff = d - new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.ceil(diff / (1000*60*60*24));
  }

  function renderEmis() {
    if (!emiListEl) return;
    emiListEl.innerHTML = '';
    emis.forEach((e, idx) => {
      const li = document.createElement('li');
      const days = daysUntil(e.dueDate);
      let status = '';
      let className = '';
      if (e.paid) { status = `Paid on ${e.paidDate || '—'}`; className = 'emi-paid'; }
      else if (days < 0) { status = `Overdue ${Math.abs(days)}d`; className = 'emi-overdue'; }
      else if (days <= 5) { status = `Due in ${days}d`; className = 'emi-upcoming'; }
      else { status = `Due in ${days}d`; }

      li.className = className;
      li.style.transition = 'background-color 0.45s ease';

      li.innerHTML = `<div>
          <strong>${escapeHtml(e.title)}</strong>
          <div style="font-size:0.85rem;color:#9aa1a6">${fromCents(toCents(e.amount))} — ${status}</div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center">
          <label style="font-size:0.85rem;color:#cbd6da"><input type="checkbox" data-idx="${idx}" ${e.paid? 'checked' : ''}/> Paid</label>
          <button data-del="${idx}" aria-label="delete emi">❌</button>
        </div>`;

      // checkbox handler
      li.querySelector('input[type="checkbox"]').addEventListener('change', (ev) => {
        const i = Number(ev.target.dataset.idx);
        if (ev.target.checked) {
          emis[i].paid = true;
          emis[i].paidDate = new Date().toISOString().slice(0,10);
          if (!emis[i].id) emis[i].id = uid('emi');
          // create linked expense if not exists
          const exists = transactions.some(tx => tx.emiId && tx.emiId === emis[i].id);
          if (!exists) {
            transactions.push({
              id: uid('txn'),
              type: 'expense',
              category: 'emi',
              amount: Number(emis[i].amount),
              date: emis[i].paidDate,
              emiId: emis[i].id
            });
          }
        } else {
          emis[i].paid = false;
          if (emis[i].id) {
            transactions = transactions.filter(tx => !(tx.emiId && tx.emiId === emis[i].id));
          }
        }
        saveAll();
        renderEmis();
        renderTransactions();
        renderCharts();
        renderWidgets();
      });

      // delete EMI
      li.querySelector('button[data-del]').addEventListener('click', (ev) => {
        const i = Number(ev.target.dataset.del);
        if (emis[i] && emis[i].id) {
          transactions = transactions.filter(tx => !(tx.emiId && tx.emiId === emis[i].id));
        }
        emis.splice(i,1);
        saveAll();
        renderEmis();
        renderTransactions();
        renderCharts();
        renderWidgets();
      });

      emiListEl.appendChild(li);
    });
  }

  /* ---------- transaction rendering (supports filter & sort) ---------- */
  function renderTransactions() {
    if (!txnTableBody) return;
    txnTableBody.innerHTML = '';

    // clone transactions so we don't mutate original order
    let list = transactions.slice();

    // filter by type
    const typeFilter = (filterTypeSelect && filterTypeSelect.value) || 'all';
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);

    // sort
    const sortVal = (sortSelect && sortSelect.value) || 'date-desc';
    list.sort((a,b) => {
      if (sortVal === 'date-asc') return new Date(b.date) - new Date(a.date); 
      if (sortVal === 'date-desc') return new Date(a.date) - new Date(b.date);
      if (sortVal === 'amount-desc') return toCents(b.amount) - toCents(a.amount);
      if (sortVal === 'amount-asc') return toCents(a.amount) - toCents(b.amount);
      if (sortVal === 'category-asc') return getCategoryLabel(a.category).localeCompare(getCategoryLabel(b.category));
      if (sortVal === 'category-desc') return getCategoryLabel(b.category).localeCompare(getCategoryLabel(a.category));
      return 0;
    });

    // running balance computed over shown list
    let balanceCents = 0;
    list.forEach((t, idx) => {
      const amtC = toCents(t.amount);
      if (t.type === 'income') balanceCents += amtC; else balanceCents -= amtC;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx+1}</td>
        <td>${escapeHtml(t.type)}</td>
        <td>${fromCents(amtC)}</td>
        <td>${escapeHtml(t.date)}</td>
        <td>${escapeHtml(getCategoryLabel(t.category))}</td>
        <td>${fromCents(balanceCents)}</td>
        <td style="display:flex;gap:0.3rem;justify-content:center">
          <button class="edit-t" data-i="${transactions.indexOf(t)}" title="Edit">✏️</button>
          <button class="del-t" data-i="${transactions.indexOf(t)}" title="Delete">❌</button>
        </td>`;
      // delete
      tr.querySelector('.del-t').addEventListener('click', () => {
        const globalIdx = Number(tr.querySelector('.del-t').dataset.i);
        if (!confirm('Delete this transaction?')) return;
        transactions.splice(globalIdx,1);
        saveAll();
        renderTransactions();
        renderCharts();
        renderWidgets();
      });
      // edit
      tr.querySelector('.edit-t').addEventListener('click', () => {
        const globalIdx = Number(tr.querySelector('.edit-t').dataset.i);
        editIndex = globalIdx;
        const t = transactions[globalIdx];
        editType.value = t.type;
        populateCategorySelect(editCategory);
        editCategory.value = t.category;
        editAmount.value = t.amount;
        editDate.value = t.date;
        editModal.style.display = 'flex';
      });
      txnTableBody.appendChild(tr);
    });
    renderWidgets(); // update widgets after transactions render
  }

  /* ---------- category label helper ---------- */
  function getCategoryLabel(catId) {
    const c = categories.find(x => x.id === catId || x.name === catId);
    if (!c) return catId;
    return (c.icon ? (c.icon + ' ') : '') + c.name;
  }

  /* ---------- charts ---------- */
  function makeGradient(ctx, color1, color2) {
    const g = ctx.createLinearGradient(0,0,0,ctx.canvas.height || 200);
    g.addColorStop(0, color1);
    g.addColorStop(1, color2);
    return g;
  }

  function getMonthShort(dateStr) {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleString(undefined, { month: 'short' });
    } catch { return ''; }
  }

  function renderCharts() {
    // pie - this month income vs expense
    const curMonthShort = new Date().toLocaleString(undefined, { month: 'short' });
    let incomeCurC = 0, expenseCurC = 0;
    transactions.forEach(t => {
      const m = getMonthShort(t.date);
      if (m === curMonthShort) {
        if (t.type === 'income') incomeCurC += toCents(t.amount);
        else expenseCurC += toCents(t.amount);
      }
    });

    // dispose previous
    if (pieChart) try { pieChart.destroy(); } catch(e){}
    if (pieCanvas && pieCanvas.getContext) {
      const ctx = pieCanvas.getContext('2d');
      pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Income','Expense'], datasets: [{ data: [incomeCurC/100, expenseCurC/100], backgroundColor: [makeGradient(ctx,'#4caf50','#2e7d32'), makeGradient(ctx,'#ff6b6b','#b71c1c')] }]},
        options: { responsive:false, plugins:{legend:{position:'bottom'}} }
      });
    }

    // bar - last 3 months
    const labels = [];
    for (let i=2;i>=0;i--) { const d=new Date(); d.setMonth(d.getMonth()-i); labels.push(d.toLocaleString(undefined,{month:'short'})); }
    const incomes = labels.map(l => transactions.filter(t => getMonthShort(t.date) === l && t.type === 'income').reduce((s,tx)=> s + toCents(tx.amount), 0) / 100);
    const expenses = labels.map(l => transactions.filter(t => getMonthShort(t.date) === l && t.type === 'expense').reduce((s,tx)=> s + toCents(tx.amount), 0) / 100);

    if (barChart) try { barChart.destroy(); } catch(e){}
    if (barCanvas && barCanvas.getContext) {
      const ctxb = barCanvas.getContext('2d');
      barChart = new Chart(ctxb, {
        type:'bar',
        data: { labels, datasets: [{ label:'Income', data: incomes, backgroundColor: makeGradient(ctxb,'#4caf50','#2e7d32') }, { label:'Expense', data: expenses, backgroundColor: makeGradient(ctxb,'#ff7b7b','#b71c1c') }]},
        options: { responsive:false }
      });
    }
  }

  /* ---------- widgets ---------- */
  function getMonthKey(dateString) {
    const d = new Date(dateString + 'T00:00:00');
    return d.toLocaleString(undefined, { month:'short', year:'numeric' });
  }

  function renderWidgets() {
    if (!widgetsRow) return;
    widgetsRow.innerHTML = '';
    const todayKey = new Date().toISOString().slice(0,10);
    const todaySpendC = transactions.filter(t => t.type === 'expense' && t.date === todayKey).reduce((s,t) => s + toCents(t.amount), 0);
    const totalNetC = transactions.reduce((s,t) => s + (t.type === 'income' ? toCents(t.amount) : -toCents(t.amount)), 0);
    const remaining = (monthlyGoal === null) ? null : Math.max(0, toCents(monthlyGoal) - totalNetC);

    // top category this month
    const curMonthKey = new Date().toLocaleString(undefined, { month:'short', year:'numeric' });
    const expenseByCat = {};
    transactions.filter(tx => tx.type === 'expense' && getMonthKey(tx.date) === curMonthKey).forEach(tx => {
      expenseByCat[tx.category] = (expenseByCat[tx.category] || 0) + toCents(tx.amount);
    });
    const top = Object.entries(expenseByCat).sort((a,b)=>b[1]-a[1])[0];

    function mk(title, value, sub) {
      const w = document.createElement('div'); w.className='widget';
      w.innerHTML = `<div style="font-size:0.9rem;color:#c7ccd1">${title}</div><div style="font-weight:700">${value}</div><div style="font-size:0.8rem;color:#9aa1a6">${sub||''}</div>`;
      return w;
    }
    widgetsRow.appendChild(mk("Today's Spending", fromCents(todaySpendC), 'expenses'));
    widgetsRow.appendChild(mk("Remaining to Goal", remaining===null ? '—' : fromCents(remaining), 'this month'));
    widgetsRow.appendChild(mk("Top Category", top ? (getCategoryLabel(top[0]) + ' ' + fromCents(top[1])) : '—', 'this month'));
  }

  /* ---------- yearly & net rendering ---------- */
  function populateYearSelect() {
    if (!yearSelect) return;
    yearSelect.innerHTML = '';
    const now = new Date().getFullYear();
    for (let y = now; y >= now - 5; y--) {
      const opt = document.createElement('option'); opt.value = y; opt.textContent = y; yearSelect.appendChild(opt);
    }
    yearSelect.value = now;
  }

  function renderYearly(year) {
    if (!yearlyCanvas) return;
    if (yearlyChart) try { yearlyChart.destroy(); } catch(e){}
    const months = []; for (let m=0;m<12;m++){ const d=new Date(year, m, 1); months.push(d.toLocaleString(undefined,{month:'short'})); }
    const incomeArr = months.map(mn => transactions.filter(t => new Date(t.date + 'T00:00:00').getFullYear() === Number(year) && getMonthShort(t.date) === mn && t.type === 'income').reduce((s,t)=>s + toCents(t.amount), 0) / 100);
    const expenseArr = months.map(mn => transactions.filter(t => new Date(t.date + 'T00:00:00').getFullYear() === Number(year) && getMonthShort(t.date) === mn && t.type === 'expense').reduce((s,t)=>s + toCents(t.amount), 0) / 100);

    const ctx = yearlyCanvas.getContext('2d');
    yearlyChart = new Chart(ctx, { type:'line', data: { labels: months, datasets: [{ label:'Income', data: incomeArr, borderColor:'#4caf50', tension:0.25 }, { label:'Expense', data: expenseArr, borderColor:'#ff6b6b', tension:0.25 }]}, options:{ responsive:false } });

    // update table
    if (yearlyTableBody) {
      yearlyTableBody.innerHTML = '';
      months.forEach((mn, idx) => {
        const inc = incomeArr[idx], exp = expenseArr[idx];
        const saved = inc - exp;
        const achievedPercent = monthlyGoal ? Math.round((saved / monthlyGoal) * 1000) / 10 : null;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${mn} ${year}</td><td>${fromCents(Math.round(inc*100))}</td><td>${fromCents(Math.round(exp*100))}</td><td>${achievedPercent === null ? '-' : achievedPercent + '%'}</td>`;
        yearlyTableBody.appendChild(tr);
      });
    }
  }

  function renderNet() {
    if (!netTableBody) return;
    netTableBody.innerHTML = '';
    const grouped = {};
    netEntries.forEach(n => {
      grouped[n.date] = grouped[n.date] || { assets:0, liab:0 };
      grouped[n.date].assets += Number(n.assets) || 0;
      grouped[n.date].liab += Number(n.liab) || 0;
    });
    const dates = Object.keys(grouped).sort((a,b) => new Date(a) - new Date(b));
    const labels = [], data = [];
    dates.forEach(d => {
      const a = grouped[d].assets, l = grouped[d].liab;
      const net = Math.round((a - l) * 100) / 100;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d}</td><td>${fromCents(Math.round(a*100))}</td><td>${fromCents(Math.round(l*100))}</td><td>${fromCents(Math.round(net*100))}</td>`;
      netTableBody.appendChild(tr);
      labels.push(d); data.push(net);
    });
    if (netChart) try { netChart.destroy(); } catch(e){}
    if (netCanvas) {
      const ctx = netCanvas.getContext('2d');
      netChart = new Chart(ctx, { type:'line', data: { labels, datasets: [{ label:'Net Worth', data, borderColor:'#06d6a4', tension:0.25 }]}, options:{ responsive:false } });
    }
  }

  /* ---------- AI insights ---------- */
  function renderAIInsights() {
    if (!aiTableBody || !aiBox) return;
    aiTableBody.innerHTML = '';
    aiBox.innerHTML = '';
    if (monthlyGoal === null) {
      aiBox.innerHTML = '<p style="color:#f6c860">Set a monthly savings goal to get AI insights and the roadmap.</p>';
      return;
    }
    const monthly = {};
    transactions.forEach(tx => {
      const m = getMonthShort(tx.date);
      monthly[m] = monthly[m] || { incomeC:0, expenseC:0 };
      if (tx.type === 'income') monthly[m].incomeC += toCents(tx.amount);
      else monthly[m].expenseC += toCents(tx.amount);
    });
    let yearlyIncomeC = 0, yearlyExpenseC = 0;
    Object.keys(monthly).forEach(m => {
      const savedC = monthly[m].incomeC - monthly[m].expenseC;
      yearlyIncomeC += monthly[m].incomeC; yearlyExpenseC += monthly[m].expenseC;
      const achieved = monthlyGoal ? Math.round((savedC/100 / monthlyGoal) * 1000) / 10 : 0;
      const status = achieved >= 100 ? '✅' : achieved >= 75 ? '⚠️' : '❌';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${m}</td><td>${fromCents(Math.round(monthlyGoal*100))}</td><td>${fromCents(savedC)}</td><td>${achieved}%</td><td>${status}</td>`;
      aiTableBody.appendChild(tr);
    });
    const yearlySavedC = yearlyIncomeC - yearlyExpenseC;
    const yearlyAchievedPercent = monthlyGoal ? Math.round(((yearlySavedC/100) / (monthlyGoal * 12)) * 1000) / 10 : 0;
    // top expense cats
    const expenseByCategory = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + toCents(t.amount);
    });
    const sorted = Object.entries(expenseByCategory).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k,v]) => `${getCategoryLabel(k)} ${fromCents(v)}`);
    const roadmap = [];
    if (yearlyAchievedPercent >= 100) roadmap.push('You are on track for yearly goals — consider investing excess savings.');
    else {
      const shortfall = Math.round((monthlyGoal*12 - (yearlySavedC/100)) * 100) / 100;
      roadmap.push(`Shortfall this year: ${fromCents(Math.round(shortfall*100))}`);
      if (sorted.length) roadmap.push(`Reduce spending in: ${sorted.join(', ')}.`);
      roadmap.push('Automate a monthly transfer to savings on day 1.');
      roadmap.push('Review subscriptions and pause unused ones.');
    }
    aiBox.innerHTML = `<h3 style="color:#4caf50;margin-top:0">AI Summary</h3>
      <p><strong>Yearly Income:</strong> ${fromCents(yearlyIncomeC)} &nbsp; <strong>Yearly Expense:</strong> ${fromCents(yearlyExpenseC)}</p>
      <p><strong>Yearly Saved:</strong> ${fromCents(yearlySavedC)} (${yearlyAchievedPercent}% of yearly target)</p>
      <h4 style="margin-bottom:6px">Roadmap</h4><ul style="margin-top:0">${roadmap.map(r=>`<li>${r}</li>`).join('')}</ul>`;
  }

  /* ---------- recurring templates processor ---------- */
  function processRecurring() {
    const today = new Date().toISOString().slice(0,10);
    let changed = false;
    recurring.forEach(t => {
      if (!t.lastGenerated) t.lastGenerated = t.startDate || today;
      function addInterval(dateStr, interval) {
        const d = new Date(dateStr + 'T00:00:00');
        if (interval === 'weekly') d.setDate(d.getDate() + 7);
        else if (interval === 'monthly') d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0,10);
      }
      let next = addInterval(t.lastGenerated, t.interval);
      while (new Date(next) <= new Date(today)) {
        const exists = transactions.some(tx => tx.templateId === t.id && tx.date === next);
        if (!exists) {
          transactions.push({ id: uid('txn'), type: t.type, category: t.category, amount: Number(t.amount), date: next, templateId: t.id });
        }
        t.lastGenerated = next;
        next = addInterval(t.lastGenerated, t.interval);
        changed = true;
      }
    });
    if (changed) saveAll();
  }

  /* ---------- exports: Excel & PDF ---------- */
  function exportExcel() {
    try {
      const rows = transactions.map((t,i) => ({
        'ID': t.id || (i+1),
        Type: t.type,
        Amount: (toCents(t.amount)/100).toFixed(2),
        Date: t.date,
        Category: getCategoryLabel(t.category)
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      XLSX.writeFile(wb, `finance_transactions_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (err) {
      console.error('Excel export error', err);
      alert('Excel export failed. See console for details.');
    }
  }

  async function exportPDF() {
    try {
      const el = document.querySelector('.main-content') || document.body;
      const canvas = await html2canvas(el, { scale: 1.5, useCORS:true, allowTaint:true, backgroundColor: '#1e1f23' });
      const img = canvas.toDataURL('image/png', 1.0);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(img, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`finance_snapshot_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error('PDF export error', err);
      alert('PDF export failed. See console for details.');
    }
  }

  /* ---------- chart modal ---------- */
  function openChartModal(chartInstance) {
    if (!chartModal) return;
    chartModal.style.display = 'flex';
    if (chartModal._inner) try { chartModal._inner.destroy(); } catch(e){}
    const cfg = { type: chartInstance.config.type, data: JSON.parse(JSON.stringify(chartInstance.data)), options: JSON.parse(JSON.stringify(chartInstance.options || {})) };
    chartModal._inner = new Chart(chartModalCanvas.getContext('2d'), cfg);
  }
  if (chartModalClose) chartModalClose.addEventListener('click', () => {
    chartModal.style.display = 'none';
    if (chartModal._inner) try { chartModal._inner.destroy(); } catch(e){}
  });
  window.addEventListener('click', (ev) => { if (ev.target === chartModal) { chartModal.style.display='none'; if (chartModal._inner) try{chartModal._inner.destroy();}catch(e){} } });

  /* ---------- UI wiring: events ---------- */

  // tab switching
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.dataset.tab;
    const panel = document.getElementById(id);
    if (panel) panel.classList.add('active');
    if (id === 'tab-ai') renderAIInsights();
  }));

  // add category
  if (addCategoryBtn) addCategoryBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = (newCatName && newCatName.value || '').trim();
    const icon = (newCatEmoji && newCatEmoji.value || '').trim();
    if (!name) { alert('Enter category name'); return; }
    const id = name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'') || uid('cat');
    categories.push({ id, name, icon });
    saveAll(); populateCategorySelect(); renderWidgets();
    newCatName.value=''; newCatEmoji.value='';
  });

  // manage categories modal
  if (manageCategoryBtn) manageCategoryBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openCategoryModal();
  });
  if (closeCategoryModal) closeCategoryModal.addEventListener('click', () => categoryModal.style.display = 'none');
  // handle clicks inside category modal (rename/delete)
  categoryListEl && categoryListEl.addEventListener('click', (e) => {
    const editIdx = e.target.dataset.editCat;
    const delIdx = e.target.dataset.delCat;
    if (editIdx !== undefined) {
      const newName = prompt('Rename category:', categories[editIdx].name);
      if (newName && newName.trim()) {
        categories[editIdx].name = newName.trim();
        saveAll();
        populateCategorySelect();
        openCategoryModal();
      }
    } else if (delIdx !== undefined) {
      const idx = Number(delIdx);
      if (!confirm(`Delete category "${categories[idx].name}"? Transactions in this category will be moved to "Other".`)) return;
      const removed = categories.splice(idx,1)[0];
      // reassign transactions of that category to 'other' (create if missing)
      let other = categories.find(c => c.id === 'other');
      if (!other) {
        other = { id: 'other', name: 'Other', icon: '🔖' };
        categories.push(other);
      }
      transactions.forEach(tx => { if (tx.category === removed.id) tx.category = other.id; });
      saveAll();
      populateCategorySelect();
      openCategoryModal();
      renderTransactions();
      renderCharts();
      renderWidgets();
    }
  });

  // add EMI
  if (emiForm) emiForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('#emi-title-input').value.trim();
    const amount = Number($('#emi-amount').value);
    const due = $('#emi-due').value;
    if (!title || !amount || !due) return alert('Fill EMI fields');
    emis.push({ id: uid('emi'), title, amount: Math.round(Number(amount) * 100)/100, dueDate: due, paid: false, paidDate: null });
    saveAll(); emiForm.reset(); renderEmis(); renderWidgets();
  });

  // add transaction
  if (txnForm) txnForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = typeInput.value;
    const category = categorySelect.value;
    const amount = Number(amountInput.value);
    const date = dateInput.value || (new Date().toISOString().slice(0,10));
    const repeat = repeatSelect.value || 'none';
    if (!type || !category || !amount || !date) return alert('Please fill Type, Category, Amount and Date.');
    // create recurring template if needed
    if (repeat && repeat !== 'none') {
      const tpl = { id: uid('tpl'), type, category, amount: Number(amount), startDate: date, interval: repeat, lastGenerated: date };
      recurring.push(tpl);
    }
    transactions.push({ id: uid('txn'), type, category, amount: Math.round(Number(amount) * 100)/100, date });
    saveAll();
    txnForm.reset();
    renderTransactions(); renderCharts(); renderWidgets();
  });

  // goal form
  if (goalForm) goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = Number(goalInput.value);
    if (!val || val <= 0) return alert('Enter a valid goal amount');
    monthlyGoal = Math.round(val * 100) / 100;
    saveAll();
    goalInput.value = '';
    goalDisplay.textContent = `Current Monthly Goal: ${fromCents(Math.round(monthlyGoal*100))}`;
    renderWidgets(); renderAIInsights();
  });

  // net form
  if (netForm) netForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = netDate.value || new Date().toISOString().slice(0,10);
    const assets = Number(netAsset.value) || 0;
    const liab = Number(netLiab.value) || 0;
    netEntries.push({ id: uid('net'), date, assets: Math.round(assets*100)/100, liab: Math.round(liab*100)/100 });
    saveAll(); netAsset.value=''; netLiab.value=''; netDate.value='';
    renderNet();
  });

  // exports
  if (downloadExcelBtn) downloadExcelBtn.addEventListener('click', exportExcel);
  if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', exportPDF);

  // backup & restore
  if (backupBtn) backupBtn.addEventListener('click', () => {
    const data = { emis, transactions, monthlyGoal, categories, netEntries, recurring };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finance_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  if (restoreBtn) restoreBtn.addEventListener('click', () => restoreFileInput.click());
  if (restoreFileInput) restoreFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        emis = data.emis || [];
        transactions = data.transactions || [];
        monthlyGoal = data.monthlyGoal || null;
        categories = data.categories || [];
        netEntries = data.netEntries || [];
        recurring = data.recurring || [];
        saveAll();
        // re-render all
        populateCategorySelect();
        renderEmis(); renderTransactions(); renderCharts(); renderWidgets();
        populateYearSelect();
        renderYearly(Number(yearSelect && yearSelect.value) || new Date().getFullYear());
        renderNet(); renderAIInsights();
        alert('Data restored successfully!');
      } catch (err) {
        console.error(err);
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  });

  // refresh & clear
  if (refreshDataBtn) refreshDataBtn.addEventListener('click', () => {
    loadAll();
    populateCategorySelect();
    renderEmis();
    renderTransactions();
    renderCharts();
    renderWidgets();
    populateYearSelect();
    renderYearly(Number(yearSelect && yearSelect.value) || new Date().getFullYear());
    renderNet();
    renderAIInsights();
    alert('Data reloaded from localStorage.');
  });
  if (clearDataBtn) clearDataBtn.addEventListener('click', () => {
    if (!confirm('Clear ALL saved data (localStorage)? This cannot be undone.')) return;
    localStorage.clear();
    loadAll();
    populateCategorySelect();
    renderEmis(); renderTransactions(); renderCharts(); renderWidgets(); renderNet();
    alert('All local data cleared.');
  });

  // yearly refresh
  if (refreshYearBtn) refreshYearBtn.addEventListener('click', () => {
    const y = Number(yearSelect.value) || new Date().getFullYear();
    renderYearly(y);
  });

  // sorting/filtering handlers
  if (filterTypeSelect) filterTypeSelect.addEventListener('change', renderTransactions);
  if (sortSelect) sortSelect.addEventListener('change', renderTransactions);

  // edit modal handlers
  if (editForm) editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (editIndex !== null && transactions[editIndex]) {
      transactions[editIndex] = {
        ...transactions[editIndex],
        type: editType.value,
        category: editCategory.value,
        amount: parseFloat(editAmount.value),
        date: editDate.value
      };
      saveAll();
      renderTransactions();
      renderCharts();
      renderWidgets();
      editModal.style.display = 'none';
      editIndex = null;
    }
  });
  if (closeEditModal) closeEditModal.addEventListener('click', () => { editModal.style.display = 'none'; editIndex = null; });

  // category select population for both add and edit forms
  populateCategorySelect(categorySelect);
  populateCategorySelect(editCategory);

  /* ---------- attach chart click handlers ---------- */
  function attachChartClickHandlers() {
    try {
      if (pieCanvas) pieCanvas.addEventListener('click', () => { if (pieChart) openChartModal(pieChart); });
      if (barCanvas) barCanvas.addEventListener('click', () => { if (barChart) openChartModal(barChart); });
      if (yearlyCanvas) yearlyCanvas.addEventListener('click', () => { if (yearlyChart) openChartModal(yearlyChart); });
      if (netCanvas) netCanvas.addEventListener('click', () => { if (netChart) openChartModal(netChart); });
    } catch(e) { /* ignore */ }
  }

  /* ---------- bootstrapping ---------- */
  function init() {
    loadAll();
    populateCategorySelect(categorySelect);
    populateCategorySelect(editCategory);
    renderEmis();
    renderTransactions();
    renderCharts();
    renderWidgets();
    populateYearSelect();
    renderYearly(Number(yearSelect.value) || new Date().getFullYear());
    renderNet();
    processRecurring();
    attachChartClickHandlers();
    // show stored goal
    if (goalDisplay) goalDisplay.textContent = monthlyGoal === null ? 'No goal set.' : `Current Monthly Goal: ${fromCents(Math.round(monthlyGoal*100))}`;
    console.log('Initialization complete. Transactions:', transactions.length, 'EMIs:', emis.length, 'Goal:', monthlyGoal);
  }

  init();

  // small public helper for debugging
  window.financeTrackerValidate = () => {
    return {
      txCount: transactions.length,
      emiCount: emis.length,
      goal: monthlyGoal,
      categoriesCount: categories.length,
      netCount: netEntries.length
    };
  };

  // close modals with Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (editModal) editModal.style.display = 'none';
      if (categoryModal) categoryModal.style.display = 'none';
      if (chartModal) chartModal.style.display = 'none';
    }
  });
});
