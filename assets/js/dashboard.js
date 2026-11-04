(() => {
  const A = window.Accounting;
  const byId = (id) => document.getElementById(id);
  const shortMoney = (amount) => amount >= 1000 ? `₱${(amount / 1000).toFixed(amount % 1000 ? 1 : 0)}k` : `₱${Math.round(amount)}`;

  function renderChart(elementId, records, expenseMode = false) {
    const target = byId(elementId);
    if (!target) return;
    const today = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: date.toLocaleDateString("en-PH", { month: "short" }) };
    });
    const amounts = months.map((month) => records.filter((record) => record.date?.startsWith(month.key))
      .reduce((sum, record) => sum + (Number(record.amount ?? record.actualExpenses) || 0), 0));
    const max = Math.max(...amounts, 1);
    target.classList.toggle("expense-chart", expenseMode);
    target.innerHTML = months.map((month, index) => {
      const amount = amounts[index];
      const height = amount ? Math.max(5, (amount / max) * 90) : 0;
      return `<div class="bar-column" title="${A.escapeHtml(month.label)}: ${A.money(amount)}"><span class="bar-value">${amount ? shortMoney(amount) : ""}</span><div class="bar-fill" style="height:${height}%"></div><span class="bar-label">${month.label}</span></div>`;
    }).join("");
  }

  function render() {
    const state = A.state;
    const totals = A.totals();
    const allMetrics = {
      "metric-assessed": totals.assessed,
      "metric-collected": totals.collected,
      "metric-outstanding": totals.outstanding,
      "metric-expenses": totals.expenses,
      "metric-cash": totals.cash,
    };
    Object.entries(allMetrics).forEach(([id, value]) => { if (byId(id)) byId(id).textContent = A.money(value); });
    byId("collection-rate").textContent = `${totals.assessed ? Math.round((totals.collected / totals.assessed) * 100) : 0}% of assessed fees collected`;
    document.querySelector(".metric-foot span:last-child").textContent = `${state.members.length} members registered`;
    const now = new Date();
    byId("today-label").textContent = now.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

    renderChart("collection-chart", state.collections);
    renderChart("expense-chart", [
      ...state.expenses,
      ...state.advances.map((advance) => ({ date: advance.date, actualExpenses: advance.actualExpenses })),
    ], true);

    const recent = [...state.collections].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 5);
    byId("recent-transactions").innerHTML = recent.length ? recent.map((item) => {
      const name = A.memberName(item.memberId);
      const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
      return `<tr><td><span class="transaction-cell"><span class="transaction-avatar">${A.escapeHtml(initials)}</span><span><span class="transaction-primary">${A.escapeHtml(item.id)}</span><span class="transaction-secondary">${A.escapeHtml(item.receipt)}</span></span></span></td><td>${A.escapeHtml(name)}</td><td>${new Date(`${item.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td><td class="align-right">${A.money(item.amount)}</td><td><span class="status status-paid">Received</span></td></tr>`;
    }).join("") : `<tr><td colspan="5" class="empty-state">No collections recorded yet.</td></tr>`;
  }

  A.ready.then(render);
})();
