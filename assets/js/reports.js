(() => {
  const A = window.Accounting;
  const state = A.state;
  const byId = (id) => document.getElementById(id);
  const today = new Date();

  function controls() {
    const view = byId("report-view")?.value;
    if (!view) return;
    const period = byId("period-label");
    const month = byId("report-month");
    const custom = view === "custom";
    byId("from-label").classList.toggle("hidden", !custom);
    byId("to-label").classList.toggle("hidden", !custom);
    period.classList.toggle("hidden", custom);
    if (view === "annual") {
      period.firstChild.textContent = "Year";
      month.type = "number";
      month.min = "2000";
      month.max = "2100";
      month.value = String(today.getFullYear());
    } else if (view === "monthly") {
      period.firstChild.textContent = "Month";
      month.type = "month";
      month.removeAttribute("min");
      month.removeAttribute("max");
      if (!month.value.includes("-")) month.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    }
  }

  function dateRange() {
    const view = byId("report-view")?.value || "monthly";
    if (view === "custom") {
      return { from: byId("report-from").value || "0000-01-01", to: byId("report-to").value || "9999-12-31", label: "Custom date range" };
    }
    if (view === "annual") {
      const year = byId("report-month").value || String(today.getFullYear());
      return { from: `${year}-01-01`, to: `${year}-12-31`, label: `Annual financial summary · ${year}` };
    }
    const month = byId("report-month").value || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}`, label: `Monthly financial summary · ${new Date(year, monthNumber - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" })}` };
  }

  function render() {
    if (!byId("report-assessed")) return;
    controls();
    const range = dateRange();
    if (range.from > range.to) {
      A.toast("The report start date must be before its end date.", "error");
      return;
    }
    const selected = (items) => items.filter((item) => item.date >= range.from && item.date <= range.to);
    const throughEnd = (items) => items.filter((item) => item.date <= range.to);
    const assessmentsInRange = selected(state.assessments);
    const collectionsInRange = selected(state.collections);
    const expensesInRange = selected(state.expenses);
    const advancesThroughEnd = throughEnd(state.advances);
    const collectionsToDate = throughEnd(state.collections);
    const expensesToDate = throughEnd(state.expenses);
    const assessedToDate = throughEnd(state.assessments);
    const dueAtEnd = A.roundMoney(assessedToDate.reduce((total, assessment) =>
      total + Math.max(0, Number(assessment.amount) - A.sum(collectionsToDate.filter((item) => item.memberId === assessment.memberId))), 0));
    const advanceOutstanding = advancesThroughEnd.reduce((total, advance) => total + A.outstandingAdvance(advance), 0);
    const rangeAdvanceExpenses = selected(state.advances);
    const periodExpenses = A.sum(expensesInRange) + A.sum(rangeAdvanceExpenses, (item) => item.actualExpenses);
    const totalExpensesToDate = A.sum(expensesToDate) + A.sum(advancesThroughEnd, (item) => item.actualExpenses);
    const cashBalance = A.roundMoney(A.sum(collectionsToDate) - totalExpensesToDate - advanceOutstanding);
    const reportValues = {
      "report-assessed": A.money(A.sum(assessmentsInRange)),
      "report-collected": A.money(A.sum(collectionsInRange)),
      "report-outstanding": A.money(dueAtEnd),
      "report-expenses": A.money(periodExpenses),
      "report-advances": A.money(advanceOutstanding),
      "report-cash": A.money(cashBalance),
    };
    Object.entries(reportValues).forEach(([id, value]) => { byId(id).textContent = value; });
    byId("report-period-title").textContent = range.label;
    byId("report-org-name").textContent = state.organization || "Organization";
    byId("report-generated").textContent = `Generated ${new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
    window.currentFinancialReport = {
      range,
      values: {
        assessed: A.sum(assessmentsInRange),
        collected: A.sum(collectionsInRange),
        outstanding: dueAtEnd,
        expenses: periodExpenses,
        advances: advanceOutstanding,
        cash: cashBalance,
      },
    };
  }

  function exportReport() {
    const report = window.currentFinancialReport;
    if (!report) return;
    const rows = [
      ["Financial summary", report.range.label],
      ["Total membership fees assessed", report.values.assessed],
      ["Total actual collections", report.values.collected],
      ["Outstanding membership fees", report.values.outstanding],
      ["Total expenses", report.values.expenses],
      ["Outstanding cash advances", report.values.advances],
      ["Available cash balance", report.values.cash],
    ];
    const csv = rows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-report-${report.range.from}-to-${report.range.to}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    A.toast("Financial summary exported as CSV.");
  }

  document.addEventListener("change", (event) => {
    if (event.target?.id === "report-view") { controls(); render(); }
    if (["report-month", "report-from", "report-to"].includes(event.target?.id)) render();
  });
  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "print-report" && byId("report-assessed")) window.print();
    if (action === "export-report" && byId("report-assessed")) exportReport();
    if (event.target?.id === "apply-report" && byId("report-assessed")) render();
  });
  A.pages.reports = {
    render() {
      const month = byId("report-month");
      if (month && !month.value) month.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      controls();
      render();
    },
  };
  A.ready.then(() => A.pages.reports.render());
})();
