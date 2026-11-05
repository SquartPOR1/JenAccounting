(() => {
  const A = window.Accounting;
  const state = A.state;
  const byId = (id) => document.getElementById(id);

  function render() {
    const table = byId("collections-table");
    if (!table) return;
    const query = byId("collection-search").value.trim().toLowerCase();
    const method = byId("collection-method-filter").value;
    const from = byId("collection-from").value;
    const to = byId("collection-to").value;
    const records = [...state.collections].filter((item) => {
      const searchText = `${item.id} ${item.receipt} ${A.memberName(item.memberId)}`.toLowerCase();
      return searchText.includes(query) && (!method || item.method === method) && (!from || item.date >= from) && (!to || item.date <= to);
    }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const amount = A.sum(records);
    byId("collection-total").textContent = A.money(A.sum(state.collections));
    byId("collection-count").textContent = String(state.collections.length);
    byId("collection-average").textContent = A.money(state.collections.length ? A.sum(state.collections) / state.collections.length : 0);
    byId("collection-visible-count").textContent = `${records.length} shown · ${A.money(amount)}`;
    table.innerHTML = records.map((item) => `<tr><td><span class="transaction-primary">${A.escapeHtml(item.id)}</span></td><td>${A.escapeHtml(A.memberName(item.memberId))}<span class="member-id">${A.escapeHtml(item.memberId)}</span></td><td>${new Date(`${item.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td><td>${A.escapeHtml(item.method)}</td><td>${A.escapeHtml(item.receipt)}</td><td class="align-right">${A.money(item.amount)}</td><td class="align-right"><button class="button-link" data-action="view-receipt" data-id="${A.escapeHtml(item.id)}">Preview</button></td></tr>`).join("");
    byId("collections-empty").classList.toggle("hidden", records.length > 0);
  }

  function openForm() {
    if (!state.members.length) {
      A.toast("Add a member before recording a collection.", "error");
      return;
    }
    A.openModal(`<div class="modal-header"><div><h2 id="modal-title">Record collection</h2><p>Only received payments count as collected cash.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div>
      <form id="collection-form"><div class="form-grid">
        <label class="field-label field-full">Member<select name="memberId" required><option value="">Select a member</option>${state.members.map((member) => `<option value="${A.escapeHtml(member.id)}">${A.escapeHtml(member.name)} · ${A.escapeHtml(member.id)}</option>`).join("")}</select></label>
        <label class="field-label">Amount paid (₱)<input name="amount" type="number" min="0.01" step="0.01" required></label>
        <label class="field-label">Payment date<input name="date" type="date" value="${A.today()}" required></label>
        <label class="field-label field-full">Payment method<select name="method" required><option>Cash</option><option>GCash</option><option>Bank transfer</option></select></label>
      </div><div class="form-actions"><button class="button button-secondary" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">Save collection</button></div></form>`);
    byId("collection-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const next = state.collections.reduce((max, item) => Math.max(max, Number(item.id.slice(4)) || 0), 0) + 1;
      const receiptNumber = state.collections.reduce((max, item) => Math.max(max, Number(item.receipt.replace(/\D/g, "")) || 0), 26000) + 1;
      state.collections.push({
        id: `COL-${String(next).padStart(4, "0")}`,
        memberId: values.get("memberId"),
        amount: Number(values.get("amount")),
        date: values.get("date"),
        method: values.get("method"),
        receipt: `OR-${receiptNumber}`,
      });
      const saved = await A.save();
      A.closeModal();
      render();
      if (saved) A.toast("Collection recorded and included in available cash.");
    });
  }

  function previewReceipt(item) {
    A.openModal(`<div class="modal-header"><div><h2 id="modal-title">Receipt preview</h2><p>Collection receipt.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div>
      <div class="receipt-preview"><h3>${A.escapeHtml(state.organization)}</h3><p>Official receipt · ${A.escapeHtml(item.receipt)}</p><dl>
        <dt>Transaction ID</dt><dd>${A.escapeHtml(item.id)}</dd><dt>Received from</dt><dd>${A.escapeHtml(A.memberName(item.memberId))}</dd>
        <dt>Date</dt><dd>${new Date(`${item.date}T12:00:00`).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</dd>
        <dt>Payment method</dt><dd>${A.escapeHtml(item.method)}</dd><dt class="receipt-total">Amount received</dt><dd class="receipt-total">${A.money(item.amount)}</dd></dl></div>
      <div class="form-actions"><button class="button button-secondary" type="button" data-action="close-modal">Close</button></div>`);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "add-collection") openForm();
    if (button.dataset.action === "view-receipt") {
      const item = state.collections.find((record) => record.id === button.dataset.id);
      if (item) previewReceipt(item);
    }
  });
  document.addEventListener("input", (event) => {
    if (["collection-search", "collection-method-filter", "collection-from", "collection-to"].includes(event.target?.id)) render();
  });
  document.addEventListener("change", (event) => {
    if (["collection-method-filter", "collection-from", "collection-to"].includes(event.target?.id)) render();
  });
  A.pages.collections = { render };
  A.ready.then(render);
})();
