(() => {
  function createEmptyState() {
    return {
      organization: "Organization",
      defaultFee: 0,
      members: [],
      assessments: [],
      collections: [],
      expenses: [],
      advances: [],
    };
  }

  let state = createEmptyState();
  let version = 0;
  let persistedState = JSON.parse(JSON.stringify(state));
  let backendAvailable = true;
  const apiUrl = new URL("../../api/state.php", document.currentScript.src);
  document.body.classList.add("data-loading");
  const money = (amount) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(amount) || 0);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const cents = (value) => Math.round((Number(value) + Number.EPSILON) * 100) || 0;
  const fromCents = (value) => value / 100;
  const roundMoney = (value) => fromCents(cents(value));
  const sum = (items, select = (item) => item.amount) =>
    fromCents(items.reduce((total, item) => total + cents(select(item)), 0));
  const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const memberName = (id) => state.members.find((member) => member.id === id)?.name || "Former member";

  function paymentFor(memberId) {
    return sum(state.collections.filter((item) => item.memberId === memberId));
  }

  function statusFor(assessed, paid) {
    if (paid >= assessed) return "Paid";
    return paid > 0 ? "Partial" : "Unpaid";
  }

  function outstandingAdvance(advance) {
    return fromCents(Math.max(0, cents(advance.amount) - cents(advance.actualExpenses) - cents(advance.returned)));
  }

  function totals(source = state) {
    const assessed = sum(source.assessments);
    const collected = sum(source.collections);
    const outstanding = fromCents(source.assessments.reduce((total, assessment) =>
      total + Math.max(0, cents(assessment.amount) - cents(sum(source.collections.filter((item) => item.memberId === assessment.memberId)))), 0));
    const directExpenses = sum(source.expenses);
    const advanceExpenses = sum(source.advances, (advance) => advance.actualExpenses);
    const expenses = directExpenses + advanceExpenses;
    const advances = source.advances.reduce((total, advance) => total + outstandingAdvance(advance), 0);
    const returned = sum(source.advances, (advance) => advance.returned);
    return { assessed, collected, outstanding, directExpenses, advanceExpenses, expenses, advances, returned, cash: roundMoney(collected - expenses - advances) };
  }

  function replaceState(next) {
    if (next === state) return;
    const replacement = { ...next };
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, replacement);
  }

  async function request(method, body) {
    try {
      const response = await fetch(apiUrl, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json();
      if (!response.ok) {
        const error = new Error(result.error || `Backend request failed (${response.status}).`);
        error.status = response.status;
        throw error;
      }
      return result;
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error("The backend returned an invalid response.");
      throw error;
    }
  }

  async function initialize() {
    try {
      const result = await request("GET");
      if (result.state) {
        replaceState(result.state);
        version = result.version;
      } else {
        replaceState(createEmptyState());
        const created = await request("PUT", { version: 0, state });
        version = created.version;
      }
      persistedState = JSON.parse(JSON.stringify(state));
      return true;
    } catch (error) {
      if (error.status === 409) {
        try {
          const result = await request("GET");
          if (result.state) {
            replaceState(result.state);
            version = result.version;
            persistedState = JSON.parse(JSON.stringify(state));
            return true;
          }
        } catch (reloadError) {
          console.error("Could not load the shared database state:", reloadError);
        }
      }
      backendAvailable = false;
      console.error("Could not connect to the PHP/MySQL backend:", error);
      return false;
    }
  }

  async function save() {
    if (!backendAvailable) {
      toast("The backend is unavailable. Changes were not saved.", "error");
      replaceState(persistedState);
      return false;
    }
    try {
      const result = await request("PUT", { version, state });
      version = result.version;
      persistedState = JSON.parse(JSON.stringify(state));
      return true;
    } catch (error) {
      console.error("Could not save shared database data:", error);
      if (error.status === 409) {
        try {
          const latest = await request("GET");
          if (latest.state) {
            replaceState(latest.state);
            version = latest.version;
            persistedState = JSON.parse(JSON.stringify(state));
          }
          toast("Another session changed the data. The latest saved version was loaded; please retry your change.", "error");
        } catch (reloadError) {
          console.error("Could not reload the latest database state:", reloadError);
          backendAvailable = false;
          replaceState(persistedState);
          toast("The save conflicted and the latest data could not be loaded.", "error");
        }
      } else {
        replaceState(persistedState);
        if (!error.status || error.status >= 500) backendAvailable = false;
        toast(error.message || "Changes could not be saved.", "error");
      }
      return false;
    }
  }

  function toast(message, type = "success") {
    const region = document.getElementById("toast-region");
    if (!region) return;
    const item = document.createElement("div");
    item.className = `toast${type === "error" ? " error" : ""}`;
    item.setAttribute("role", "status");
    item.textContent = message;
    region.append(item);
    window.setTimeout(() => item.remove(), 3600);
  }

  function openModal(content) {
    const dialog = document.getElementById("app-modal");
    const target = document.getElementById("modal-content");
    if (!dialog || !target) return;
    target.innerHTML = content;
    dialog.showModal();
  }

  function closeModal() {
    document.getElementById("app-modal")?.close();
  }

  function confirm(message) {
    return window.confirm(message);
  }

  async function saveAndRefresh(message, render) {
    await save();
    closeModal();
    if (render) render();
    toast(message);
  }

  window.Accounting = {
    get state() { return state; },
    get backendAvailable() { return backendAvailable; },
    pages: {},
    ready: null,
    save,
    money,
    escapeHtml,
    roundMoney,
    today,
    sum,
    totals,
    memberName,
    paymentFor,
    statusFor,
    outstandingAdvance,
    toast,
    openModal,
    closeModal,
    confirm,
    saveAndRefresh,
  };
  window.Accounting.ready = initialize();
})();
