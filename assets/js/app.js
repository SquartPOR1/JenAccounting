(() => {
  const page = document.body.dataset.page || "dashboard";
  const pageTitles = {
    dashboard: "Dashboard",
    members: "Members",
    assessments: "Fee assessment",
    collections: "Collections",
    expenses: "Expenses",
    "cash-advances": "Cash advances",
    reports: "Financial reports",
    settings: "Settings",
  };
  const navGroups = [
    { title: "WORKSPACE", items: [
      ["dashboard", "Dashboard", "dashboard"],
      ["members", "Members", "members"],
      ["assessments", "Fee assessment", "assessment"],
    ] },
    { title: "TRANSACTIONS", items: [
      ["collections", "Collections", "collections"],
      ["expenses", "Expenses", "expenses"],
      ["cash-advances", "Cash advances", "advances"],
    ] },
    { title: "INSIGHTS", items: [
      ["reports", "Financial reports", "reports"],
      ["settings", "Settings", "settings"],
    ] },
  ];
  const icons = {
    dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>',
    members: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.8 20v-1.6a5.6 5.6 0 0 1 5.6-5.6h1.2a5.6 5.6 0 0 1 5.6 5.6V20M16 4.8a3.5 3.5 0 0 1 0 6.7M17.5 13a5 5 0 0 1 3.7 4.8V20"/></svg>',
    assessment: '<svg viewBox="0 0 24 24"><path d="M6 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5Z"/><path d="M14 4v4h4M8.5 12h7M8.5 16h7"/></svg>',
    collections: '<svg viewBox="0 0 24 24"><path d="M4 17.5 9 12l3.5 3.5L20 7"/><path d="M14.5 7H20v5.5"/></svg>',
    expenses: '<svg viewBox="0 0 24 24"><path d="M4 7.5h16M6.5 4v7M17.5 4v7M6 12.5h12l1 7.5H5l1-7.5Z"/><path d="M9 16h6"/></svg>',
    advances: '<svg viewBox="0 0 24 24"><path d="M4 8h14M14 4l4 4-4 4M20 16H6m4-4-4 4 4 4"/></svg>',
    reports: '<svg viewBox="0 0 24 24"><path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><path d="m9.5 3.5.5-1h4l.5 1 1.8 1 .9-.3 2 3.5-.7.8v2l.7.8-2 3.5-.9-.3-1.8 1-.5 1h-4l-.5-1-1.8-1-.9.3-2-3.5.7-.8v-2l-.7-.8 2-3.5.9.3 1.8-1Z" transform="translate(0 3) scale(1 .75)"/><circle cx="12" cy="12" r="3"/></svg>',
  };
  const inPages = location.pathname.toLowerCase().includes("/pages/");
  const linkTo = (key) => {
    const files = { dashboard: "index.html", members: "members.html", assessments: "assessments.html", collections: "collections.html", expenses: "expenses.html", "cash-advances": "cash-advances.html", reports: "reports.html", settings: "settings.html" };
    if (key === "dashboard") return inPages ? "../index.html" : "index.html";
    return inPages ? files[key] : `pages/${files[key]}`;
  };
  const A = window.Accounting;

  document.getElementById("sidebar").innerHTML = `
    <a class="brand" href="${linkTo("dashboard")}" aria-label="Ledgerly dashboard">
      <span class="brand-mark" aria-hidden="true">L</span>
      <span><span class="brand-name">Ledgerly</span><span class="brand-caption">ORGANIZATION FINANCE</span></span>
    </a>
    ${navGroups.map((group) => `<div class="nav-caption">${group.title}</div><nav class="side-nav" aria-label="${group.title.toLowerCase()}">${group.items.map(([key, title, icon]) =>
      `<a class="nav-link${page === key ? " active" : ""}" href="${linkTo(key)}" aria-label="${title}" data-tooltip="${title}"${page === key ? ' aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icons[icon]}</span><span>${title}</span></a>`).join("")}</nav><div class="dock-divider" aria-hidden="true"></div>`).join("")}
    <div class="sidebar-bottom"><div class="demo-note"><strong>PHP / MySQL backend</strong>Organization data is shared through the configured server database.</div><div class="profile-row"><span class="avatar" aria-label="Treasurer" data-tooltip="Treasurer">TR</span><span><span class="profile-name">Treasurer</span><span class="profile-role">Organization admin</span></span></div></div>`;
  document.getElementById("topbar").innerHTML = `
    <button class="menu-toggle" type="button" aria-label="Open navigation menu" aria-expanded="false">☰</button>
    <div class="breadcrumb"><span>Workspace</span><span aria-hidden="true"> / </span><strong>${pageTitles[page]}</strong></div>
    <div class="topbar-right"><span class="demo-indicator"><i aria-hidden="true"></i> <span id="backend-indicator">CONNECTING</span></span><span class="topbar-org" id="topbar-org"></span></div>`;
  const orgLabel = document.getElementById("topbar-org");
  if (orgLabel) orgLabel.textContent = A.state.organization || "Organization";
  A.ready.then((connected) => {
    document.body.classList.remove("data-loading");
    const backendLabel = document.getElementById("backend-status");
    const indicator = document.getElementById("backend-indicator");
    if (backendLabel) backendLabel.textContent = connected ? "Connected" : "Unavailable — read only";
    if (indicator) indicator.textContent = connected ? "SERVER DATA" : "OFFLINE";
    if (orgLabel) orgLabel.textContent = A.state.organization || "Organization";
    if (!connected) A.toast("Could not connect to the PHP/MySQL backend. Data is read-only until the connection is restored.", "error");
  });

  const menuToggle = document.querySelector(".menu-toggle");
  menuToggle?.addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const open = sidebar.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='close-modal']")) A.closeModal();
    if (event.target === document.getElementById("app-modal")) A.closeModal();
    if (event.target.closest(".nav-link")) document.getElementById("sidebar").classList.remove("is-open");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") document.getElementById("sidebar").classList.remove("is-open");
  });
})();
