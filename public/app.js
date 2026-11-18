(function () {
  const CATEGORY_LABELS = {
    an_uong: 'Ăn uống',
    di_chuyen: 'Di chuyển',
    giai_tri: 'Giải trí',
    hoa_don: 'Hoá đơn',
    khac: 'Khác',
  };
  const CATEGORY_COLORS = {
    an_uong: '#f97316',
    di_chuyen: '#2563eb',
    giai_tri: '#9333ea',
    hoa_don: '#dc2626',
    khac: '#6b7280',
  };

  const monthSelect = document.getElementById('month-select');
  const tbody = document.getElementById('expense-tbody');
  const emptyMessage = document.getElementById('empty-message');
  const totalValueEl = document.getElementById('total-value');
  const newExpenseBtn = document.getElementById('new-expense-btn');
  const dialog = document.getElementById('expense-dialog');
  const form = document.getElementById('expense-form');
  const dialogTitle = document.getElementById('dialog-title');
  const idField = document.getElementById('expense-id');
  const dateField = document.getElementById('expense-date');
  const amountField = document.getElementById('expense-amount');
  const categoryField = document.getElementById('expense-category');
  const noteField = document.getElementById('expense-note');
  const formError = document.getElementById('form-error');
  const cancelBtn = document.getElementById('cancel-btn');

  let chart = null;
  let currentMonth = null;

  function formatMoney(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  function currentYearMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    if (!res.ok) {
      const message = (body && body.error) || `Lỗi ${res.status}`;
      throw new Error(message);
    }
    return body;
  }

  async function loadMonthOptions(preferMonth) {
    const all = await fetchJson('/api/expenses');
    const months = Array.from(new Set(all.map((e) => e.date.slice(0, 7)))).sort((a, b) =>
      b.localeCompare(a)
    );
    if (months.length === 0) {
      months.push(currentYearMonth());
    }
    monthSelect.innerHTML = '';
    months.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });
    const target = preferMonth && months.includes(preferMonth)
      ? preferMonth
      : months.includes(currentYearMonth())
      ? currentYearMonth()
      : months[0];
    monthSelect.value = target;
    return target;
  }

  function renderTable(rows) {
    tbody.innerHTML = '';
    emptyMessage.hidden = rows.length > 0;
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.date}</td>
        <td>${CATEGORY_LABELS[row.category] || row.category}</td>
        <td>${row.note ? escapeHtml(row.note) : ''}</td>
        <td class="amount-col">${formatMoney(row.amount)}</td>
        <td class="actions-col">
          <button type="button" class="edit-btn" data-id="${row.id}">Sửa</button>
          <button type="button" class="delete-btn" data-id="${row.id}">Xoá</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderChart(byCategory) {
    const labels = Object.keys(byCategory);
    const data = labels.map((k) => byCategory[k]);
    const colors = labels.map((k) => CATEGORY_COLORS[k] || '#9ca3af');
    const ctx = document.getElementById('category-chart');

    if (chart) {
      chart.destroy();
    }
    if (labels.length === 0) {
      return;
    }
    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.map((k) => CATEGORY_LABELS[k] || k),
        datasets: [{ data, backgroundColor: colors }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });
  }

  async function refreshMonth(month) {
    currentMonth = month;
    const [rows, summary] = await Promise.all([
      fetchJson(`/api/expenses?month=${encodeURIComponent(month)}`),
      fetchJson(`/api/summary?month=${encodeURIComponent(month)}`),
    ]);
    renderTable(rows);
    totalValueEl.textContent = formatMoney(summary.total);
    renderChart(summary.byCategory);
  }

  async function init() {
    const month = await loadMonthOptions();
    await refreshMonth(month);
  }

  monthSelect.addEventListener('change', () => {
    refreshMonth(monthSelect.value);
  });

  function openDialog(expense) {
    formError.hidden = true;
    formError.textContent = '';
    if (expense) {
      dialogTitle.textContent = 'Sửa khoản chi';
      idField.value = expense.id;
      dateField.value = expense.date;
      amountField.value = expense.amount;
      categoryField.value = expense.category;
      noteField.value = expense.note || '';
    } else {
      dialogTitle.textContent = 'Thêm khoản chi';
      idField.value = '';
      dateField.value = currentMonth ? `${currentMonth}-01` : '';
      amountField.value = '';
      categoryField.value = 'an_uong';
      noteField.value = '';
    }
    dialog.showModal();
  }

  newExpenseBtn.addEventListener('click', () => openDialog(null));
  cancelBtn.addEventListener('click', () => dialog.close());

  tbody.addEventListener('click', async (event) => {
    const target = event.target;
    const id = target.getAttribute('data-id');
    if (!id) return;

    if (target.classList.contains('edit-btn')) {
      const rows = await fetchJson(`/api/expenses?month=${encodeURIComponent(currentMonth)}`);
      const expense = rows.find((r) => String(r.id) === id);
      if (expense) openDialog(expense);
    }

    if (target.classList.contains('delete-btn')) {
      const confirmed = window.confirm('Bạn chắc chắn muốn xoá khoản chi này?');
      if (!confirmed) return;
      await fetchJson(`/api/expenses/${id}`, { method: 'DELETE' });
      const month = await loadMonthOptions(currentMonth);
      await refreshMonth(month);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.hidden = true;
    const payload = {
      date: dateField.value,
      amount: Number(amountField.value),
      category: categoryField.value,
      note: noteField.value,
    };
    const id = idField.value;
    try {
      if (id) {
        await fetchJson(`/api/expenses/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      dialog.close();
      const targetMonth = payload.date.slice(0, 7);
      const month = await loadMonthOptions(targetMonth);
      await refreshMonth(month);
    } catch (err) {
      formError.textContent = err.message;
      formError.hidden = false;
    }
  });

  init();
})();
