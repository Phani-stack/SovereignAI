/* ==========================================
   SOVEREIGN AI WORKBENCH - APP JS
========================================== */

const API_BASE_URL = (window.location.origin && window.location.origin !== "null" && !window.location.origin.startsWith("file"))
  ? window.location.origin
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
    themeButton.textContent =
      choice === "light" ? "☀ Light" : choice === "dark" ? "☾ Dark" : "◐ System";
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

function navigate(view) {
  if (!pageNames[view]) return;

  document.querySelectorAll(".view").forEach((v) => {
    v.classList.remove("active");
  });

  const targetView = document.getElementById(`view-${view}`);
  if (targetView) targetView.classList.add("active");

  document.querySelectorAll(".nav-item").forEach((n) => {
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

  if (view === "files") {
    fetchBackendDocuments();
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

async function fetchBackendDocuments() {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && Array.isArray(data.documents)) {
      backendDocuments = data.documents;
      renderFileTable();
      updateDocumentStats();
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
      <span>Type</span>
      <span>Category / Uploaded</span>
      <span>Status</span>
      <span>Actions</span>
    </div>
  `;

  if (backendDocuments.length === 0) {
    const emptyRow = document.createElement("div");
    emptyRow.className = "file-row";
    emptyRow.innerHTML = `
      <strong style="grid-column: 1 / -1; text-align: center; color: var(--muted);">No documents uploaded yet.</strong>
    `;
    fileTable.appendChild(emptyRow);
    return;
  }

  backendDocuments.forEach((doc) => {
    const typeInfo = getFileTypeCategory(doc.filename);
    const row = document.createElement("div");
    row.className = "file-row";
    row.innerHTML = `
      <strong title="${escapeHtml(doc.filename)}">${escapeHtml(doc.filename)}</strong>
      <span>${escapeHtml(typeInfo.name)}</span>
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
    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      showToast(`Uploaded ${data.filename} to backend`);
      await fetchBackendDocuments();
      return data;
    } else {
      showToast("Upload failed");
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

function updateVisionPreview(fileObj) {
  const previewArea = document.getElementById("visionPreviewArea");
  const analysisPanel = document.getElementById("visionAnalysisPanel");
  const analysisList = document.getElementById("visionAnalysisList");
  const visionGrid = document.querySelector(".vision-grid");
  if (!previewArea) return;

  previewArea.style.display = "block";

  const isImage = fileObj.type === "Image";
  if (visionGrid) visionGrid.classList.toggle("has-analysis", isImage);
  if (analysisPanel) analysisPanel.style.display = isImage ? "block" : "none";

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

function plainTextToHtml(text) {
  if (text === null || text === undefined) return "";
  if (typeof text !== "string") {
    text = typeof text === "object" ? JSON.stringify(text, null, 2) : String(text);
  }
  if (!text.trim()) return "";

  let html = escapeHtml(text);

  // LaTeX Display Math
  html = html.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, '<div class="math-display" style="background:var(--surface-2); padding:8px 12px; border-radius:6px; font-family:monospace; margin:8px 0;">$1</div>');

  // Code Blocks
  html = html.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang.trim() || "code";
    const codeId = "code_" + Math.random().toString(36).substr(2, 9);
    return `<div class="code-block-container" style="margin: 12px 0; border-radius: 8px; border: 1px solid var(--border); overflow: hidden; background: #09090b;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: #18181b; border-bottom: 1px solid var(--border); font-family: monospace; font-size: 0.78rem; color: #a1a1aa;">
            <span>${language}</span>
            <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('${codeId}').innerText).then(() => { this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy', 2000); })" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #e4e4e7; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; cursor: pointer;">Copy</button>
        </div>
        <pre style="margin: 0; padding: 12px; overflow-x: auto; font-family: monospace; font-size: 0.88rem; line-height: 1.5; color: #f4f4f5;"><code id="${codeId}">${code.trim()}</code></pre>
    </div>`;
  });

  // Inline Code
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--surface-2); color:var(--text); padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.88em;">$1</code>');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 1.15rem; font-weight: 700; margin: 16px 0 8px 0;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 1.3rem; font-weight: 700; margin: 20px 0 10px 0;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 1.5rem; font-weight: 800; margin: 24px 0 12px 0;">$1</h1>');

  // Bold & Italics
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

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

  sendChat.textContent = generating ? "⏹ Stop" : "↗";
  sendChat.title = generating ? "Stop generating" : "Send message";
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
        <button data-chat-action="copy">Copy</button>
      </div>
    </div>
  `;

  if (chatArea) {
    chatArea.appendChild(assistantMsg);
    scrollChatToLatest();
  }

  const responseTextEl = assistantMsg.querySelector(".assistant-response-text");

  // Streaming Request to /chat/
  activeAbortController = new AbortController();
  setGeneratingState(true);

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
      setGeneratingState(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

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
  } catch (err) {
    if (err.name === "AbortError") {
      if (responseTextEl) responseTextEl.innerHTML += "<br><em>[Generation Stopped]</em>";
    } else {
      console.error("Streaming error:", err);
      if (responseTextEl) responseTextEl.innerHTML = `<span style="color:var(--danger)">Connection error. Ensure backend is running.</span>`;
    }
  } finally {
    activeAbortController = null;
    setGeneratingState(false);
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

  if (action.dataset.chatAction === "copy") {
    const content = message.querySelector(".message-content p")?.innerText || "";
    navigator.clipboard?.writeText(content);
    showToast("Response copied");
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

/* ==========================================
   VISION & OCR INTEGRATION
========================================== */

const runVisionBtn = document.getElementById("runVisionBtn");
const visionQueryInput = document.getElementById("visionQueryInput");

async function runVisionAnalysis() {
  const previewArea = document.getElementById("visionPreviewArea");
  const ocrBox = document.getElementById("visionOcrResult");
  const query = (visionQueryInput?.value?.trim()) || "Extract text and analyze image layout";

  const lastFile = uploadedFiles.filter(f => f.type === "Image")[0]?.file || null;

  if (ocrBox) ocrBox.textContent = "Processing image through local Vision engine...";

  try {
    const formData = new FormData();
    formData.append("query", query);
    if (lastFile) {
      formData.append("image", lastFile);
    }
    if (modelSelector) {
      formData.append("model", modelSelector.value);
    }

    const res = await fetch(`${API_BASE_URL}/vision/`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (ocrBox) ocrBox.innerHTML = plainTextToHtml(data.message);
      showToast("Vision analysis completed");
    } else {
      if (ocrBox) ocrBox.textContent = "Vision engine returned error response.";
    }
  } catch (err) {
    console.error("Vision analysis error:", err);
    if (ocrBox) ocrBox.textContent = "Failed to connect to Vision API endpoint.";
  }
}

if (runVisionBtn) runVisionBtn.addEventListener("click", runVisionAnalysis);

/* ==========================================
   CODING WORKSPACE / SANDBOX EXECUTOR
========================================== */

const runCode = document.getElementById("runCode");

if (runCode) {
  runCode.addEventListener("click", async () => {
    const codeEditor = document.getElementById("codeEditor");
    const terminal = document.getElementById("terminal");

    if (!codeEditor || !terminal) return;

    const code = codeEditor.value;
    terminal.textContent = "Running code in isolated local sandbox...";

    try {
      const res = await fetch(`${API_BASE_URL}/sandbox/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        const data = await res.json();
        const exitText = `Exit Code: ${data.exit_code} (${data.status.toUpperCase()})`;
        terminal.textContent = `[Sandbox Execution Result]
-----------------------------------------
Status: ${exitText}

${data.output}
`;
        showToast(`Sandbox execution ${data.status}`);
      } else {
        terminal.textContent = `Error: Sandbox API returned status ${res.status}`;
      }
    } catch (err) {
      console.error("Sandbox execution error:", err);
      terminal.textContent = `Connection error: Could not reach sandbox execution endpoint.`;
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
   INITIALIZATION
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  checkBackendHealth();
  fetchBackendDocuments();
});

// Run immediate check in case DOM is already loaded
applyTheme();
checkBackendHealth();
fetchBackendDocuments();
