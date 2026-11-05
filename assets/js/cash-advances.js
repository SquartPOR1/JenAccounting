(() => {
  const A = window.Accounting;
  const state = A.state;
  const byId = (id) => document.getElementById(id);

  function accountability(advance) {
    const balance = Number(advance.amount) - Number(advance.actualExpenses) - Number(advance.returned);
    if (balance < 0) return { status: "Overdrawn", amount: Math.abs(balance) };
    if (balance === 0) return { status: "Settled", amount: 0 };
    return { status: "Outstanding", amount: balance };
  }

  function render() {
    const table = byId("advances-table");
    if (!table) return;
    const query = byId("advance-search").value.trim().toLowerCase();
    const filter = byId("advance-filter").value;
    const records = [...state.advances].filter((advance) => {
      const status = accountability(advance).status;
      return (!filter || filter === status) && `${advance.id} ${advance.purpose}`.toLowerCase().includes(query);
    }).sort((a, b) => b.date.localeCompare(a.date));
    const total = A.sum(state.advances);
    const outstanding = state.advances.reduce((sum, item) => sum + A.outstandingAdvance(item), 0);
    byId("advance-total").textContent = A.money(total);
    byId("advance-outstanding").textContent = A.money(outstanding);
    byId("advance-returned").textContent = A.money(A.sum(state.advances, (item) => item.returned));
    byId("advance-count").textContent = `${records.length} of ${state.advances.length} advances`;
    table.innerHTML = records.map((item) => {
      const status = accountability(item);
      return `<tr><td><span class="transaction-primary">${A.escapeHtml(item.id)}</span></td><td>${A.escapeHtml(item.purpose)}</td><td>${new Date(`${item.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td><td>${A.money(item.amount)}</td><td>${A.money(item.actualExpenses)}</td><td class="text-green">${A.money(item.returned)}</td><td><span class="status status-${status.status.toLowerCase()}">${status.status}${status.amount ? ` · ${A.money(status.amount)} due` : ""}</span></td><td><span class="table-actions"><button class="icon-button" data-action="edit-advance" data-id="${A.escapeHtml(item.id)}" aria-label="Update ${A.escapeHtml(item.purpose)}">Update</button><button class="icon-button danger" data-action="delete-advance" data-id="${A.escapeHtml(item.id)}" aria-label="Delete ${A.escapeHtml(item.purpose)}">Delete</button></span></td></tr>`;
    }).join("");
    byId("advances-empty").classList.toggle("hidden", records.length > 0);
  }

  function openForm(advance) {
    const editing = Boolean(advance);
    A.openModal(`<div class="modal-header"><div><h2 id="modal-title">${editing ? "Update cash advance" : "Record cash advance"}</h2><p>Enter receipt-backed expenses and unspent cash returned.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div>
      <form id="advance-form"><div class="form-grid">
        <label class="field-label field-full">Activity or purpose<input name="purpose" required maxlength="120" value="${A.escapeHtml(advance?.purpose || "")}"></label>
        <label class="field-label">Amount advanced (₱)<input name="amount" type="number" min="0.01" step="0.01" required value="${Number(advance?.amount || "") || ""}"></label>
        <label class="field-label">Date issued<input name="date" type="date" required value="${A.escapeHtml(advance?.date || A.today())}"></label>
        <label class="field-label">Actual expenses with receipts (₱)<input name="actualExpenses" type="number" min="0" step="0.01" required value="${Number(advance?.actualExpenses || 0)}"></label>
        <label class="field-label">Unspent cash returned (₱)<input name="returned" type="number" min="0" step="0.01" required value="${Number(advance?.returned || 0)}"></label>
      </div><p class="form-hint">Expenses plus cash returned cannot exceed the amount advanced.</p><div class="form-actions"><button class="button button-secondary" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">${editing ? "Save accountability" : "Save advance"}</button></div></form>`);
    byId("advance-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const details = {
        purpose: values.get("purpose").trim(),
        amount: Number(values.get("amount")),
        date: values.get("date"),
        actualExpenses: Number(values.get("actualExpenses")),
        returned: Number(values.get("returned")),
      };
      if (A.roundMoney(details.actualExpenses + details.returned) > details.amount) {
        A.toast("Actual expenses and cash returned cannot exceed the advance.", "error");
        return;
      }
      if (editing) Object.assign(advance, details);
      else {
        const next = state.advances.reduce((max, item) => Math.max(max, Number(item.id.slice(4)) || 0), 0) + 1;
        state.advances.push({ id: `ADV-${String(next).padStart(4, "0")}`, ...details });
      }
      const saved = await A.save();
      A.closeModal();
      render();
      if (saved) A.toast(editing ? "Advance accountability updated." : "Cash advance recorded.");
    });
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const advance = state.advances.find((item) => item.id === button.dataset.id);
    if (button.dataset.action === "add-advance") openForm();
    if (button.dataset.action === "edit-advance" && advance) openForm(advance);
    if (button.dataset.action === "delete-advance" && advance && A.confirm(`Delete advance ${advance.id}? Its liquidated expenses and cash return will also be removed.`)) {
      state.advances.splice(state.advances.indexOf(advance), 1);
      const saved = await A.save();
      render();
      if (saved) A.toast("Cash advance deleted.");
    }
  });
  document.addEventListener("input", (event) => { if (event.target?.id === "advance-search") render(); });
  document.addEventListener("change", (event) => { if (event.target?.id === "advance-filter") render(); });
  A.pages["cash-advances"] = { render };
  A.ready.then(render);
})();
