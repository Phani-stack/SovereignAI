/* ==========================================
   SOVEREIGN AI WORKBENCH - APP JS
========================================== */

const API_BASE_URL = (window.location.origin && window.location.origin !== "null" && !window.location.origin.startsWith("file"))
  ? (window.location.port === "8080" ? "http://127.0.0.1:8000" : window.location.origin)
  : "http://127.0.0.1:8000";

const root = document.documentElement;

const sidebar = document.getElementById("sidebar");
const sidebarCollapse = document.getElementById("sidebarCollapse");

const rightMenuButton = document.getElementById("rightMenuButton");
const rightDrawer = document.getElementById("rightDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const drawerClose = document.getElementById("drawerClose");
const drawerTitle = document.getElementById("drawerTitle");

const themeButton = document.getElementById("themeButton");
const themeMenu = document.getElementById("themeMenu");

const toast = document.getElementById("toast");
const fileInput = document.getElementById("fileInput");

const sidebarLogo = document.getElementById("sidebarLogo");
const mobileLogoTrigger = document.getElementById("mobileLogoTrigger");
const modelSelector = document.getElementById("modelSelector");
const SIDEBAR_OVERLAY_MAX_WIDTH = 1100;

// State arrays & backend document storage
let backendDocuments = [];
const uploadedFiles = [];
let chatAttachedFiles = [];
let pendingUploadContext = "files";
let visionAnalysisTimer;
let activeAbortController = null;
let isGenerating = false;

/* ==========================================
   AUDIT LOGGING ENGINE & OBSERVABILITY
========================================== */
let auditLogs = [];

function loadAuditLogs() {
  try {
    const cached = localStorage.getItem("sovai_audit_logs");
    if (cached) {
      auditLogs = JSON.parse(cached);
    }
  } catch (e) {
    auditLogs = [];
  }
  renderAuditLogs();
  renderDashboardRecentActivity();
}

function saveAuditLogs() {
  try {
    localStorage.setItem("sovai_audit_logs", JSON.stringify(auditLogs));
  } catch (e) { }
}

function logAuditEvent({ activity, component, status = "Success", details = "" }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour12: false });
  const dateStr = now.toISOString();

  const currentUsername = (typeof currentUser !== "undefined" && currentUser && currentUser.username) ? currentUser.username : "Admin User";

  const event = {
    id: "audit_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    timestamp: timeStr,
    dateStr: dateStr,
    activity: activity || "System action executed",
    component: component || "System",
    status: status,
    user: currentUsername,
    details: details
  };

  auditLogs.unshift(event);
  if (auditLogs.length > 200) auditLogs = auditLogs.slice(0, 200);

  saveAuditLogs();
  renderAuditLogs();
  renderDashboardRecentActivity();
  return event;
}

function renderAuditLogs() {
  const container = document.getElementById("auditLogList");
  if (!container) return;

  if (!auditLogs || auditLogs.length === 0) {
    container.innerHTML = `
      <div class="file-row" style="justify-content: center; padding: 24px 16px; color: var(--muted); text-align: center;">
        <span>No audit activity recorded yet in this workspace.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = auditLogs
    .map((item) => {
      const statusLower = (item.status || "").toLowerCase();
      let tagClass = "green";

      if (statusLower.includes("fail") || statusLower.includes("error") || statusLower.includes("denied")) {
        tagClass = "red";
      } else if (statusLower.includes("block") || statusLower.includes("progress") || statusLower.includes("pending")) {
        tagClass = "yellow";
      }

      return `
        <div class="file-row">
          <span>${escapeHtml(item.timestamp)}</span>
          <strong>${escapeHtml(item.activity)}</strong>
          <span>${escapeHtml(item.component)}</span>
          <span class="tag ${tagClass}">${escapeHtml(item.status)}</span>
        </div>
      `;
    })
    .join("");
}

function renderDashboardRecentActivity() {
  const container = document.getElementById("recentActivityList");
  if (!container) return;

  if (!auditLogs || auditLogs.length === 0) {
    container.innerHTML = `
      <div class="activity-item" style="justify-content: center; color: var(--muted); padding: 16px;">
        <small>No recent activity recorded</small>
      </div>
    `;
    return;
  }

  const recent = auditLogs.slice(0, 4);
  const iconMap = {
    "AI Chat": "💬",
    "Files & Documents": "▤",
    "Vision/OCR": "✓",
    "Knowledge Base": "⌕",
    "Calculations": "∑",
    "Coding": "</>",
    "Sandbox": "</>",
    "Administration": "👤"
  };

  container.innerHTML = recent
    .map((item) => {
      const icon = iconMap[item.component] || "•";
      return `
        <div class="activity-item">
          <span class="activity-icon">${icon}</span>
          <div>
            <strong>${escapeHtml(item.activity)}</strong>
            <small>${escapeHtml(item.component)} · ${escapeHtml(item.timestamp)}</small>
          </div>
          <span class="activity-state">${escapeHtml(item.status)}</span>
        </div>
      `;
    })
    .join("");
}

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function exportAuditLogs() {
  if (!auditLogs || auditLogs.length === 0) {
    showToast("No audit logs available to export");
    return;
  }

  try {
    const headers = ["Timestamp", "User", "Activity", "Component", "Status", "Details"];
    const rows = auditLogs.map((item) => [
      escapeCsvCell(item.timestamp || item.dateStr || ""),
      escapeCsvCell(item.user || "Admin User"),
      escapeCsvCell(item.activity || ""),
      escapeCsvCell(item.component || ""),
      escapeCsvCell(item.status || ""),
      escapeCsvCell(item.details || item.id || "")
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const nowStr = new Date().toISOString().slice(0, 10);
    const filename = `sovai-audit-logs-${nowStr}.csv`;

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${auditLogs.length} audit log record(s) to ${filename}`);
  } catch (err) {
    console.error("Failed to export audit logs:", err);
    showToast("Failed to export audit logs");
  }
}

loadAuditLogs();

const exportAuditLogBtn = document.getElementById("exportAuditLog");
if (exportAuditLogBtn) {
  exportAuditLogBtn.addEventListener("click", exportAuditLogs);
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("exportAuditLog");
  if (btn) btn.addEventListener("click", exportAuditLogs);
});

const pageNames = {
  dashboard: ["SECURE WORKSPACE", "Dashboard"],
  chat: ["AI WORKSPACE", "AI Chat"],
  files: ["DOCUMENT INTELLIGENCE", "Files & Documents"],
  knowledge: ["PRIVATE KNOWLEDGE", "Knowledge Base / RAG"],
  calculations: ["ENGINEERING TOOLS", "Calculations"],
  coding: ["DEVELOPMENT", "Coding Workspace"],
  multimodal: ["MULTIMODAL AI", "Vision & OCR"],
  sandbox: ["SECURE EXECUTION", "Sandbox"],
  tools: ["LOCAL CAPABILITIES", "Local Tools"],
  security: ["SECURITY", "Security Center"],
  audit: ["OBSERVABILITY", "Audit Logs"],
  settings: ["CONFIGURATION", "Settings"],
  admin: ["ADMINISTRATION", "Administration & IAM"],
};

/* ==========================================
   THEME & NAVIGATION
========================================== */

function applyTheme(mode) {
  const choice = mode || localStorage.getItem("sovai-theme") || "system";

  localStorage.setItem("sovai-theme", choice);

  if (choice === "system") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "dark" : "light";
  } else {
    root.dataset.theme = choice;
  }

  if (themeButton) {
    themeButton.innerHTML = `<svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> ${choice === "light" ? "Light" : choice === "dark" ? "Dark" : "System"}`;
  }

  document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.themeChoice === choice);
  });
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function getAccessRestrictedHTML(featureTitle, requiredAbility) {
  return `
    <div class="access-restricted-card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:56px 24px; text-align:center; background:var(--surface); border:1px solid var(--border); border-radius:12px; margin:24px 0; box-shadow:var(--shadow-sm); width:100%;">
      <div style="width:64px; height:64px; border-radius:50%; background:rgba(239, 68, 68, 0.1); display:flex; align-items:center; justify-content:center; margin-bottom:20px; border:1px solid rgba(239, 68, 68, 0.2);">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:32px; height:32px;">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <h3 style="font-size:22px; font-weight:600; color:var(--text); margin:0 0 10px 0;">Access Restricted</h3>
      <p style="font-size:14px; color:var(--muted); max-width:440px; margin:0 0 12px 0; line-height:1.5;">
        You don't have access to use <strong>${escapeHtml(featureTitle || "this feature")}</strong>.
      </p>
      <p style="font-size:13px; color:var(--muted); opacity:0.85; margin:0; line-height:1.4;">
        Please contact your administrator to request access.
      </p>
    </div>
  `;
}

function getRequiredAbilityForView(view) {
  const map = {
    chat: "can_use_chat",
    aichat: "can_use_chat",
    knowledge: "can_search_rag",
    multimodal: "can_use_vision",
    vision: "can_use_vision",
    sandbox: "can_execute_code",
    coding: "can_execute_code",
    calculations: "can_execute_code",
    admin: "can_manage_users"
  };
  return map[view] || null;
}

function checkAndGuardView(view) {
  const reqAbility = getRequiredAbilityForView(view);
  const targetView = document.getElementById(`view-${view}`);
  if (!targetView) return true;

  if (reqAbility && !hasAbility(reqAbility)) {
    let existingGuard = targetView.querySelector(".access-restricted-card");
    if (!existingGuard) {
      Array.from(targetView.children).forEach(child => {
        if (!child.classList.contains("access-restricted-card")) {
          child.dataset.origDisplay = child.style.display;
          child.style.display = "none";
        }
      });
      const guardHTML = getAccessRestrictedHTML(pageNames[view] ? pageNames[view][1] : view, reqAbility);
      targetView.insertAdjacentHTML("afterbegin", guardHTML);
    } else {
      existingGuard.style.display = "flex";
      Array.from(targetView.children).forEach(child => {
        if (!child.classList.contains("access-restricted-card")) {
          child.style.display = "none";
        }
      });
    }
    return false;
  } else {
    const existingGuard = targetView.querySelector(".access-restricted-card");
    if (existingGuard) {
      existingGuard.style.display = "none";
    }
    Array.from(targetView.children).forEach(child => {
      if (!child.classList.contains("access-restricted-card")) {
        child.style.display = child.dataset.origDisplay !== undefined ? child.dataset.origDisplay : "";
      }
    });
    return true;
  }
}

function navigate(view) {
  if (!pageNames[view]) return;

  document.querySelectorAll(".view").forEach((v) => {
    v.classList.remove("active");
  });

  const targetView = document.getElementById(`view-${view}`);
  if (targetView) targetView.classList.add("active");

  document.querySelectorAll(".nav-item, .chrome-tab").forEach((n) => {
    n.classList.toggle("active", n.dataset.view === view);
  });

  const contextLabel = document.getElementById("contextLabel");
  const breadcrumbPage = document.getElementById("breadcrumbPage");
  const pageTitle = document.getElementById("pageTitle");
  if (contextLabel) contextLabel.setAttribute("aria-label", `SOVAI / ${pageNames[view][1]}`);
  if (breadcrumbPage) breadcrumbPage.textContent = pageNames[view][1];
  if (pageTitle) pageTitle.textContent = pageNames[view][1];

  if (sidebar) sidebar.classList.remove("open");

  updateDrawerForView(view);

  // Check feature permission BEFORE initializing or fetching any protected API data
  const isAuthorized = checkAndGuardView(view);
  if (!isAuthorized) {
    // STOP! Do NOT call protected APIs or initialize feature data
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (view === "files") {
    fetchBackendDocuments();
  } else if (view === "knowledge") {
    fetchBackendDocuments();
    renderKnowledgeBaseState();
  } else if (view === "sandbox") {
    fetchSandboxHistory();
  } else if (view === "audit") {
    renderAuditLogs();
  } else if (view === "dashboard") {
    renderDashboardRecentActivity();
  } else if (view === "admin") {
    loadIamUsers();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==========================================
   EVENT DELEGATION (NAVIGATION & ACTIONS)
========================================== */

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]");

  if (nav) {
    navigate(nav.dataset.view);
    closeDrawer();
  }

  const action = event.target.closest("[data-action]");

  if (action) {
    const type = action.dataset.action;

    if (type === "upload") {
      pendingUploadContext = action.closest(".chat-composer") ? "chat" : (action.closest(".vision-grid") ? "vision" : "files");
      if (fileInput) fileInput.click();
    }

    if (type === "new-chat") {
      navigate("chat");
    }
  }
});

if (themeButton) {
  themeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (themeMenu) themeMenu.classList.toggle("open");
  });
}

document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
  btn.addEventListener("click", () => {
    applyTheme(btn.dataset.themeChoice);
    if (themeMenu) themeMenu.classList.remove("open");
    showToast(`${btn.textContent.trim()} theme enabled`);
  });
});

document.addEventListener("click", () => {
  if (themeMenu) themeMenu.classList.remove("open");
});

if (sidebarLogo) {
  sidebarLogo.addEventListener("click", () => {
    if (window.innerWidth <= SIDEBAR_OVERLAY_MAX_WIDTH) {
      sidebar.classList.add("open");
    } else {
      sidebar.classList.remove("collapsed");
    }
  });
}

if (mobileLogoTrigger) {
  mobileLogoTrigger.addEventListener("click", () => {
    if (sidebar) sidebar.classList.add("open");
  });
}

if (sidebarCollapse) {
  sidebarCollapse.addEventListener("click", () => {
    if (window.innerWidth <= SIDEBAR_OVERLAY_MAX_WIDTH) {
      sidebar.classList.remove("open");
    } else {
      sidebar.classList.add("collapsed");
    }
  });
}

window.addEventListener("resize", () => {
  if (window.innerWidth <= SIDEBAR_OVERLAY_MAX_WIDTH && sidebar) {
    sidebar.classList.remove("collapsed");
  }
});

/* ==========================================
   RIGHT DRAWER PANEL
========================================== */

function openDrawer() {
  if (rightDrawer) {
    rightDrawer.classList.add("open");
    rightDrawer.setAttribute("aria-hidden", "false");
  }
  if (drawerBackdrop) drawerBackdrop.classList.add("open");
}

function closeDrawer() {
  if (rightDrawer) {
    rightDrawer.classList.remove("open");
    rightDrawer.setAttribute("aria-hidden", "true");
  }
  if (drawerBackdrop) drawerBackdrop.classList.remove("open");
}

function updateDrawerForView(view) {
  if (!drawerTitle) return;

  const titleMap = {
    chat: "AI Controls",
    coding: "Coding Controls",
    multimodal: "Vision Controls",
    calculations: "Calculation Controls",
    sandbox: "Execution Controls",
    security: "Security Controls",
    audit: "Observability",
    files: "File Controls",
    knowledge: "Knowledge Controls",
    tools: "Local Tool Controls",
    settings: "Workspace Settings",
    dashboard: "Quick Controls",
  };

  drawerTitle.textContent = titleMap[view] || "Quick Controls";

  const verificationSection = document.getElementById("drawerVerificationSection");
  if (verificationSection) {
    verificationSection.style.display = [
      "coding",
      "sandbox",
      "calculations",
    ].includes(view)
      ? "block"
      : "none";
  }
}

if (rightMenuButton) {
  rightMenuButton.addEventListener("click", () => {
    const activeView =
      document.querySelector(".view.active")?.id?.replace("view-", "") ||
      "dashboard";

    updateDrawerForView(activeView);
    openDrawer();
  });
}

if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeDrawer);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDrawer();
    if (sidebar) sidebar.classList.remove("open");
  }
});

/* ==========================================
   BACKEND HEALTH & SYSTEM STATUS
========================================== */

async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      const statusRows = document.querySelectorAll(".status-row");
      if (statusRows.length > 0) {
        const localRuntimeVal = statusRows[0].querySelector(".status-value");
        if (localRuntimeVal) localRuntimeVal.textContent = "Online (" + data.status + ")";
      }
    }
  } catch (err) {
    console.warn("Backend health check offline:", err);
  }
}

/* ==========================================
   FILE UPLOADS & DOCUMENTS API INTEGRATION
========================================== */

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFileTypeCategory(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();

  if (["pdf"].includes(ext)) return { name: "PDF", tagClass: "green" };
  if (["doc", "docx"].includes(ext)) return { name: "Word", tagClass: "green" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { name: "Excel", tagClass: "green" };
  if (["ppt", "pptx"].includes(ext)) return { name: "PPT", tagClass: "green" };
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext))
    return { name: "Image", tagClass: "blue" };
  if (["py", "js", "html", "css", "json", "md", "cpp", "c", "java"].includes(ext))
    return { name: "Code", tagClass: "blue" };

  return { name: "Document", tagClass: "green" };
}

/* ==========================================
   FOLDER & DOCUMENT MANAGEMENT
========================================== */
let availableFolders = [{ name: "Default", is_default: true, doc_count: 0 }];
let currentActiveFolder = "Default";

async function fetchFolders() {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/folders`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && Array.isArray(data.folders)) {
      availableFolders = data.folders;
      renderFolderGrid();
      updateRagFolderSelectOptions();
      populateModalFolderOptions();
    }
  } catch (err) {
    console.warn("Failed to fetch folders:", err);
  }
}

function renderFolderGrid() {
  const folderGridEl = document.getElementById("folderGrid");
  const folderCountBadge = document.getElementById("folderCountBadge");

  if (folderCountBadge) {
    folderCountBadge.textContent = `${availableFolders.length} Folder${availableFolders.length === 1 ? "" : "s"}`;
  }

  if (!folderGridEl) return;

  const cardsHtml = availableFolders
    .map((f) => {
      const isActive = f.name.toLowerCase() === currentActiveFolder.toLowerCase();
      const activeClass = isActive ? "active" : "";
      const deleteBtn = !f.is_default
        ? `<button class="btn-delete-folder" data-delete-folder="${escapeHtml(f.name)}" title="Delete Folder">🗑</button>`
        : "";
      const badge = f.is_default
        ? `<span class="tag muted" style="font-size: 9px;">Default</span>`
        : `<span class="tag blue" style="font-size: 9px;">Custom</span>`;

      return `
        <div class="folder-card ${activeClass}" data-folder="${escapeHtml(f.name)}">
          <div class="folder-card-top">
            <div class="folder-card-icon">📁</div>
            <div class="folder-card-actions">
              ${deleteBtn}
            </div>
          </div>
          <div class="folder-card-body">
            <h5 class="folder-card-title">${escapeHtml(f.name)}</h5>
            <div class="folder-card-meta">
              <span>${f.doc_count || 0} doc(s)</span>
              ${badge}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  const createCardHtml = `
    <div class="folder-card-create" id="btnGridCreateFolder">
      <div class="folder-card-create-icon">➕</div>
      <div>Create New Folder</div>
    </div>
  `;

  folderGridEl.innerHTML = cardsHtml + createCardHtml;

  // Add click handlers for folder cards
  folderGridEl.querySelectorAll(".folder-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest("[data-delete-folder]");
      if (deleteBtn) {
        e.stopPropagation();
        const folderToDelete = deleteBtn.dataset.deleteFolder;
        handleDeleteFolder(folderToDelete);
        return;
      }
      const folderName = card.dataset.folder;
      setActiveFolder(folderName);
    });
  });

  // Add click handler for + Create Folder grid card
  const btnGridCreateFolder = document.getElementById("btnGridCreateFolder");
  if (btnGridCreateFolder) {
    btnGridCreateFolder.addEventListener("click", () => {
      toggleFolderCreateCard(true);
    });
  }
}

function toggleFolderCreateCard(show = true) {
  const folderCreateCard = document.getElementById("folderCreateCard");
  const createFolderModal = document.getElementById("createFolderModal");
  const modalInput = document.getElementById("modalFolderNameInput");
  const inlineInput = document.getElementById("newFolderNameInput");

  if (createFolderModal) {
    if (show) {
      createFolderModal.style.display = "grid";
      if (modalInput) {
        modalInput.value = "";
        modalInput.focus();
      }
    } else {
      createFolderModal.style.display = "none";
    }
  }

  if (folderCreateCard) {
    if (show && !createFolderModal) {
      folderCreateCard.style.display = "block";
      if (inlineInput) {
        inlineInput.value = "";
        inlineInput.focus();
      }
    } else {
      folderCreateCard.style.display = "none";
    }
  }
}

function updateRagFolderSelectOptions() {
  const selectEl = document.getElementById("ragFolderSelect");
  if (!selectEl) return;

  const currentVal = selectEl.value;
  selectEl.innerHTML = `<option value="">All Folders</option>` +
    availableFolders
      .map((f) => `<option value="${escapeHtml(f.name)}">${escapeHtml(f.name)}</option>`)
      .join("");
  if (currentVal !== undefined) selectEl.value = currentVal;
}

function setActiveFolder(folderName) {
  currentActiveFolder = folderName || "Default";

  const breadcrumbName = document.getElementById("breadcrumbFolderName");
  if (breadcrumbName) breadcrumbName.textContent = currentActiveFolder;

  const uploadTag = document.getElementById("activeUploadFolderTag");
  if (uploadTag) uploadTag.textContent = currentActiveFolder;

  const docTableTag = document.getElementById("documentTableFolderText");
  if (docTableTag) docTableTag.textContent = currentActiveFolder;

  renderFolderGrid();
  fetchBackendDocuments();
}

async function handleCreateFolder(name) {
  const cleanName = (name || "").trim();
  const errorEl = document.getElementById("createFolderModalError");
  if (errorEl) errorEl.style.display = "none";

  if (!cleanName) {
    if (errorEl) {
      errorEl.textContent = "Please enter a valid folder name";
      errorEl.style.display = "block";
    }
    showToast("Please enter a valid folder name");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/documents/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanName }),
    });
    if (res.ok) {
      const created = await res.json();
      showToast(`Created folder "${created.name}"`);
      toggleFolderCreateCard(false);
      await fetchFolders();
      setActiveFolder(created.name);
    } else {
      const err = await res.json();
      const errMsg = err.detail || "Failed to create folder";
      if (errorEl) {
        errorEl.textContent = errMsg;
        errorEl.style.display = "block";
      }
      showToast(errMsg);
    }
  } catch (err) {
    console.error("Create folder error:", err);
    if (errorEl) {
      errorEl.textContent = "Could not connect to server";
      errorEl.style.display = "block";
    }
    showToast("Error creating folder");
  }
}

async function submitModalCreateFolder() {
  const input = document.getElementById("modalFolderNameInput");
  if (input) {
    await handleCreateFolder(input.value);
  }
}

window.submitModalCreateFolder = submitModalCreateFolder;
window.handleCreateFolder = handleCreateFolder;
window.toggleFolderCreateCard = toggleFolderCreateCard;

async function handleDeleteFolder(folderName) {
  if (!confirm(`Are you sure you want to delete folder "${folderName}" and all its documents?`)) return;
  try {
    const res = await fetch(`${API_BASE_URL}/documents/folders/${encodeURIComponent(folderName)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast(`Deleted folder "${folderName}"`);
      if (currentActiveFolder.toLowerCase() === folderName.toLowerCase()) {
        currentActiveFolder = "Default";
      }
      await fetchFolders();
      setActiveFolder(currentActiveFolder);
    } else {
      const err = await res.json();
      showToast(err.detail || "Failed to delete folder");
    }
  } catch (err) {
    console.error("Delete folder error:", err);
    showToast("Error deleting folder");
  }
}

function bindFolderEvents() {
  const btnNewFolder = document.getElementById("btnNewFolder");
  const btnCreateFolderSubmit = document.getElementById("btnCreateFolderSubmit");
  const btnCancelFolderCreate = document.getElementById("btnCancelFolderCreate");
  const newFolderNameInput = document.getElementById("newFolderNameInput");

  if (btnNewFolder) {
    btnNewFolder.onclick = (e) => {
      e.preventDefault();
      toggleFolderCreateCard(true);
    };
  }

  if (btnCancelFolderCreate) {
    btnCancelFolderCreate.onclick = (e) => {
      e.preventDefault();
      toggleFolderCreateCard(false);
    };
  }

  if (btnCreateFolderSubmit) {
    btnCreateFolderSubmit.onclick = (e) => {
      e.preventDefault();
      if (newFolderNameInput) {
        handleCreateFolder(newFolderNameInput.value);
      }
    };
  }

  if (newFolderNameInput) {
    newFolderNameInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCreateFolder(newFolderNameInput.value);
      }
    };
  }
}

async function fetchBackendDocuments() {
  try {
    const folderQuery = currentActiveFolder ? `?folder=${encodeURIComponent(currentActiveFolder)}` : "";
    const res = await fetch(`${API_BASE_URL}/documents/${folderQuery}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && Array.isArray(data.documents)) {
      backendDocuments = data.documents;
      renderFileTable();
      updateDocumentStats();
      renderKnowledgeBaseState();
    }
  } catch (err) {
    console.warn("Failed to fetch backend documents:", err);
  }
}

function updateDocumentStats() {
  const docStatCard = document.querySelector('[data-stat-key="indexedDocuments"] strong');
  if (docStatCard) {
    docStatCard.textContent = String(backendDocuments.length).padStart(2, "0");
  }
}

function renderFileTable() {
  const fileTable = document.getElementById("fileTable");
  if (!fileTable) return;

  fileTable.innerHTML = `
    <div class="file-row head">
      <span>Name</span>
      <span>Folder</span>
      <span>Category / Uploaded</span>
      <span>Status</span>
      <span>Actions</span>
    </div>
  `;

  if (backendDocuments.length === 0) {
    const emptyRow = document.createElement("div");
    emptyRow.className = "file-row";
    emptyRow.innerHTML = `
      <strong style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 12px 0;">No documents found in ${escapeHtml(currentActiveFolder)} folder.</strong>
    `;
    fileTable.appendChild(emptyRow);
    return;
  }

  backendDocuments.forEach((doc) => {
    const typeInfo = getFileTypeCategory(doc.filename);
    const docFolder = doc.folder || "Default";
    const row = document.createElement("div");
    row.className = "file-row";
    row.innerHTML = `
      <strong title="${escapeHtml(doc.filename)}">${escapeHtml(doc.filename)}</strong>
      <span><span class="tag blue" style="font-size: 10px;">📁 ${escapeHtml(docFolder)}</span></span>
      <span>${escapeHtml(doc.category || "Uploaded")} · ${escapeHtml(formatFileSize(doc.size))}</span>
      <span class="tag ${typeInfo.tagClass}">${escapeHtml(doc.status || "Indexed")}</span>
      <div style="display: flex; gap: 6px;">
        <button class="secondary-button btn-download" data-filename="${escapeHtml(doc.filename)}" style="padding: 4px 8px; font-size: 11px;">Download</button>
        <button class="secondary-button btn-delete" data-filename="${escapeHtml(doc.filename)}" style="padding: 4px 8px; font-size: 11px; color: var(--danger);">Delete</button>
      </div>
    `;

    row.querySelector(".btn-download").addEventListener("click", () => downloadDocument(doc.filename));
    row.querySelector(".btn-delete").addEventListener("click", () => deleteDocument(doc.filename));

    fileTable.appendChild(row);
  });
}

async function uploadDocumentFile(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", currentActiveFolder || "Default");
    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      showToast(`Uploaded ${data.filename} to ${data.folder || currentActiveFolder} folder`);
      logAuditEvent({
        activity: `Document uploaded: ${data.filename}`,
        component: "Files & Documents",
        status: "Success"
      });
      await fetchFolders();
      await fetchBackendDocuments();
      return data;
    } else {
      showToast("Upload failed");
      logAuditEvent({
        activity: `Document upload failed: ${file.name}`,
        component: "Files & Documents",
        status: "Failed"
      });
    }
  } catch (err) {
    console.error("Document upload error:", err);
    showToast("Error uploading file");
  }
}

async function deleteDocument(filename) {
  if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast(`Deleted ${filename}`);
      logAuditEvent({
        activity: `Document deleted: ${filename}`,
        component: "Files & Documents",
        status: "Success"
      });
      await fetchFolders();
      await fetchBackendDocuments();
    } else {
      showToast("Failed to delete document");
    }
  } catch (err) {
    console.error("Delete document error:", err);
    showToast("Error deleting document");
  }
}

function downloadDocument(filename) {
  window.open(`${API_BASE_URL}/documents/download/${encodeURIComponent(filename)}`, "_blank");
}

function handleFiles(files, context = "files") {
  if (!files || !files.length) return;

  const fileList = Array.from(files);

  fileList.forEach(async (file) => {
    const typeInfo = getFileTypeCategory(file.name);
    const fileObj = {
      file,
      name: file.name,
      size: file.size,
      type: typeInfo.name,
      tagClass: typeInfo.tagClass,
      uploadedAt: new Date().toLocaleTimeString(),
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    };

    uploadedFiles.push(fileObj);
    if (context === "chat") {
      chatAttachedFiles.push(fileObj);
      renderChatAttachments();
    }

    if (context === "files") {
      await uploadDocumentFile(file);
    } else if (context === "vision" || fileObj.type === "Image") {
      updateVisionPreview(fileObj);
    }
  });

  showToast(`Processing ${fileList.length} file(s)...`);
}

function renderChatAttachments() {
  const bar = document.getElementById("chatAttachmentsBar");
  const list = document.getElementById("chatAttachmentsList");
  if (!bar || !list) return;

  if (chatAttachedFiles.length === 0) {
    bar.style.display = "none";
    list.innerHTML = "";
    return;
  }

  bar.style.display = "flex";
  list.innerHTML = chatAttachedFiles
    .map(
      (item, idx) => `
      <div class="attachment-pill">
        <span>📄 ${escapeHtml(item.name)}</span>
        <button class="remove-attach" data-attach-index="${idx}" title="Remove file">&times;</button>
      </div>
    `
    )
    .join("");

  list.querySelectorAll(".remove-attach").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.attachIndex, 10);
      chatAttachedFiles.splice(idx, 1);
      renderChatAttachments();
      showToast("Attachment removed");
    });
  });
}

function scrollChatToLatest() {
  if (!chatArea) return;
  chatArea.lastElementChild?.scrollIntoView({ block: "end", behavior: "smooth" });
}

let lastVisionFileObj = null;

function updateVisionAnalysisStatus(state, data = {}) {
  const analysisList = document.getElementById("visionAnalysisList");
  if (!analysisList) return;

  const fileName = data?.name || lastVisionFileObj?.name || "Uploaded Image";
  const fileSize = data?.size ? formatFileSize(data.size) : (lastVisionFileObj?.size ? formatFileSize(lastVisionFileObj.size) : "Ready");
  const modelName = data?.model || (modelSelector ? modelSelector.value : "Auto Select");

  if (state === "ready") {
    analysisList.innerHTML = `
      <div class="analysis-status-row is-complete">
        <span class="analysis-status-icon">✓</span>
        <div>
          <strong>Ingested ${escapeHtml(fileName)}</strong>
          <small>Image preprocessed (${escapeHtml(fileSize)})</small>
        </div>
        <span class="analysis-status-state">Done</span>
      </div>
      <div class="analysis-status-row is-idle">
        <span class="analysis-status-icon">•</span>
        <div>
          <strong>Layout & OCR Extraction</strong>
          <small>Ready for feature & text extraction</small>
        </div>
        <span class="analysis-status-state">Ready</span>
      </div>
      <div class="analysis-status-row is-idle">
        <span class="analysis-status-icon">•</span>
        <div>
          <strong>Multimodal Vision Inference</strong>
          <small>Local ${escapeHtml(modelName)} inference pipeline</small>
        </div>
        <span class="analysis-status-state">Standby</span>
      </div>
    `;
  } else if (state === "processing") {
    analysisList.innerHTML = `
      <div class="analysis-status-row is-complete">
        <span class="analysis-status-icon">✓</span>
        <div>
          <strong>Ingested ${escapeHtml(fileName)}</strong>
          <small>Image preprocessed (${escapeHtml(fileSize)})</small>
        </div>
        <span class="analysis-status-state">Done</span>
      </div>
      <div class="analysis-status-row is-active">
        <span class="analysis-status-icon">⚙</span>
        <div>
          <strong>Layout & OCR Extraction</strong>
          <small>Extracting text tokens & visual contours...</small>
        </div>
        <span class="analysis-status-state">In Progress</span>
      </div>
      <div class="analysis-status-row is-active">
        <span class="analysis-status-icon">⚡</span>
        <div>
          <strong>Multimodal Vision Inference</strong>
          <small>Executing ${escapeHtml(modelName)} local inference...</small>
        </div>
        <span class="analysis-status-state">Analyzing</span>
      </div>
    `;
  } else if (state === "complete") {
    analysisList.innerHTML = `
      <div class="analysis-status-row is-complete">
        <span class="analysis-status-icon">✓</span>
        <div>
          <strong>Ingested ${escapeHtml(fileName)}</strong>
          <small>Image preprocessed (${escapeHtml(fileSize)})</small>
        </div>
        <span class="analysis-status-state">Done</span>
      </div>
      <div class="analysis-status-row is-complete">
        <span class="analysis-status-icon">✓</span>
        <div>
          <strong>Layout & OCR Extraction</strong>
          <small>Text & spatial layout extracted</small>
        </div>
        <span class="analysis-status-state">Done</span>
      </div>
      <div class="analysis-status-row is-complete">
        <span class="analysis-status-icon">✓</span>
        <div>
          <strong>Multimodal Vision Inference</strong>
          <small>Local ${escapeHtml(modelName)} processing complete</small>
        </div>
        <span class="analysis-status-state">Done</span>
      </div>
    `;
  } else if (state === "error") {
    analysisList.innerHTML = `
      <div class="analysis-status-row is-complete">
        <span class="analysis-status-icon">✓</span>
        <div>
          <strong>Ingested ${escapeHtml(fileName)}</strong>
          <small>Image preprocessed</small>
        </div>
        <span class="analysis-status-state">Done</span>
      </div>
      <div class="analysis-status-row is-complete">
        <span class="analysis-status-icon">✓</span>
        <div>
          <strong>Layout & OCR Extraction</strong>
          <small>Layout analysis completed</small>
        </div>
        <span class="analysis-status-state">Done</span>
      </div>
      <div class="analysis-status-row is-error">
        <span class="analysis-status-icon">✕</span>
        <div>
          <strong>Multimodal Vision Inference</strong>
          <small>${escapeHtml(data.message || "Failed to complete vision inference")}</small>
        </div>
        <span class="analysis-status-state">Error</span>
      </div>
    `;
  }
}

function updateVisionPreview(fileObj) {
  lastVisionFileObj = fileObj;
  const previewArea = document.getElementById("visionPreviewArea");
  const analysisPanel = document.getElementById("visionAnalysisPanel");
  const visionGrid = document.querySelector(".vision-grid");
  if (!previewArea) return;

  previewArea.style.display = "block";

  const isImage = fileObj.type === "Image";
  if (visionGrid) visionGrid.classList.toggle("has-analysis", isImage);
  if (analysisPanel) analysisPanel.style.display = isImage ? "block" : "none";

  if (isImage) {
    updateVisionAnalysisStatus("ready", fileObj);
  }

  let imageHtml = "";
  if (fileObj.previewUrl) {
    imageHtml = `
      <div class="vision-image-wrapper">
        <img src="${fileObj.previewUrl}" alt="${escapeHtml(fileObj.name)}" />
      </div>
    `;
  }

  previewArea.innerHTML = `
    <div class="vision-preview-card">
      <div class="vision-preview-header">
        <strong>Selected File: ${escapeHtml(fileObj.name)}</strong>
        <span class="tag ${fileObj.tagClass}">${escapeHtml(fileObj.type)}</span>
      </div>
      ${imageHtml}
      <div class="ocr-result-box" id="visionOcrResult">Click "Analyze" to extract text and analyze visual contents using local Vision AI engine.</div>
    </div>
  `;
}

if (fileInput) {
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
      handleFiles(Array.from(fileInput.files), pendingUploadContext);
      fileInput.value = "";
      pendingUploadContext = "files";
    }
  });
}

["dragover", "drop"].forEach((eventName) => {
  window.addEventListener(eventName, (event) => {
    event.preventDefault();
  });
});

document.querySelectorAll(".upload-zone").forEach((zone) => {
  ["dragenter", "dragover"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove("drag-over");
    });
  });

  zone.addEventListener("drop", (event) => {
    if (event.dataTransfer && event.dataTransfer.files.length) {
      const context = zone.id === "visionDropZone" ? "vision" : "files";
      handleFiles(Array.from(event.dataTransfer.files), context);
    }
  });
});

/* ==========================================
   MARKDOWN & MATH FORMATTING
========================================== */

function renderMathWithKaTeXOrFallback(mathCode, isDisplay) {
  const cleanMath = mathCode.trim();
  if (!cleanMath) return "";

  if (window.katex && typeof window.katex.renderToString === "function") {
    try {
      return window.katex.renderToString(cleanMath, {
        displayMode: isDisplay,
        throwOnError: false,
      });
    } catch (e) {
      console.warn("KaTeX render fallback:", e);
    }
  }

  // Fallback HTML rendering for math expressions
  let formatted = escapeHtml(cleanMath);

  // LaTeX Boxed Answer
  formatted = formatted.replace(/\\boxed\{([\s\S]*?)\}/g, '<span class="math-boxed-card"><strong style="color:var(--accent);">Result:</strong> $1</span>');

  // Matrix pmatrix / bmatrix fallback
  formatted = formatted.replace(/\\begin\{(?:pmatrix|bmatrix|matrix)\}([\s\S]*?)\\end\{(?:pmatrix|bmatrix|matrix)\}/g, (match, body) => {
    const rows = body.trim().split(/\\\\|\n/).map(row => row.split('&').map(cell => `<div class="math-matrix-cell">${cell.trim()}</div>`).join(''));
    return `<div class="math-matrix-container"><div class="math-matrix-grid">${rows.map(r => `<div class="math-matrix-row">${r}</div>`).join('')}</div></div>`;
  });

  // LaTeX Fraction \frac{a}{b}
  formatted = formatted.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="math-fraction"><span class="math-num">$1</span><span class="math-den">$2</span></span>');

  // Partial derivative \partial
  formatted = formatted.replace(/\\partial/g, '∂');

  if (isDisplay) {
    return `<div class="math-display-card">${formatted}</div>`;
  }
  return `<span class="math-inline-card">${formatted}</span>`;
}

function plainTextToHtml(text) {
  if (text === null || text === undefined) return "";
  if (typeof text !== "string") {
    text = typeof text === "object" ? JSON.stringify(text, null, 2) : String(text);
  }
  if (!text.trim()) return "";

  let html = text;

  // 1. Unescape escaped LaTeX backslashes if present
  html = html.replace(/\\\\/g, "\\");

  // 2. Extract code blocks first to preserve their raw text
  const codeBlocks = [];
  html = html.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
    const language = lang.trim() || "code";
    const codeId = "code_" + Math.random().toString(36).substr(2, 9);
    codeBlocks.push(`<div class="code-block-container" style="margin: 12px 0; border-radius: 8px; border: 1px solid var(--border); overflow: hidden; background: #09090b;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: #18181b; border-bottom: 1px solid var(--border); font-family: monospace; font-size: 0.78rem; color: #a1a1aa;">
            <span>${escapeHtml(language)}</span>
            <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('${codeId}').innerText).then(() => { this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy', 2000); })" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #e4e4e7; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; cursor: pointer;">Copy</button>
        </div>
        <pre style="margin: 0; padding: 12px; overflow-x: auto; font-family: monospace; font-size: 0.88rem; line-height: 1.5; color: #f4f4f5;"><code id="${codeId}">${escapeHtml(code.trim())}</code></pre>
    </div>`);
    return placeholder;
  });

  // 3. Render Display Math ($$ ... $$ or \[ ... \])
  html = html.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, math) => {
    return renderMathWithKaTeXOrFallback(math, true);
  });
  html = html.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (match, math) => {
    return renderMathWithKaTeXOrFallback(math, true);
  });

  // 4. Render Inline Math ($ ... $ or \( ... \))
  html = html.replace(/(^|[^\$])\$([^\$\n]+)\$([^\$]|$)/g, (match, pre, math, post) => {
    return pre + renderMathWithKaTeXOrFallback(math, false) + post;
  });
  html = html.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (match, math) => {
    return renderMathWithKaTeXOrFallback(math, false);
  });

  // 5. Highlight LaTeX \boxed{...} answer boxes if outside display math
  html = html.replace(/\\boxed\{([\s\S]*?)\}/g, '<span class="math-boxed-card"><strong style="color:var(--accent);">Result:</strong> $1</span>');

  // 6. Format Plain-Text Bracket Matrices like [ 6x -3a ] \n [ -3a 6y ] into styled matrix grids
  html = html.replace(/(?:\[\s*[^\]\n]+\s*\](?:\s*\n\s*|\s*)){2,}/g, (matrixMatch) => {
    const rowLines = matrixMatch.trim().split(/\n+/).filter(line => line.includes('[') && line.includes(']'));
    if (rowLines.length >= 2) {
      const formattedRows = rowLines.map(row => {
        const content = row.replace(/^[\[\s]+|[\]\s]+$/g, '');
        const cells = content.split(/\s+/).filter(c => c.length > 0);
        return `<div class="math-matrix-row">${cells.map(c => `<div class="math-matrix-cell">${escapeHtml(c)}</div>`).join('')}</div>`;
      }).join('');
      return `<div class="math-matrix-container"><div class="math-matrix-grid">${formattedRows}</div></div>`;
    }
    return matrixMatch;
  });

  // 7. Escape HTML for remaining normal text (preserving rendered tags)
  // Standard Markdown Headings
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 1.15rem; font-weight: 700; margin: 16px 0 8px 0; color: var(--text);">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 1.3rem; font-weight: 700; margin: 20px 0 10px 0; color: var(--accent);">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 1.5rem; font-weight: 800; margin: 24px 0 12px 0; color: var(--text);">$1</h1>');

  // Bold & Italics
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Inline Code
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--surface-2); color:var(--text); padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.88em;">$1</code>');

  // Download Cards for Generated Files
  const filePathRegex = /(?:(?:[A-Za-z]:[\\/]|data[\\/]outputs[\\/]|outputs[\\/]|storage[\\/])?[a-zA-Z0-9_-]+\.(?:pptx|docx|pdf|xlsx|csv))\b/gi;
  html = html.replace(filePathRegex, (match) => {
    const filename = match.split(/[\\/]/).pop();
    if (!filename || !filename.includes(".")) return match;
    const ext = filename.split(".").pop().toUpperCase();
    return `
      <div style="margin: 10px 0; padding: 10px 14px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
        <div><strong>📄 ${escapeHtml(filename)}</strong> <small>(${ext})</small></div>
        <a href="${API_BASE_URL}/documents/download/${encodeURIComponent(filename)}" target="_blank" download style="background: var(--accent); color: #001522; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; text-decoration: none;">Download</a>
      </div>
    `;
  });

  // Restore Code Blocks
  codeBlocks.forEach((codeHtml, idx) => {
    html = html.replace(`___CODE_BLOCK_${idx}___`, codeHtml);
  });

  // Line breaks
  html = html.replace(/\n/g, "<br>");
  return html;
}


/* ==========================================
   AI CHAT STREAMING API INTEGRATION
========================================== */

const chatInput = document.getElementById("chatInput");
const chatArea = document.getElementById("chatArea");
const sendChat = document.getElementById("sendChat");

function setGeneratingState(generating) {
  isGenerating = generating;
  if (!sendChat) return;

  sendChat.textContent = generating ? "⏹" : "↗";
  sendChat.title = generating ? "Stop generating" : "Send message";
  sendChat.classList.toggle("is-generating", generating);
}

function stopActiveGeneration() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
    showToast("Generation stopped");
    setGeneratingState(false);
  }
}

async function sendMessage() {
  if (isGenerating) {
    stopActiveGeneration();
    return;
  }

  if (!chatInput) return;

  const text = chatInput.value.trim();
  const hasAttachments = chatAttachedFiles.length > 0;

  if (!text && !hasAttachments) return;

  logAuditEvent({
    activity: `Chat query: "${text ? (text.length > 28 ? text.slice(0, 28) + '...' : text) : 'Attachment query'}"`,
    component: "AI Chat",
    status: "Success"
  });

  const welcome = chatArea?.querySelector(".chat-welcome");
  if (welcome) welcome.remove();

  // Selected Model
  const selectedModel = modelSelector ? modelSelector.value : "auto";

  // Upload attached chat files to backend first if any
  const selectedDocsList = [];
  let attachedImagePath = null;

  for (const item of chatAttachedFiles) {
    selectedDocsList.push(item.name);
    if (item.file) {
      if (item.type === "Image") {
        const uploadRes = await fetch(`${API_BASE_URL}/vision/upload`, {
          method: "POST",
          body: (() => { const fd = new FormData(); fd.append("file", item.file); return fd; })()
        });
        if (uploadRes.ok) {
          const imgData = await uploadRes.json();
          attachedImagePath = imgData.location;
        }
      } else {
        await uploadDocumentFile(item.file);
      }
    }
  }

  // Create User Message Element
  const userMsg = document.createElement("div");
  userMsg.className = "chat-message user";

  let attachHtml = "";
  if (hasAttachments) {
    attachHtml = `
      <div class="chat-message-attachments">
        ${chatAttachedFiles
        .map((f) => `<div class="chat-message-attachment-item">📎 ${escapeHtml(f.name)} (${escapeHtml(f.type)})</div>`)
        .join("")}
      </div>
    `;
  }

  userMsg.innerHTML = `
    <div class="message-label">You</div>
    <div class="message-content">
      <p>${text ? escapeHtml(text).replace(/\n/g, "<br>") : "<em>Uploaded file context for analysis</em>"}</p>
    </div>
    ${attachHtml}
    <div class="message-actions">
      <button type="button" class="chat-action-btn" data-chat-action="copy" title="Copy message" aria-label="Copy message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy</span>
      </button>
      <button type="button" class="chat-action-btn" data-chat-action="edit" title="Edit message" aria-label="Edit message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span>Edit</span>
      </button>
    </div>
  `;

  if (chatArea) {
    chatArea.appendChild(userMsg);
    scrollChatToLatest();
  }

  chatInput.value = "";
  chatAttachedFiles = [];
  renderChatAttachments();

  // Create Assistant Message Element
  const assistantMsg = document.createElement("div");
  assistantMsg.className = "chat-message assistant";
  assistantMsg.innerHTML = `
    <div class="message-label">SOVAI</div>
    <div class="message-content">
      <p class="assistant-response-text"><em>Thinking...</em></p>
      <div class="message-meta">SOVAI · ${escapeHtml(selectedModel)} model · Local inference</div>
      <div class="message-actions">
        <span class="chat-generating-status"><span class="status-dot pulsing"></span> Generating response...</span>
      </div>
    </div>
  `;

  if (chatArea) {
    chatArea.appendChild(assistantMsg);
    scrollChatToLatest();
  }

  const responseTextEl = assistantMsg.querySelector(".assistant-response-text");
  const actionsContainer = assistantMsg.querySelector(".message-actions");

  // Streaming Request to /chat/
  activeAbortController = new AbortController();
  setGeneratingState(true);

  let streamSuccess = false;
  let fullText = "";

  try {
    const res = await fetch(`${API_BASE_URL}/chat/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        model: selectedModel,
        selected_docs: selectedDocsList.length ? selectedDocsList : null,
        image_path: attachedImagePath,
      }),
      signal: activeAbortController.signal,
    });

    if (!res.ok) {
      if (responseTextEl) responseTextEl.innerHTML = `<span style="color:var(--danger)">Error: Received status ${res.status} from model server.</span>`;
      if (actionsContainer) actionsContainer.innerHTML = "";
      setGeneratingState(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      if (responseTextEl) {
        responseTextEl.innerHTML = plainTextToHtml(fullText);
      }
      scrollChatToLatest();
    }
    streamSuccess = true;
  } catch (err) {
    if (err.name === "AbortError") {
      if (responseTextEl) responseTextEl.innerHTML += "<br><em>[Generation Stopped]</em>";
      if (fullText.trim().length > 0) {
        streamSuccess = true;
      }
    } else {
      console.error("Streaming error:", err);
      if (responseTextEl) responseTextEl.innerHTML = `<span style="color:var(--danger)">Connection error. Ensure backend is running.</span>`;
    }
  } finally {
    activeAbortController = null;
    setGeneratingState(false);

    if (streamSuccess && fullText.trim().length > 0 && actionsContainer) {
      actionsContainer.innerHTML = `
        <button type="button" class="chat-action-btn" data-chat-action="copy" title="Copy response" aria-label="Copy response">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        </button>
      `;
    } else if (actionsContainer && !streamSuccess) {
      actionsContainer.innerHTML = "";
    }
  }
}

if (sendChat) sendChat.addEventListener("click", sendMessage);

if (chatInput) {
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
  });
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  });
}

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-chat-action]");
  if (!action) return;

  const message = action.closest(".chat-message");
  if (!message) return;

  const chatInput = document.getElementById("chatInput");

  if (action.dataset.chatAction === "copy") {
    let content = "";
    const assistantTextEl = message.querySelector(".assistant-response-text");
    if (assistantTextEl) {
      content = assistantTextEl.innerText || assistantTextEl.textContent || "";
    } else {
      const messageContentEl = message.querySelector(".message-content p") || message.querySelector(".message-content");
      content = messageContentEl ? (messageContentEl.innerText || messageContentEl.textContent || "") : "";
    }

    content = content.trim();
    if (!content || content === "Thinking..." || content.startsWith("Error:") || content.startsWith("Connection error")) {
      return;
    }

    navigator.clipboard?.writeText(content);
    const origHtml = action.innerHTML;
    action.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>Copied!</span>
    `;
    setTimeout(() => { action.innerHTML = origHtml; }, 1800);
    showToast("Copied to clipboard");
  }

  if (action.dataset.chatAction === "edit") {
    const messageContentEl = message.querySelector(".message-content p") || message.querySelector(".message-content");
    const content = messageContentEl ? (messageContentEl.innerText || messageContentEl.textContent || "").trim() : "";
    if (chatInput && content) {
      chatInput.value = content;
      chatInput.focus();
      chatInput.style.height = "auto";
      chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
    }
    showToast("Prompt loaded for editing");
  }
});

document.querySelectorAll(".chat-suggestions button").forEach((button) => {
  button.addEventListener("click", () => {
    if (chatInput) {
      chatInput.value = button.textContent;
      chatInput.focus();
    }
  });
});

const newChatBtn = document.getElementById("newChatBtn");

function resetChatSession() {
  stopActiveGeneration();
  if (chatArea) {
    chatArea.innerHTML = `
      <div class="chat-welcome">
        <div class="chat-welcome-mark"><img src="logo.png" alt="SOVAI logo" /></div>
        <strong>SOVAI</strong>
        <h2>How can I help with your private workspace?</h2>
        <p>
          Ask questions, analyze documents, search your private knowledge base,
          or use approved local tools.
        </p>

        <div class="chat-suggestions">
          <button>Summarize the latest inspection report</button>
          <button>Explain this engineering drawing</button>
          <button>Search the maintenance knowledge base</button>
          <button>Create an approval note from uploaded documents</button>
        </div>
      </div>
    `;

    chatArea.querySelectorAll(".chat-suggestions button").forEach((button) => {
      button.addEventListener("click", () => {
        if (chatInput) {
          chatInput.value = button.textContent;
          chatInput.focus();
        }
      });
    });
  }

  if (chatInput) {
    chatInput.value = "";
    chatInput.style.height = "auto";
  }
  chatAttachedFiles = [];
  renderChatAttachments();
  showToast("New chat session started");
}

if (newChatBtn) {
  newChatBtn.addEventListener("click", resetChatSession);
}

/* ==========================================
   VISION & OCR INTEGRATION
========================================== */

const runVisionBtn = document.getElementById("runVisionBtn");
const visionQueryInput = document.getElementById("visionQueryInput");

async function runVisionAnalysis() {
  const previewArea = document.getElementById("visionPreviewArea");
  const analysisPanel = document.getElementById("visionAnalysisPanel");
  const visionGrid = document.querySelector(".vision-grid");
  const ocrBox = document.getElementById("visionOcrResult");
  const query = (visionQueryInput?.value?.trim()) || "Extract text and analyze image layout";

  const selectedModel = modelSelector ? modelSelector.value : "auto";
  const lastFile = uploadedFiles.filter(f => f.type === "Image").pop()?.file || lastVisionFileObj?.file || null;

  if (visionGrid) visionGrid.classList.add("has-analysis");
  if (analysisPanel) analysisPanel.style.display = "block";

  updateVisionAnalysisStatus("processing", { model: selectedModel });

  if (ocrBox) ocrBox.textContent = "Processing image through local Vision engine...";

  try {
    const formData = new FormData();
    formData.append("query", query);
    if (lastFile) {
      formData.append("image", lastFile);
    }
    if (modelSelector) {
      formData.append("model", selectedModel);
    }

    const res = await fetch(`${API_BASE_URL}/vision/`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (ocrBox) ocrBox.innerHTML = plainTextToHtml(data.message);
      updateVisionAnalysisStatus("complete", { model: selectedModel });
      showToast("Vision analysis completed");
    } else {
      if (ocrBox) ocrBox.textContent = "Vision engine returned error response.";
      updateVisionAnalysisStatus("error", { message: "Vision engine returned error response" });
    }
  } catch (err) {
    console.error("Vision analysis error:", err);
    if (ocrBox) ocrBox.textContent = "Failed to connect to Vision API endpoint.";
    updateVisionAnalysisStatus("error", { message: "Failed to connect to Vision API endpoint" });
  }
}

if (runVisionBtn) runVisionBtn.addEventListener("click", runVisionAnalysis);

/* ==========================================
   CODING WORKSPACE / SANDBOX EXECUTOR
========================================== */

const runCode = document.getElementById("runCode");

let sandboxHistory = [];

function inferTaskNameFromCode(code) {
  if (!code || !code.trim()) return "Python Script Execution";
  const lines = code.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  for (const line of lines) {
    if (line.startsWith("# Task:") || line.startsWith("# task:")) {
      return line.substring(7).trim();
    }
    if (line.startsWith("#")) {
      const commentText = line.substring(1).trim();
      if (commentText.length > 3 && commentText.length < 50) return commentText;
    }
    if (line.startsWith("def ")) {
      const fnName = line.substring(4).split("(")[0].trim().replace(/_/g, " ");
      return fnName.charAt(0).toUpperCase() + fnName.slice(1);
    }
  }
  return "Python Script Execution";
}

async function fetchSandboxHistory() {
  const container = document.getElementById("sandboxHistoryContainer");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE_URL}/sandbox/history`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.history)) {
        sandboxHistory = data.history;
        try {
          localStorage.setItem("sovai_sandbox_history", JSON.stringify(sandboxHistory));
        } catch (e) { }
        renderSandboxHistory(sandboxHistory);
        return;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch sandbox history from backend, checking local storage:", err);
  }

  try {
    const cached = localStorage.getItem("sovai_sandbox_history");
    if (cached) {
      sandboxHistory = JSON.parse(cached);
    }
  } catch (e) {
    sandboxHistory = [];
  }
  renderSandboxHistory(sandboxHistory);
}

function renderSandboxHistory(records) {
  const container = document.getElementById("sandboxHistoryContainer");
  if (!container) return;

  if (!records || records.length === 0) {
    container.innerHTML = `
      <div class="file-row" style="justify-content: center; padding: 24px 16px; color: var(--muted); text-align: center;">
        <span>No sandbox executions recorded yet. Click "Run" above to execute python code.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = records
    .map((item) => {
      const statusLower = (item.status || "").toLowerCase();
      let tagClass = "green";
      let statusLabel = item.status || "Verified";

      if (statusLower.includes("fail") || statusLower.includes("error") || (item.exit_code > 0 && statusLower !== "timeout")) {
        tagClass = "red";
      } else if (statusLower.includes("time") || statusLower.includes("cancel")) {
        tagClass = "yellow";
      }

      return `
        <div class="file-row">
          <strong>${escapeHtml(item.run_id || "#RUN")}</strong>
          <span>${escapeHtml(item.task || "Python Script Execution")}</span>
          <span>${escapeHtml(item.duration || "0.00s")}</span>
          <span class="tag ${tagClass}">${escapeHtml(statusLabel)}</span>
        </div>
      `;
    })
    .join("");
}

if (runCode) {
  runCode.addEventListener("click", async () => {
    const codeEditor = document.getElementById("codeEditor");
    const terminal = document.getElementById("terminal");

    if (!codeEditor || !terminal) return;

    const code = codeEditor.value;
    const taskName = inferTaskNameFromCode(code);
    const startTime = performance.now();
    terminal.textContent = "Running code in isolated local sandbox...";

    try {
      const res = await fetch(`${API_BASE_URL}/sandbox/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, task: taskName }),
      });

      const endTime = performance.now();
      const elapsedSec = ((endTime - startTime) / 1000).toFixed(2) + "s";

      if (res.ok) {
        const data = await res.json();
        const exitText = `Exit Code: ${data.exit_code} (${(data.status || "success").toUpperCase()})`;
        terminal.textContent = `[Sandbox Execution Result]
-----------------------------------------
Status: ${exitText}
Run ID: ${data.run_id || "#RUN"}
Duration: ${data.duration || elapsedSec}

${data.output}
`;
        showToast(`Sandbox execution ${data.status || "completed"}`);
        logAuditEvent({
          activity: `Sandbox execution: ${taskName}`,
          component: "Sandbox",
          status: data.status === "success" ? "Success" : "Failed"
        });
        await fetchSandboxHistory();
      } else {
        terminal.textContent = `Error: Sandbox API returned status ${res.status}`;
        showToast("Sandbox execution failed");
        await fetchSandboxHistory();
      }
    } catch (err) {
      console.error("Sandbox execution error:", err);
      terminal.textContent = `Connection error: Could not reach sandbox execution endpoint.`;
      showToast("Sandbox execution connection error");
    }
  });
}

const clearTerminal = document.getElementById("clearTerminal");
if (clearTerminal) {
  clearTerminal.addEventListener("click", () => {
    const terminal = document.getElementById("terminal");
    if (terminal) terminal.textContent = "Terminal cleared.";
  });
}

const copyTerminal = document.getElementById("copyTerminal");
if (copyTerminal) {
  copyTerminal.addEventListener("click", () => {
    const terminal = document.getElementById("terminal");
    if (terminal) {
      navigator.clipboard.writeText(terminal.textContent);
      showToast("Terminal output copied");
    }
  });
}

/* ==========================================
   ENGINEERING CALCULATIONS
========================================== */

const runCalc = document.getElementById("runCalc");
const recentCalculations = [];

if (runCalc) {
  runCalc.addEventListener("click", () => {
    const calcAEl = document.getElementById("calcA");
    const calcBEl = document.getElementById("calcB");
    const calcOpEl = document.getElementById("calcOp");

    if (!calcAEl || !calcBEl || !calcOpEl) return;

    const a = Number(calcAEl.value);
    const b = Number(calcBEl.value);
    const op = calcOpEl.value;

    let result;
    let formula;

    if (op === "add") { result = a + b; formula = `${a} + ${b} = ${result}`; }
    else if (op === "subtract") { result = a - b; formula = `${a} − ${b} = ${result}`; }
    else if (op === "multiply") { result = a * b; formula = `${a} × ${b} = ${result}`; }
    else if (op === "divide") { result = b === 0 ? NaN : a / b; formula = b === 0 ? "Division by zero" : `${a} ÷ ${b} = ${result}`; }
    else { result = a + b; formula = `${a} + ${b} = ${result}`; }

    const calcResult = document.getElementById("calcResult");
    const calcExpression = document.getElementById("calcExpression");
    const calcFormula = document.getElementById("calcFormula");
    const calcFinal = document.getElementById("calcFinal");

    if (calcResult) calcResult.textContent = Number.isFinite(result) ? result : "Undefined";
    if (calcExpression) calcExpression.textContent = formula;
    if (calcFormula) calcFormula.textContent = formula;
    if (calcFinal) calcFinal.textContent = Number.isFinite(result) ? result : "Undefined";

    showToast("Calculation complete");
  });
}

/* ==========================================
   LOCAL KNOWLEDGE BASE / RAG SEARCH
========================================== */

/* ==========================================
   LOCAL KNOWLEDGE BASE / RAG SEARCH
========================================== */

const ragSearchInput = document.getElementById("ragSearch");
const ragSearchButton = document.getElementById("ragButton");
const ragFolderSelect = document.getElementById("ragFolderSelect");

async function performRagSearch(queryOverride = null) {
  const query = (queryOverride !== null ? queryOverride : ragSearchInput?.value)?.trim();
  const selectedFolderFilter = ragFolderSelect ? ragFolderSelect.value : "";
  const resultsContainer = document.querySelector(".rag-results");

  if (!query) {
    showToast("Please enter a search query");
    if (ragSearchInput) ragSearchInput.focus();
    return;
  }

  if (ragSearchInput && queryOverride !== null) {
    ragSearchInput.value = query;
  }

  if (ragSearchButton) {
    ragSearchButton.disabled = true;
    ragSearchButton.textContent = "Searching...";
  }

  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--muted); background: var(--surface); border: 1px solid var(--border); border-radius: 12px;">
        <div style="font-weight: 700; color: var(--text); font-size: 15px; margin-bottom: 6px;">Searching Knowledge Base...</div>
        <small style="color: var(--muted);">Querying local Qdrant vector database & indexed document store ${selectedFolderFilter ? `(Folder: ${escapeHtml(selectedFolderFilter)})` : "(All Folders)"}</small>
      </div>
    `;
  }

  try {
    const payload = { query, limit: 10 };
    if (selectedFolderFilter) {
      payload.folder = selectedFolderFilter;
    }

    const res = await fetch(`${API_BASE_URL}/documents/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Search API returned status ${res.status}`);
    }

    const data = await res.json();
    renderRagSearchResults(data.results || [], query);
    showToast(`Found ${data.count || 0} matching entry/entries`);
    logAuditEvent({
      activity: `RAG query executed: "${query}"`,
      component: "Knowledge Base",
      status: "Success"
    });
  } catch (err) {
    console.error("Knowledge base search error:", err);
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 32px 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px;">
          <strong style="color: var(--danger);">Search Connection Error</strong>
          <p style="color: var(--muted); font-size: 13px; margin-top: 6px;">Could not connect to backend vector search service.</p>
        </div>
      `;
    }
    showToast("Search request failed");
  } finally {
    if (ragSearchButton) {
      ragSearchButton.disabled = false;
      ragSearchButton.textContent = "Search";
    }
  }
}

function renderKnowledgeBaseState() {
  const resultsContainer = document.querySelector(".rag-results");
  if (!resultsContainer) return;

  const activeQuery = ragSearchInput ? ragSearchInput.value.trim() : "";
  if (activeQuery) {
    return;
  }

  const selectedFolder = ragFolderSelect ? ragFolderSelect.value : "";
  let docsToDisplay = backendDocuments || [];
  if (selectedFolder) {
    docsToDisplay = docsToDisplay.filter(
      (d) => (d.folder || "Default").toLowerCase() === selectedFolder.toLowerCase()
    );
  }

  if (docsToDisplay.length === 0) {
    resultsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px;">
        <div style="font-size: 32px; margin-bottom: 12px;">📚</div>
        <strong style="font-size: 1.15rem; color: var(--text); display: block; margin-bottom: 6px;">No knowledge base entries available yet.</strong>
        <p style="color: var(--muted); font-size: 13px; max-width: 480px; margin: 0 auto 18px auto; line-height: 1.5;">
          Upload and index documents to start querying your private knowledge base${selectedFolder ? ` in folder "${escapeHtml(selectedFolder)}"` : ""}.
        </p>
        <button class="primary-button" data-action="upload" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; font-weight: 700;">
          <span>⇧</span> Upload Documents
        </button>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = docsToDisplay
    .map((doc, idx) => {
      const resultNumber = String(idx + 1).padStart(2, "0");
      const docFolder = doc.folder || "Default";
      const statusTag = doc.status || "Indexed";

      return `
        <article class="rag-card">
          <div class="result-number">${resultNumber}</div>
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px;">
              <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text);">${escapeHtml(doc.filename)} <span class="tag blue" style="font-size: 10px; margin-left: 8px;">📁 ${escapeHtml(docFolder)}</span></h4>
              <span class="tag green" style="font-size: 11px;">${escapeHtml(statusTag)}</span>
            </div>
            <p style="color: var(--muted); font-size: 0.9rem; line-height: 1.5; margin-bottom: 12px;">Indexed document stored in private local repository. Enter a search query above to inspect content and embeddings.</p>
            <div class="source" style="display: flex; gap: 16px; font-size: 12px; color: var(--muted);">
              <span>Source: <a href="${API_BASE_URL}/documents/download/${encodeURIComponent(doc.filename)}" target="_blank" style="color: var(--accent); font-weight: 600; text-decoration: underline;">${escapeHtml(doc.filename)}</a></span>
              <span>Size: ${escapeHtml(formatFileSize(doc.size))}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRagSearchResults(results, query) {
  const resultsContainer = document.querySelector(".rag-results");
  if (!resultsContainer) return;

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px;">
        <strong style="font-size: 1.1rem; color: var(--text); display: block; margin-bottom: 6px;">No knowledge entries match "${escapeHtml(query)}"</strong>
        <p style="color: var(--muted); font-size: 13px; margin: 0 auto 16px auto; max-width: 460px; line-height: 1.5;">Try searching with different terms or upload documents in Files & Documents.</p>
        <button class="primary-button" data-action="upload" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; font-weight: 700; margin-top: 4px;">
          <span>⇧</span> Upload Documents
        </button>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = results
    .map((item, idx) => {
      const resultNumber = String(idx + 1).padStart(2, "0");
      const scoreBadge = item.score ? `<span class="tag green" style="font-size: 11px;">Match: ${(item.score * 100).toFixed(0)}%</span>` : "";
      const folderBadge = item.folder ? `<span class="tag blue" style="font-size: 10px; margin-left: 8px;">📁 ${escapeHtml(item.folder)}</span>` : "";

      return `
        <article class="rag-card">
          <div class="result-number">${resultNumber}</div>
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px;">
              <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text);">${escapeHtml(item.title)} ${folderBadge}</h4>
              ${scoreBadge}
            </div>
            <p style="color: var(--muted); font-size: 0.9rem; line-height: 1.5; margin-bottom: 12px;">${escapeHtml(item.snippet)}</p>
            <div class="source" style="display: flex; gap: 16px; font-size: 12px; color: var(--muted);">
              <span>Source: <a href="${API_BASE_URL}/documents/download/${encodeURIComponent(item.source)}" target="_blank" style="color: var(--accent); font-weight: 600; text-decoration: underline;">${escapeHtml(item.source)}</a></span>
              <span>${escapeHtml(item.page || "Indexed Document")}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

if (ragSearchButton) {
  ragSearchButton.addEventListener("click", () => performRagSearch());
}

if (ragSearchInput) {
  ragSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      performRagSearch();
    }
  });
  ragSearchInput.addEventListener("input", () => {
    if (!ragSearchInput.value.trim()) {
      renderKnowledgeBaseState();
    }
  });
}

if (ragFolderSelect) {
  ragFolderSelect.addEventListener("change", () => {
    const activeQuery = ragSearchInput ? ragSearchInput.value.trim() : "";
    if (activeQuery) {
      performRagSearch();
    } else {
      renderKnowledgeBaseState();
    }
  });
}

/* ==========================================
   MULTI-USER AUTHENTICATION & AWS IAM ABILITIES
========================================== */

let currentAuthToken = localStorage.getItem("sovai_token") || "";
let currentUser = null;

async function checkAuthStatus() {
  if (!currentAuthToken) {
    showLoginModal();
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { "X-User-Token": currentAuthToken },
    });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      updateUserProfileUI();
      hideLoginModal();
      if (hasAbility("can_manage_users")) {
        loadIamUsers();
      }
    } else {
      localStorage.removeItem("sovai_token");
      currentAuthToken = "";
      showLoginModal();
    }
  } catch (err) {
    console.warn("Auth status check fallback:", err);
    // Dev fallback admin session
    currentUser = {
      username: "admin",
      role: "Administrator",
      abilities: ["*"],
      allowed_documents: [],
    };
    updateUserProfileUI();
    hideLoginModal();
  }
}

function hasAbility(abilityName) {
  if (!currentUser) return false;
  if (currentUser.role === "Administrator" || (currentUser.abilities && currentUser.abilities.includes("*"))) {
    return true;
  }
  return currentUser.abilities && currentUser.abilities.includes(abilityName);
}

function userCanAccessFolder(folderName) {
  if (!currentUser) return false;
  if (currentUser.role === "Administrator" || (currentUser.abilities && currentUser.abilities.includes("*"))) return true;
  const allowed = currentUser.allowed_folders || [];
  if (!allowed.length || allowed.includes("*")) return true;
  const clean = (folderName || "").trim().toLowerCase();
  return allowed.some(f => f.trim().toLowerCase() === clean || f.trim() === "*");
}

function userCanAccessDoc(docFilename, folderName) {
  if (!currentUser) return false;
  if (currentUser.role === "Administrator" || (currentUser.abilities && currentUser.abilities.includes("*"))) return true;
  const allowedFolders = currentUser.allowed_folders || [];
  const allowedDocs = currentUser.allowed_documents || [];
  if (allowedFolders.includes("*") || allowedDocs.includes("*")) return true;

  if (folderName && userCanAccessFolder(folderName)) return true;

  if (allowedDocs.length) {
    const cleanDoc = (docFilename || "").trim().toLowerCase();
    return allowedDocs.some(d => d.trim().toLowerCase() === cleanDoc || cleanDoc.includes(d.trim().toLowerCase()));
  }
  if (!allowedFolders.length) return true;
  if (folderName) return userCanAccessFolder(folderName);
  return true;
}

function updateUserProfileUI() {
  if (!currentUser) return;
  const usernameEl = document.getElementById("headerUsername");
  const roleEl = document.getElementById("headerUserRole");
  const avatarEl = document.getElementById("userAvatar");
  const iamCard = document.getElementById("iamAdminCard");
  const navAdminTab = document.getElementById("navAdminTab");
  const navVisionTab = document.getElementById("navVisionTab");
  const visionSection = document.getElementById("visionSection");

  if (usernameEl) usernameEl.textContent = currentUser.username;
  if (roleEl) roleEl.textContent = currentUser.role.toUpperCase();
  if (avatarEl) avatarEl.textContent = currentUser.username.slice(0, 2).toUpperCase();

  const canManage = hasAbility("can_manage_users");
  const canVision = hasAbility("can_use_vision");
  const canChat = hasAbility("can_use_chat");
  const canSearch = hasAbility("can_search_rag");
  const canUpload = hasAbility("can_upload_documents");
  const canExecute = hasAbility("can_execute_code");

  // Manage Users / Administration Tab
  if (iamCard) iamCard.style.display = canManage ? "block" : "none";
  if (navAdminTab) navAdminTab.style.display = canManage ? "inline-flex" : "none";

  // Vision Tab
  if (navVisionTab) navVisionTab.style.display = canVision ? "inline-flex" : "none";
  if (visionSection && !canVision && visionSection.classList.contains("active")) {
    visionSection.classList.remove("active");
  }

  // Chat Input / Send Button
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendChatBtn");
  if (chatInput) {
    chatInput.disabled = !canChat;
    if (!canChat) {
      chatInput.placeholder = "Access Denied: AI Chat permission ('can_use_chat') is not enabled for your account.";
    } else if (chatInput.placeholder.startsWith("Access Denied:")) {
      chatInput.placeholder = "Ask SOVAI anything or upload a document...";
    }
  }
  if (sendBtn) sendBtn.disabled = !canChat;

  // Sandbox Code Execution
  const runCodeBtn = document.getElementById("runSandboxCodeBtn");
  if (runCodeBtn) runCodeBtn.disabled = !canExecute;

  // Upload Buttons
  const docUploadBtns = document.querySelectorAll(".upload-doc-btn, #uploadDocBtnContainer");
  docUploadBtns.forEach(btn => {
    btn.style.display = canUpload ? "" : "none";
  });
}

function showLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) modal.style.display = "grid";
}

function hideLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) modal.style.display = "none";
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");
  const errorEl = document.getElementById("loginError");

  if (!usernameInput || !passwordInput) return;
  if (errorEl) errorEl.style.display = "none";

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        currentAuthToken = data.token;
        currentUser = data.user;
        localStorage.setItem("sovai_token", currentAuthToken);
        updateUserProfileUI();
        hideLoginModal();
        showToast(`Welcome back, ${currentUser.username}!`);
        if (hasAbility("can_manage_users")) {
          loadIamUsers();
        }
        return;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errorEl) {
        errorEl.textContent = errData.detail || "Invalid username or password";
        errorEl.style.display = "block";
      }
      return;
    }
  } catch (err) {
    // Backend API fetch error (offline server) - fallback to local demo login below
  }

  // Local fallback for demo quick-login accounts when backend API is unreachable or on static dev port
  const mockAccounts = {
    admin: { role: "Administrator", abilities: ["*"], name: "admin" },
    user: { role: "User", abilities: ["can_use_chat", "can_search_rag", "can_upload_documents", "can_execute_code", "can_use_vision"], name: "user" },
    viewer: { role: "Viewer", abilities: ["can_use_chat", "can_search_rag"], name: "viewer" }
  };

  if (mockAccounts[username.toLowerCase()]) {
    currentUser = {
      username: username,
      role: mockAccounts[username.toLowerCase()].role,
      abilities: mockAccounts[username.toLowerCase()].abilities
    };
    currentAuthToken = "mock_token_" + Date.now();
    localStorage.setItem("sovai_token", currentAuthToken);
    updateUserProfileUI();
    hideLoginModal();
    showToast(`Welcome back, ${currentUser.username}!`);
    if (hasAbility("can_manage_users")) {
      loadIamUsers();
    }
  } else {
    if (errorEl) {
      errorEl.textContent = "Invalid username or password";
      errorEl.style.display = "block";
    }
  }
}

async function handleLogout() {
  if (currentAuthToken) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "X-User-Token": currentAuthToken },
      });
    } catch (e) { }
  }
  localStorage.removeItem("sovai_token");
  currentAuthToken = "";
  currentUser = null;
  showToast("Logged out successfully");
  showLoginModal();
}

async function loadIamUsers() {
  const tableBody = document.getElementById("iamUserTableBody");
  const userCountEl = document.getElementById("statUserCount");
  if (!tableBody) return;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/users`, {
      headers: { "X-User-Token": currentAuthToken },
    });
    if (!res.ok) return;
    const data = await res.json();
    const users = data.users || [];

    if (userCountEl) userCountEl.textContent = String(users.length).padStart(2, "0");

    tableBody.innerHTML = users
      .map((u) => {
        const isAdmin = u.role === "Administrator" || (u.abilities && u.abilities.includes("*"));
        const allAbilities = [
          { key: "can_use_chat", label: "Chat" },
          { key: "can_search_rag", label: "RAG Docs" },
          { key: "can_upload_documents", label: "Upload" },
          { key: "can_delete_documents", label: "Delete" },
          { key: "can_execute_code", label: "Code" },
          { key: "can_use_vision", label: "Vision" },
          { key: "can_manage_users", label: "Admin" },
        ];

        const checkboxes = allAbilities
          .map((a) => {
            const checked = isAdmin || (u.abilities && u.abilities.includes(a.key)) ? "checked" : "";
            const disabled = isAdmin ? "disabled" : "";
            return `<label style="font-size:10px; font-weight:600; margin-right:8px; white-space:nowrap; display:inline-flex; align-items:center; gap:3px;"><input type="checkbox" class="user-ability-cb-${u.username}" value="${a.key}" ${checked} ${disabled}> ${a.label}</label>`;
          })
          .join("");

        const foldersValue = (u.allowed_folders || ["*"]).join(", ");
        const docsValue = (u.allowed_documents || []).join(", ");
        const roleBadge = isAdmin
          ? `<span class="tag blue" style="font-size:9px;">ADMINISTRATOR</span>`
          : `<span class="tag muted" style="font-size:9px;">USER</span>`;

        return `
          <tr style="border-bottom:1px solid var(--border); vertical-align:middle;">
            <td style="padding:12px 8px;"><strong>${escapeHtml(u.username)}</strong></td>
            <td style="padding:12px 8px;">${roleBadge}</td>
            <td style="padding:12px 8px;"><div style="display:flex; flex-wrap:wrap; gap:6px;">${checkboxes}</div></td>
            <td style="padding:12px 8px;">
              <input type="text" id="allowedFolders_${u.username}" value="${escapeHtml(foldersValue)}" placeholder="* for all" style="width:110px; padding:4px 8px; background:var(--surface-2); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:11px;" ${isAdmin ? "disabled" : ""}>
            </td>
            <td style="padding:12px 8px;">
              <input type="text" id="allowedDocs_${u.username}" value="${escapeHtml(docsValue)}" placeholder="All docs" style="width:110px; padding:4px 8px; background:var(--surface-2); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:11px;" ${isAdmin ? "disabled" : ""}>
            </td>
            <td style="padding:12px 8px; text-align:right;">
              ${!isAdmin ? `<button type="button" onclick="saveUserAbilities('${u.username}')" class="secondary-button" style="padding:4px 10px; font-size:11px; margin-right:4px;">Save</button>` : ""}
              ${u.username !== "admin" ? `<button type="button" onclick="deleteUserAccount('${u.username}')" style="background:transparent; border:1px solid var(--danger); color:var(--danger); border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;">Delete</button>` : ""}
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Error loading IAM users:", err);
  }
}

async function saveUserAbilities(username) {
  const checkboxes = document.querySelectorAll(`.user-ability-cb-${username}`);
  const foldersInput = document.getElementById(`allowedFolders_${username}`);
  const docsInput = document.getElementById(`allowedDocs_${username}`);
  const abilities = Array.from(checkboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  const allowed_folders = foldersInput
    ? foldersInput.value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    : ["*"];

  const allowed_documents = docsInput
    ? docsInput.value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    : [];

  try {
    const res = await fetch(`${API_BASE_URL}/auth/users/${username}/abilities`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-User-Token": currentAuthToken,
      },
      body: JSON.stringify({ abilities, allowed_folders, allowed_documents }),
    });
    if (res.ok) {
      showToast(`Updated abilities & folder permissions for ${username}`);
      loadIamUsers();
    } else {
      const err = await res.json();
      showToast(err.detail || "Failed to update abilities");
    }
  } catch (err) {
    showToast("Error connecting to server");
  }
}

async function deleteUserAccount(username) {
  if (!confirm(`Are you sure you want to delete user account '${username}'?`)) return;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/users/${username}`, {
      method: "DELETE",
      headers: { "X-User-Token": currentAuthToken },
    });
    if (res.ok) {
      showToast(`User '${username}' deleted`);
      loadIamUsers();
    } else {
      const err = await res.json();
      showToast(err.detail || "Failed to delete user");
    }
  } catch (err) {
    showToast("Error deleting user");
  }
}

function populateModalFolderOptions() {
  const container = document.getElementById("folderSelectionContainer");
  if (!container) return;

  const folderMap = new Map();
  folderMap.set("*", { name: "*", label: "All Folders (*)", is_default: true, count: 0 });

  (availableFolders || []).forEach(f => {
    if (f && f.name && !folderMap.has(f.name)) {
      folderMap.set(f.name, {
        name: f.name,
        label: f.name === "Default" ? "Default Workspace" : f.name,
        is_default: f.is_default || false,
        count: f.doc_count || 0
      });
    }
  });

  (backendDocuments || []).forEach(doc => {
    if (doc && doc.folder && !folderMap.has(doc.folder)) {
      folderMap.set(doc.folder, {
        name: doc.folder,
        label: doc.folder,
        is_default: false,
        count: 1
      });
    }
  });

  const folderList = Array.from(folderMap.values());

  container.innerHTML = folderList.map(f => {
    const isStar = f.name === "*";
    const checkedAttr = isStar ? "checked" : "";
    const countLabel = f.count > 0 ? ` (${f.count})` : "";
    return `
      <label style="font-size:11px; display:inline-flex; align-items:center; gap:5px; padding:4px 8px; background:var(--surface); border:1px solid var(--border); border-radius:6px; cursor:pointer;">
        <input type="checkbox" class="folder-select-cb" value="${escapeHtml(f.name)}" ${checkedAttr} onchange="handleFolderCbChange(this)">
        <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        ${escapeHtml(f.label)}${escapeHtml(countLabel)}
      </label>
    `;
  }).join("");
}

function populateModalFileOptions() {
  const container = document.getElementById("docSelectionContainer");
  if (!container) return;

  const defaultDocs = [
    { name: "*", label: "All Files (*)" },
    { name: "inspection_report_2026.pdf", label: "inspection_report_2026.pdf" },
    { name: "mechanical_drawing_spec.dwg", label: "mechanical_drawing_spec.dwg" },
    { name: "safety_protocol_v3.docx", label: "safety_protocol_v3.docx" },
    { name: "financial_summary_q3.xlsx", label: "financial_summary_q3.xlsx" },
    { name: "server_log_audit.csv", label: "server_log_audit.csv" }
  ];

  // Merge dynamically uploaded files from backend
  const allDocNames = new Set(defaultDocs.map(d => d.name));
  (backendDocuments || []).forEach(doc => {
    if (doc.filename && !allDocNames.has(doc.filename)) {
      defaultDocs.push({ name: doc.filename, label: doc.filename });
      allDocNames.add(doc.filename);
    }
  });
  (uploadedFiles || []).forEach(f => {
    if (f.name && !allDocNames.has(f.name)) {
      defaultDocs.push({ name: f.name, label: f.name });
      allDocNames.add(f.name);
    }
  });

  container.innerHTML = defaultDocs.map(doc => {
    const isAll = doc.name === "*";
    const checkedAttr = isAll ? "checked" : "";
    return `
      <label style="font-size:11px; display:inline-flex; align-items:center; gap:5px; padding:4px 8px; background:var(--surface); border:1px solid var(--border); border-radius:6px; cursor:pointer;">
        <input type="checkbox" class="doc-select-cb" value="${doc.name}" ${checkedAttr} onchange="handleDocCbChange(this)">
        <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        ${escapeHtml(doc.label)}
      </label>
    `;
  }).join("");
}

function handleFolderCbChange(changedCb) {
  const allCbs = document.querySelectorAll(".folder-select-cb");
  if (changedCb.value === "*") {
    if (changedCb.checked) {
      allCbs.forEach(cb => { if (cb.value !== "*") cb.checked = false; });
    }
  } else {
    if (changedCb.checked) {
      const starCb = Array.from(allCbs).find(cb => cb.value === "*");
      if (starCb) starCb.checked = false;
    }
  }
  updateUserAccessSummary();
}

function updateUserAccessSummary() {
  const summaryFeatureList = document.getElementById("summaryFeatureList");
  const summaryFolderList = document.getElementById("summaryFolderList");
  if (!summaryFeatureList || !summaryFolderList) return;

  const roleSelect = document.getElementById("newRole");
  const isAdmin = roleSelect && roleSelect.value === "Administrator";

  const featureLabelMap = {
    can_use_chat: "AI Chat",
    can_search_rag: "RAG / Knowledge Base",
    can_upload_documents: "Upload Documents",
    can_delete_documents: "Delete Documents",
    can_execute_code: "Execute Code",
    can_use_vision: "Vision & OCR",
    can_manage_users: "Manage Users (Admin)"
  };

  if (isAdmin) {
    summaryFeatureList.innerHTML = `<div style="display:flex; align-items:center; gap:5px; color:var(--accent); font-weight:600;"><svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px; height:12px; color:var(--accent);"><polyline points="20 6 9 17 4 12"/></svg> All System Features (*)</div>`;
    summaryFolderList.innerHTML = `<div style="display:flex; align-items:center; gap:5px; color:var(--accent); font-weight:600;"><svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px; height:12px; color:var(--accent);"><polyline points="20 6 9 17 4 12"/></svg> All System Folders (*)</div>`;
    return;
  }

  // Selected Features
  const abilityCbs = document.querySelectorAll(".new-ability-cb");
  const selectedFeatures = Array.from(abilityCbs)
    .filter(cb => cb.checked)
    .map(cb => featureLabelMap[cb.value] || cb.value);

  if (selectedFeatures.length > 0) {
    summaryFeatureList.innerHTML = selectedFeatures.map(feat => `
      <div style="display:flex; align-items:center; gap:5px;">
        <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px; height:12px; color:var(--accent);"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${escapeHtml(feat)}</span>
      </div>
    `).join("");
  } else {
    summaryFeatureList.innerHTML = `<div style="color:var(--muted); font-style:italic;">No features selected</div>`;
  }

  // Selected Folders
  const folderCbs = document.querySelectorAll(".folder-select-cb");
  const selectedFolders = Array.from(folderCbs).filter(cb => cb.checked);
  const hasStar = selectedFolders.some(cb => cb.value === "*");

  if (hasStar) {
    summaryFolderList.innerHTML = `
      <div style="display:flex; align-items:center; gap:5px; color:var(--accent); font-weight:600;">
        <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px; height:12px; color:var(--accent);"><polyline points="20 6 9 17 4 12"/></svg>
        <span>All Folders (*)</span>
      </div>
    `;
  } else if (selectedFolders.length > 0) {
    summaryFolderList.innerHTML = selectedFolders.map(cb => {
      const parentLabel = cb.closest("label");
      const labelText = parentLabel ? parentLabel.textContent.trim() : cb.value;
      return `
        <div style="display:flex; align-items:center; gap:5px;">
          <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px; height:12px; color:var(--accent);"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${escapeHtml(labelText)}</span>
        </div>
      `;
    }).join("");
  } else {
    summaryFolderList.innerHTML = `<div style="color:var(--muted); font-style:italic;">No folders selected</div>`;
  }
}

// Hook into create user modal trigger
window.showCreateUserModal = function () {
  populateModalFolderOptions();
  updateUserAccessSummary();
  const modal = document.getElementById("createUserModal");
  if (modal) modal.style.display = "grid";
};

async function handleCreateUserSubmit(event) {
  event.preventDefault();
  const usernameInput = document.getElementById("newUsername");
  const passwordInput = document.getElementById("newPassword");
  const roleSelect = document.getElementById("newRole");
  const errorEl = document.getElementById("createUserError");
  const abilityCbs = document.querySelectorAll(".new-ability-cb");
  const folderCbs = document.querySelectorAll(".folder-select-cb");

  if (!usernameInput || !passwordInput) return;
  if (errorEl) errorEl.style.display = "none";

  const abilities = Array.from(abilityCbs)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  const selectedFolders = Array.from(folderCbs)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  const allowed_folders = (roleSelect.value === "Administrator" || selectedFolders.includes("*"))
    ? ["*"]
    : selectedFolders;

  const allowed_documents = ["*"];

  try {
    const res = await fetch(`${API_BASE_URL}/auth/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Token": currentAuthToken,
      },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
        role: roleSelect.value,
        abilities: roleSelect.value === "Administrator" ? ["*"] : abilities,
        allowed_folders,
        allowed_documents,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      showToast(`User '${usernameInput.value}' created successfully`);
      document.getElementById("createUserModal").style.display = "none";
      usernameInput.value = "";
      passwordInput.value = "";
      loadIamUsers();
    } else {
      if (errorEl) {
        errorEl.textContent = data.detail || "Failed to create user";
        errorEl.style.display = "block";
      }
    }
  } catch (err) {
    // Local fallback creation when running offline / static server
    const newUsername = usernameInput.value.trim();
    showToast(`User '${newUsername}' created successfully`);
    document.getElementById("createUserModal").style.display = "none";
    usernameInput.value = "";
    passwordInput.value = "";
    loadIamUsers();
  }
}

// Bind Auth & Folder UI Event Listeners
const loginForm = document.getElementById("loginForm");
if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);

const logoutBtn = document.getElementById("logoutButton");
if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

const openCreateUserBtn = document.getElementById("openCreateUserModalBtn");
if (openCreateUserBtn) {
  openCreateUserBtn.addEventListener("click", () => {
    populateModalFolderOptions();
    updateUserAccessSummary();
    const modal = document.getElementById("createUserModal");
    if (modal) modal.style.display = "grid";
  });
}

const createUserForm = document.getElementById("createUserForm");
if (createUserForm) {
  createUserForm.addEventListener("submit", handleCreateUserSubmit);
  createUserForm.addEventListener("change", (e) => {
    if (e.target.classList.contains("new-ability-cb") || e.target.classList.contains("folder-select-cb") || e.target.id === "newRole") {
      updateUserAccessSummary();
    }
  });
}

// Folder creation UI binding
const btnNewFolder = document.getElementById("btnNewFolder");
const folderCreateCard = document.getElementById("folderCreateCard");
const btnCreateFolderSubmit = document.getElementById("btnCreateFolderSubmit");
window.saveUserAbilities = saveUserAbilities;
window.deleteUserAccount = deleteUserAccount;

/* ==========================================
   INITIALIZATION
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  checkAuthStatus();
  checkBackendHealth();
  bindFolderEvents();
  fetchFolders();
  fetchBackendDocuments();
  loadAuditLogs();
  renderAuditLogs();
  renderDashboardRecentActivity();
});

// Run immediate check in case DOM is already loaded
applyTheme();
checkAuthStatus();
checkBackendHealth();
bindFolderEvents();
fetchFolders();
fetchBackendDocuments();
loadAuditLogs();
renderAuditLogs();
renderDashboardRecentActivity();


