(() => {
  const A = window.Accounting;
  const state = A.state;
  const byId = (id) => document.getElementById(id);

  function memberStatus(member) {
    const assessments = state.assessments.filter((item) => item.memberId === member.id);
    const paid = A.paymentFor(member.id);
    if (!assessments.length) return paid > 0 ? "Paid" : "Unpaid";
    return A.statusFor(A.sum(assessments), paid);
  }

  function render() {
    const search = byId("member-search");
    const table = byId("members-table");
    if (!search || !table) return;
    const query = search.value.trim().toLowerCase();
    const statusFilter = byId("member-status-filter").value;
    const members = state.members.filter((member) => {
      const status = memberStatus(member);
      return (!statusFilter || status === statusFilter) &&
        `${member.id} ${member.name} ${member.course} ${member.year} ${member.contact}`.toLowerCase().includes(query);
    });
    const paid = state.members.filter((member) => memberStatus(member) === "Paid").length;
    byId("member-total").textContent = String(state.members.length);
    byId("member-paid").textContent = String(paid);
    byId("member-pending").textContent = String(state.members.length - paid);
    byId("member-count").textContent = `${members.length} of ${state.members.length} members`;
    table.innerHTML = members.map((member) => {
      const initials = member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
      const status = memberStatus(member);
      return `<tr><td><span class="table-member"><span class="avatar">${A.escapeHtml(initials)}</span><span><span class="transaction-primary">${A.escapeHtml(member.name)}</span><span class="member-id">${A.escapeHtml(member.id)}</span></span></span></td><td>${A.escapeHtml(member.course)} · ${A.escapeHtml(member.year)}</td><td>${A.escapeHtml(member.contact)}</td><td>${A.money(member.fee)}</td><td><span class="status status-${status.toLowerCase()}">${status}</span></td><td><span class="table-actions"><button class="icon-button" data-action="edit-member" data-id="${A.escapeHtml(member.id)}" aria-label="Edit ${A.escapeHtml(member.name)}">Edit</button><button class="icon-button danger" data-action="delete-member" data-id="${A.escapeHtml(member.id)}" aria-label="Delete ${A.escapeHtml(member.name)}">Delete</button></span></td></tr>`;
    }).join("");
    byId("members-empty").classList.toggle("hidden", members.length > 0);
  }

  function openForm(member) {
    const editing = Boolean(member);
    A.openModal(`<div class="modal-header"><div><h2 id="modal-title">${editing ? "Edit member" : "Add a member"}</h2><p>Keep member details up to date.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div>
      <form id="member-form"><div class="form-grid">
        <label class="field-label field-full">Full name<input name="name" required maxlength="80" autocomplete="name" value="${A.escapeHtml(member?.name || "")}"></label>
        <label class="field-label">Course<select name="course" required><option value="">Select course</option>${["BSIT", "BSBA", "BSED", "BSHM", "BSCpE", "Other"].map((item) => `<option${member?.course === item ? " selected" : ""}>${item}</option>`).join("")}</select></label>
        <label class="field-label">Year level<select name="year" required><option value="">Select year</option>${["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"].map((item) => `<option${member?.year === item ? " selected" : ""}>${item}</option>`).join("")}</select></label>
        <label class="field-label">Contact number<input name="contact" type="tel" required minlength="7" maxlength="20" value="${A.escapeHtml(member?.contact || "")}"></label>
        <label class="field-label">Membership fee (₱)<input name="fee" type="number" min="0" step="0.01" required value="${Number(member?.fee ?? state.defaultFee)}"></label>
      </div><div class="form-actions"><button class="button button-secondary" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">${editing ? "Save changes" : "Add member"}</button></div></form>`);
    byId("member-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const details = { name: values.get("name").trim(), course: values.get("course"), year: values.get("year"), contact: values.get("contact").trim(), fee: Number(values.get("fee")) };
      if (editing) Object.assign(member, details);
      else {
        const nextId = state.members.reduce((max, item) => Math.max(max, Number(item.id.slice(4)) || 0), 0) + 1;
        state.members.push({ id: `MEM-${String(nextId).padStart(3, "0")}`, ...details });
      }
      const saved = await A.save();
      A.closeModal();
      render();
      if (saved) A.toast(editing ? "Member details updated." : "Member added to the roster.");
    });
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const member = state.members.find((item) => item.id === button.dataset.id);
    if (button.dataset.action === "add-member") openForm();
    if (button.dataset.action === "edit-member" && member) openForm(member);
    if (button.dataset.action === "delete-member" && member && A.confirm(`Remove ${member.name} from the roster? Historical assessments and receipts will be retained.`)) {
      state.members.splice(state.members.indexOf(member), 1);
      const saved = await A.save();
      render();
      if (saved) A.toast("Member removed. Historical transactions were retained.");
    }
  });
  document.addEventListener("input", (event) => { if (event.target?.id === "member-search") render(); });
  document.addEventListener("change", (event) => { if (event.target?.id === "member-status-filter") render(); });
  A.pages.members = { render };
  A.ready.then(render);
})();
