(() => {
  const A = window.Accounting;
  const fillForm = () => {
    const form = document.getElementById("organization-form");
    if (!form) return;
    form.elements.organization.value = A.state.organization || "";
    form.elements.fee.value = Number(A.state.defaultFee ?? 0);
    const count = document.getElementById("member-record-count");
    if (count) count.textContent = String(A.state.members.length);
  };
  A.pages.settings = { render: fillForm };
  A.ready.then(fillForm);
  document.addEventListener("submit", async (event) => {
    if (event.target?.id !== "organization-form") return;
    event.preventDefault();
    const form = event.target;
    if (!form.reportValidity()) return;
    A.state.organization = form.elements.organization.value.trim();
    A.state.defaultFee = Number(form.elements.fee.value);
    const saved = await A.save();
    fillForm();
    const label = document.getElementById("topbar-org");
    if (label) label.textContent = A.state.organization;
    if (saved) A.toast("Organization settings saved.");
  });
})();
