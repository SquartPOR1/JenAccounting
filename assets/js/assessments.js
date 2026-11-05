(() => {
  const A = window.Accounting;
  const state = A.state;
  const byId = (id) => document.getElementById(id);

  function paymentStatus(assessment) {
    const memberAssessments = state.assessments.filter((item) => item.memberId === assessment.memberId);
    const totalAssessed = A.sum(memberAssessments);
    const paid = A.paymentFor(assessment.memberId);
    return { paid: Math.min(Number(assessment.amount), Math.max(0, paid - (totalAssessed - Number(assessment.amount)))), due: Math.max(0, Number(assessment.amount) - paid), status: A.statusFor(totalAssessed, paid) };
  }

  function render() {
    const table = byId("assessments-table");
    if (!table) return;
    const totals = A.totals();
    byId("assessment-total").textContent = A.money(totals.assessed);
    byId("assessment-paid").textContent = A.money(totals.collected);
    byId("assessment-due").textContent = A.money(totals.outstanding);
    const query = byId("assessment-search").value.trim().toLowerCase();
    const filter = byId("assessment-filter").value;
    const records = state.assessments.filter((item) => {
      const status = paymentStatus(item).status;
      return (!filter || status === filter) && `${item.id} ${A.memberName(item.memberId)}`.toLowerCase().includes(query);
    });
    byId("assessment-count").textContent = `${records.length} of ${state.assessments.length} assessments`;
    table.innerHTML = records.map((item) => {
      const details = paymentStatus(item);
      return `<tr><td><span class="transaction-primary">${A.escapeHtml(item.id)}</span></td><td>${A.escapeHtml(A.memberName(item.memberId))}<span class="member-id">${A.escapeHtml(item.memberId)}</span></td><td>${new Date(`${item.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td><td>${A.money(item.amount)}</td><td>${A.money(details.paid)}</td><td class="${details.due ? "text-amber" : "text-green"}">${A.money(details.due)}</td><td><span class="status status-${details.status.toLowerCase()}">${details.status}</span></td></tr>`;
    }).join("");
    byId("assessments-empty").classList.toggle("hidden", records.length > 0);
  }

  function assessForm() {
    const assessedIds = new Set(state.assessments.map((item) => item.memberId));
    const available = state.members.filter((member) => !assessedIds.has(member.id));
    if (!available.length) {
      A.toast("All current members already have an assessment.", "error");
      return;
    }
    A.openModal(`<div class="modal-header"><div><h2 id="modal-title">Assess membership fee</h2><p>Create a fee assessment for one member.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div>
      <form id="assessment-form"><div class="form-grid">
        <label class="field-label field-full">Member<select name="memberId" required><option value="">Select an unassessed member</option>${available.map((member) => `<option value="${A.escapeHtml(member.id)}">${A.escapeHtml(member.name)} · ${A.escapeHtml(member.id)}</option>`).join("")}</select></label>
        <label class="field-label">Fee amount (₱)<input name="amount" type="number" min="0.01" step="0.01" value="${Number(state.defaultFee)}" required></label>
        <label class="field-label">Assessment date<input name="date" type="date" value="${A.today()}" required></label>
      </div><p class="form-hint">An assessment is recorded separately from a collection.</p><div class="form-actions"><button class="button button-secondary" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">Create assessment</button></div></form>`);
    byId("assessment-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const memberId = values.get("memberId");
      if (state.assessments.some((item) => item.memberId === memberId)) {
        A.toast("This member already has an assessment.", "error");
        return;
      }
      const next = state.assessments.reduce((max, item) => Math.max(max, Number(item.id.slice(4)) || 0), 0) + 1;
      state.assessments.push({ id: `ASM-${String(next).padStart(3, "0")}`, memberId, amount: Number(values.get("amount")), date: values.get("date") });
      const saved = await A.save();
      A.closeModal();
      render();
      if (saved) A.toast("Membership fee assessed.");
    });
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='assess-fees']")) assessForm();
  });
  document.addEventListener("input", (event) => { if (event.target?.id === "assessment-search") render(); });
  document.addEventListener("change", (event) => { if (event.target?.id === "assessment-filter") render(); });
  A.pages.assessments = { render };
  A.ready.then(render);
})();
