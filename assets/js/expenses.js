(() => {
  const A = window.Accounting;
  const state = A.state;
  const byId = (id) => document.getElementById(id);
  const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  const maxFileSize = 2 * 1024 * 1024;

  function render() {
    const query = byId("expense-search").value.trim().toLowerCase();
    const category = byId("expense-category-filter").value;
    const records = [...state.expenses].filter((item) =>
      `${item.id} ${item.description} ${item.category} ${item.recordedBy}`.toLowerCase().includes(query) &&
      (!category || item.category === category)).sort((a, b) => b.date.localeCompare(a.date));
    byId("expense-total").textContent = A.money(A.totals().expenses);
    byId("expense-direct").textContent = A.money(A.totals().directExpenses);
    byId("expense-documents").textContent = String(state.expenses.filter((item) => item.document?.name).length);
    byId("expense-count").textContent = `${records.length} of ${state.expenses.length} direct expenses`;
    byId("expenses-table").innerHTML = records.map((item) => `<tr><td><span class="transaction-primary">${A.escapeHtml(item.description)}</span><span class="member-id">${A.escapeHtml(item.id)}</span></td><td>${A.escapeHtml(item.category)}</td><td>${new Date(`${item.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td><td>${A.escapeHtml(item.recordedBy)}</td><td>${item.document?.name ? `<button class="button-link" data-action="view-document" data-id="${A.escapeHtml(item.id)}">${A.escapeHtml(item.document.name)}</button>` : '<span class="muted">—</span>'}</td><td class="align-right">${A.money(item.amount)}</td><td><span class="table-actions"><button class="icon-button" data-action="edit-expense" data-id="${A.escapeHtml(item.id)}" aria-label="Edit ${A.escapeHtml(item.description)}">Edit</button><button class="icon-button danger" data-action="delete-expense" data-id="${A.escapeHtml(item.id)}" aria-label="Delete ${A.escapeHtml(item.description)}">Delete</button></span></td></tr>`).join("");
    byId("expenses-empty").classList.toggle("hidden", records.length > 0);
  }

  function openForm(expense) {
    const editing = Boolean(expense);
    A.openModal(`<div class="modal-header"><div><h2 id="modal-title">${editing ? "Edit expense" : "Add expense"}</h2><p>Attach a receipt or other supporting document (2 MB max).</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div>
      <form id="expense-form"><div class="form-grid">
        <label class="field-label field-full">Description<input name="description" required maxlength="120" value="${A.escapeHtml(expense?.description || "")}"></label>
        <label class="field-label">Category<select name="category" required>${["Events", "Supplies", "Transportation", "Food", "Other"].map((item) => `<option${expense?.category === item ? " selected" : ""}>${item}</option>`).join("")}</select></label>
        <label class="field-label">Amount (₱)<input name="amount" type="number" min="0.01" step="0.01" required value="${Number(expense?.amount || "") || ""}"></label>
        <label class="field-label">Expense date<input name="date" type="date" value="${A.escapeHtml(expense?.date || A.today())}" required></label>
        <label class="field-label">Recorded by<input name="recordedBy" required maxlength="80" value="${A.escapeHtml(expense?.recordedBy || "Treasurer")}"></label>
        <label class="field-label field-full">Supporting document<input name="document" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"><small>${expense?.document?.name ? `Current file: ${A.escapeHtml(expense.document.name)}` : "PDF, JPG, PNG, or WEBP."}</small></label>
      </div><div class="form-actions"><button class="button button-secondary" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">${editing ? "Save changes" : "Save expense"}</button></div></form>`);
    byId("expense-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const file = values.get("document");
      let documentRecord = expense?.document || null;
      if (file?.size) {
        if (!supportedTypes.includes(file.type) || file.size > maxFileSize) {
          A.toast("Choose a PDF, JPG, PNG, or WEBP file no larger than 2 MB.", "error");
          return;
        }
        try {
          documentRecord = { name: file.name, type: file.type, data: await readFile(file) };
        } catch (error) {
          console.error("Could not read the selected receipt:", error);
          A.toast("The supporting document could not be read.", "error");
          return;
        }
      }
      const valuesRecord = {
        description: values.get("description").trim(),
        category: values.get("category"),
        amount: Number(values.get("amount")),
        date: values.get("date"),
        recordedBy: values.get("recordedBy").trim(),
        document: documentRecord,
      };
      if (editing) Object.assign(expense, valuesRecord);
      else {
        const next = state.expenses.reduce((max, item) => Math.max(max, Number(item.id.slice(4)) || 0), 0) + 1;
        state.expenses.push({ id: `EXP-${String(next).padStart(4, "0")}`, ...valuesRecord });
      }
      const saved = await A.save();
      A.closeModal();
      render();
      if (saved) A.toast(editing ? "Expense updated." : "Expense recorded.");
    });
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("File read failed."));
      reader.readAsDataURL(file);
    });
  }

  function showDocument(expense) {
    const doc = expense.document;
    if (!doc?.data || !supportedTypes.includes(doc.type)) {
      A.toast("This attachment is not available in the saved data.", "error");
      return;
    }
    const safeData = String(doc.data);
    const validData = doc.type === "application/pdf"
      ? safeData.startsWith("data:application/pdf;base64,")
      : safeData.startsWith(`data:${doc.type};base64,`);
    if (!validData) {
      A.toast("The saved attachment could not be previewed.", "error");
      return;
    }
    const preview = doc.type === "application/pdf"
      ? `<iframe class="document-frame" title="Supporting document preview" src="${A.escapeHtml(safeData)}"></iframe>`
      : `<img class="document-preview" alt="Supporting document ${A.escapeHtml(doc.name)}" src="${A.escapeHtml(safeData)}">`;
    A.openModal(`<div class="modal-header"><div><h2 id="modal-title">Supporting document</h2><p>${A.escapeHtml(doc.name)}</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div>${preview}<div class="form-actions"><button class="button button-secondary" type="button" data-action="close-modal">Close</button><a class="button button-primary" href="${A.escapeHtml(safeData)}" download="${A.escapeHtml(doc.name)}">Download</a></div>`);
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const expense = state.expenses.find((item) => item.id === button.dataset.id);
    if (button.dataset.action === "add-expense") openForm();
    if (button.dataset.action === "edit-expense" && expense) openForm(expense);
    if (button.dataset.action === "view-document" && expense) showDocument(expense);
    if (button.dataset.action === "delete-expense" && expense && A.confirm(`Delete the expense “${expense.description}”?`)) {
      state.expenses.splice(state.expenses.indexOf(expense), 1);
      const saved = await A.save();
      render();
      if (saved) A.toast("Expense deleted.");
    }
  });
  byId("expense-search").addEventListener("input", render);
  byId("expense-category-filter").addEventListener("change", render);
  A.ready.then(render);
})();
