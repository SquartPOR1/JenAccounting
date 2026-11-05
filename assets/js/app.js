(() => {
  let page = document.body.dataset.page || "dashboard";
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
  const pageFiles = {
    dashboard: "index.html",
    members: "pages/members.html",
    assessments: "pages/assessments.html",
    collections: "pages/collections.html",
    expenses: "pages/expenses.html",
    "cash-advances": "pages/cash-advances.html",
    reports: "pages/reports.html",
    settings: "pages/settings.html",
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
  const A = window.Accounting;
  const loadedScripts = new Set([page]);
  const rootUrl = new URL(inPagesPath(location.pathname) ? "../" : "./", location.href);
  function inPagesPath(path) { return String(path || "").toLowerCase().includes("/pages/"); }

  const fileFor = (key) => pageFiles[key] || pageFiles.dashboard;
  const urlFor = (key) => new URL(fileFor(key), rootUrl).href;
  const inPages = () => inPagesPath(location.pathname);
  const linkTo = (key) => {
    const files = { dashboard: "index.html", members: "members.html", assessments: "assessments.html", collections: "collections.html", expenses: "expenses.html", "cash-advances": "cash-advances.html", reports: "reports.html", settings: "settings.html" };
    if (key === "dashboard") return inPages() ? "../index.html" : "index.html";
    return inPages() ? files[key] : `pages/${files[key]}`;
  };
  const keyFromUrl = (href) => {
    const target = new URL(href, location.href);
    if (target.origin !== location.origin) return null;
    const path = target.pathname.toLowerCase().replace(/\/+$/, "");
    for (const [key, file] of Object.entries(pageFiles)) {
      if (path.endsWith(`/${file.toLowerCase()}`) || path.endsWith(file.toLowerCase())) return key;
    }
    if (!path.includes("/pages/") && (path.endsWith("/index.html") || path.endsWith("/jenaccounting") || path === "")) return "dashboard";
    return null;
  };
  const setActiveNav = (key) => {
    document.querySelectorAll(".nav-link[data-nav]").forEach((link) => {
      const active = link.dataset.nav === key;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };
  const loadPageScript = (key) => {
    if (loadedScripts.has(key) || !pageFiles[key]) return Promise.resolve();
    loadedScripts.add(key);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL(`assets/js/${key}.js`, rootUrl).href;
      script.onload = resolve;
      script.onerror = () => { loadedScripts.delete(key); reject(new Error(`Failed to load ${key}.js`)); };
      document.body.append(script);
    });
  };
  const animatePage = (container) => {
    if (!container || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    container.classList.remove("page-enter");
    void container.offsetWidth;
    container.classList.add("page-enter");
  };
  const navigate = async (href, push = true) => {
    const key = keyFromUrl(href);
    if (!key || key === page) return;
    const targetUrl = urlFor(key);
    const container = document.getElementById("page-content");
    if (!container) return;
    try {
      container.classList.add("page-leaving");
      const response = await fetch(targetUrl, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`Could not load ${pageTitles[key] || key}.`);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const content = doc.getElementById("page-content");
      if (!content) throw new Error("Page content not found.");
      container.replaceChildren(...Array.from(content.childNodes));
      page = key;
      document.body.dataset.page = key;
      document.title = doc.title || `${pageTitles[key]} · Ledgerly`;
      const crumb = document.querySelector(".breadcrumb strong");
      if (crumb) crumb.textContent = pageTitles[key] || key;
      setActiveNav(key);
      A.closeModal?.();
      document.getElementById("sidebar")?.classList.remove("is-open");
      container.scrollIntoView({ block: "start", behavior: "auto" });
      if (push) history.pushState({ page: key }, "", targetUrl);
      container.classList.remove("page-leaving");
      await loadPageScript(key);
      A.pages?.[key]?.render?.();
      animatePage(container);
    } catch (error) {
      container.classList.remove("page-leaving");
      console.error(error);
      A.toast?.(error.message || "Navigation failed.", "error");
    }
  };

  document.getElementById("sidebar").innerHTML = `
    <a class="brand" href="${linkTo("dashboard")}" aria-label="Ledgerly dashboard">
      <span class="brand-mark" aria-hidden="true">L</span>
      <span><span class="brand-name">Ledgerly</span><span class="brand-caption">ORGANIZATION FINANCE</span></span>
    </a>
    ${navGroups.map((group) => `<div class="nav-caption">${group.title}</div><nav class="side-nav" aria-label="${group.title.toLowerCase()}">${group.items.map(([key, title, icon]) =>
      `<a class="nav-link${page === key ? " active" : ""}" href="${linkTo(key)}" aria-label="${title}" data-tooltip="${title}" data-nav="${key}"${page === key ? ' aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icons[icon]}</span><span>${title}</span></a>`).join("")}</nav><div class="dock-divider" aria-hidden="true"></div>`).join("")}
    <div class="sidebar-bottom"><div class="demo-note"><strong>PHP / MySQL backend</strong>Organization data is shared through the configured server database.</div><div class="profile-row"><span class="avatar" aria-label="Treasurer" data-tooltip="Treasurer">TR</span><span><span class="profile-name">Treasurer</span><span class="profile-role">Organization admin</span></span></div></div>`;
  document.getElementById("topbar").innerHTML = `
    <button class="menu-toggle" type="button" aria-label="Open navigation menu" aria-expanded="false">☰</button>
    <div class="breadcrumb"><span>Workspace</span><span aria-hidden="true"> / </span><strong>${pageTitles[page]}</strong></div>
    <div class="topbar-right"><span class="topbar-clock" id="live-clock" aria-live="off"></span><span class="demo-indicator"><i aria-hidden="true"></i> <span id="backend-indicator">CONNECTING</span></span><span class="topbar-org" id="topbar-org"></span></div>`;
  const tickClock = () => {
    const clock = document.getElementById("live-clock");
    const dash = document.getElementById("today-label");
    const text = new Date().toLocaleString("en-PH", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    if (clock) clock.textContent = text;
    if (dash) dash.textContent = text;
  };
  tickClock();
  if (!window.__ledgerlyClock) window.__ledgerlyClock = window.setInterval(tickClock, 1000);
  else tickClock();
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
    const navLink = event.target.closest("a[href]");
    if (navLink && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && navLink.target !== "_blank") {
      const key = keyFromUrl(navLink.href);
      if (key) {
        event.preventDefault();
        document.getElementById("sidebar")?.classList.remove("is-open");
        navigate(navLink.href);
      }
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") document.getElementById("sidebar").classList.remove("is-open");
  });
  window.addEventListener("popstate", () => navigate(location.href, false));
  history.replaceState({ page }, "", location.href);
  animatePage(document.getElementById("page-content"));
})();
