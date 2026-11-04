(() => {
  const A = window.Accounting;
  const form = document.getElementById("organization-form");
  const fillForm = () => {
    form.elements.organization.value = A.state.organization || "";
    form.elements.fee.value = Number(A.state.defaultFee ?? 0);
    document.getElementById("member-record-count").textContent = String(A.state.members.length);
  };
  A.ready.then(fillForm);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
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
