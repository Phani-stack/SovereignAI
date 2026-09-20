/* ==========================================
   SOVEREIGN AI WORKBENCH - APP JS
========================================== */

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
const SIDEBAR_OVERLAY_MAX_WIDTH = 1100;

// State arrays
const uploadedFiles = [];
let chatAttachedFiles = [];
let pendingUploadContext = "files";
let visionAnalysisTimer;

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
      pendingUploadContext = action.closest(".chat-composer") ? "chat" : "files";
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
   FILE UPLOADS & DOCUMENT PROCESSING
========================================== */

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

function handleFiles(files, context = "files") {
  if (!files || !files.length) return;

  const newlyAdded = [];

  Array.from(files).forEach((file) => {
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
    }
    newlyAdded.push(file.name);

    addFileToTable(fileObj);
  });

  if (context === "chat") {
    renderChatAttachments();
  }

  // If in multimodal view, show vision preview for the last image/file
  const activeView = document.querySelector(".view.active")?.id;
  const lastFile = uploadedFiles[uploadedFiles.length - 1];

  if (activeView === "view-multimodal" || lastFile.type === "Image") {
    updateVisionPreview(lastFile);
  }

  showToast(`Uploaded ${newlyAdded.length} file${newlyAdded.length > 1 ? "s" : ""}: ${newlyAdded.slice(0, 2).join(", ")}${newlyAdded.length > 2 ? "..." : ""}`);
}

function addFileToTable(fileObj) {
  const fileTable = document.getElementById("fileTable");
  if (!fileTable) return;

  const row = document.createElement("div");
  row.className = "file-row";
  row.innerHTML = `
    <strong>${escapeHtml(fileObj.name)}</strong>
    <span>${escapeHtml(fileObj.type)}</span>
    <span>Local upload</span>
    <span class="tag ${fileObj.tagClass}">Indexed</span>
  `;

  fileTable.appendChild(row);
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
  if (!isImage) return;

  if (visionAnalysisTimer) clearInterval(visionAnalysisTimer);

  const analysisSteps = [
    ["Image loaded", "Input received inside the local workspace."],
    ["OCR text extraction", "Reading text and document structure."],
    ["Visual layout analysis", "Interpreting layout, symbols and context."],
    ["Analysis ready", "Results prepared for the current workspace."],
  ];

  if (analysisList) {
    analysisList.innerHTML = analysisSteps
      .map(
        ([title, detail]) => `
          <div class="analysis-status-row">
            <span class="analysis-status-icon">•</span>
            <div>
              <strong>${title}</strong>
              <small>${detail}</small>
            </div>
            <span class="analysis-status-state">Queued</span>
          </div>
        `
      )
      .join("");

    const rows = Array.from(analysisList.querySelectorAll(".analysis-status-row"));
    let currentStep = 0;

    const advanceAnalysis = () => {
      rows.forEach((row, index) => {
        const icon = row.querySelector(".analysis-status-icon");
        const state = row.querySelector(".analysis-status-state");
        const isComplete = index < currentStep;
        const isActive = index === currentStep && currentStep < rows.length;

        row.classList.toggle("is-complete", isComplete);
        row.classList.toggle("is-active", isActive);
        row.classList.toggle("is-pending", !isComplete && !isActive);

        if (icon) icon.textContent = isComplete ? "✓" : isActive ? "…" : "•";
        if (state) state.textContent = isComplete ? "Ready" : isActive ? "Analyzing" : "Queued";
      });

      currentStep += 1;
      if (currentStep > rows.length) clearInterval(visionAnalysisTimer);
    };

    advanceAnalysis();
    visionAnalysisTimer = setInterval(advanceAnalysis, 650);
  }

  let imageHtml = "";
  if (fileObj.previewUrl) {
    imageHtml = `
      <div class="vision-image-wrapper">
        <img src="${fileObj.previewUrl}" alt="${escapeHtml(fileObj.name)}" />
      </div>
    `;
  }

  let extractedSample = `[OCR Text Extraction - ${fileObj.name}]\n`;
  if (fileObj.type === "Image") {
    extractedSample += `Detected 1 document page / visual element.\nText lines detected: 14\nConfidence score: 98.6%\n\nSample content:\n"CONFIDENTIAL SPECIFICATION - REVISION 2.4\nENGINEERING CODE: SOVAI-2026\nSTATUS: APPROVED FOR ON-PREMISE INFERENCE"`;
  } else {
    extractedSample += `Parsed document structure.\nDocument Name: ${fileObj.name}\nSize: ${(fileObj.size / 1024).toFixed(1)} KB\nExtracted 3 sections, 12 paragraphs ready for RAG indexing.`;
  }

  previewArea.innerHTML = `
    <div class="vision-preview-card">
      <div class="vision-preview-header">
        <strong>Selected File: ${escapeHtml(fileObj.name)}</strong>
        <span class="tag ${fileObj.tagClass}">${escapeHtml(fileObj.type)}</span>
      </div>
      ${imageHtml}
      <div class="ocr-result-box">${escapeHtml(extractedSample)}</div>
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

// Drag & Drop for all upload zones
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
   AI CHAT MESSAGING
========================================== */

const chatInput = document.getElementById("chatInput");
const chatArea = document.getElementById("chatArea");
const sendChat = document.getElementById("sendChat");

function sendMessage() {
  if (!chatInput) return;

  const text = chatInput.value.trim();
  const hasAttachments = chatAttachedFiles.length > 0;

  if (!text && !hasAttachments) {
    return;
  }

  const welcome = chatArea?.querySelector(".chat-welcome");
  if (welcome) welcome.remove();

  const user = document.createElement("div");
  user.className = "chat-message user";

  let attachHtml = "";
  if (hasAttachments) {
    attachHtml = `
      <div class="chat-message-attachments">
        ${chatAttachedFiles
          .map(
            (f) =>
              `<div class="chat-message-attachment-item">📎 ${escapeHtml(f.name)} (${escapeHtml(f.type)})</div>`
          )
          .join("")}
      </div>
    `;
  }

  user.innerHTML = `
    <div class="message-label">You</div>
    <div class="message-content">
      <p>${text ? escapeHtml(text).replace(/\n/g, "<br>") : "<em>Uploaded file context for analysis</em>"}</p>
    </div>
    ${attachHtml}
  `;

  if (chatArea) {
    chatArea.appendChild(user);
    scrollChatToLatest();
  }

  chatInput.value = "";

  const attachedNames = chatAttachedFiles.map((f) => f.name);
  chatAttachedFiles = [];
  renderChatAttachments();

  setTimeout(() => {
    if (!chatArea) return;

    const assistant = document.createElement("div");
    assistant.className = "chat-message assistant";

    let responseText = "I have processed your message.";
    if (attachedNames.length) {
      const escapedAttachedNames = attachedNames.map((name) => escapeHtml(name)).join(", ");
      responseText = `I have received and indexed <strong>${attachedNames.length} document(s)</strong> (${escapedAttachedNames}). Context loaded into local RAG memory. ${text ? 'Regarding: "' + escapeHtml(text) + '"' : "Ready for analysis."}`;
    } else {
      responseText = `Local model response to: "<em>${escapeHtml(text)}</em>". All processing conducted on-premise without external network transmission.`;
    }

    assistant.innerHTML = `
      <div class="message-label">SOVAI</div>
      <div class="message-content">
        <p>${responseText}</p>
        <div class="message-meta">SOVAI · Local model · Local inference</div>
        <div class="message-actions">
          <button data-chat-action="copy">Copy</button>
          <button data-chat-action="regenerate">Regenerate</button>
          <button data-chat-action="save">Save</button>
        </div>
      </div>
    `;

    chatArea.appendChild(assistant);
    scrollChatToLatest();
    showToast("Response received from local engine");
  }, 450);
}

if (sendChat) sendChat.addEventListener("click", sendMessage);

if (chatInput) {
  const resizeChatInput = () => {
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
  };

  chatInput.addEventListener("input", resizeChatInput);
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

  if (action.dataset.chatAction === "save") {
    showToast("Response saved to this workspace");
  }

  if (action.dataset.chatAction === "regenerate") {
    showToast("Regeneration is ready for the connected local model");
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

    if (op === "add") {
      result = a + b;
      formula = `${a} + ${b} = ${result}`;
    } else if (op === "subtract") {
      result = a - b;
      formula = `${a} − ${b} = ${result}`;
    } else if (op === "multiply") {
      result = a * b;
      formula = `${a} × ${b} = ${result}`;
    } else if (op === "divide") {
      result = b === 0 ? NaN : a / b;
      formula = b === 0 ? "Division by zero is undefined." : `${a} ÷ ${b} = ${result}`;
    }

    const calcSteps = document.getElementById("calcSteps");
    const calcResult = document.getElementById("calcResult");
    const calcExpression = document.getElementById("calcExpression");
    const calcFormula = document.getElementById("calcFormula");
    const calcIntermediate = document.getElementById("calcIntermediate");
    const calcFinal = document.getElementById("calcFinal");
    const recentCalculationsEl = document.getElementById("recentCalculations");
    const unitA = document.getElementById("calcUnitA")?.value;
    const unitB = document.getElementById("calcUnitB")?.value;
    const operationLabels = {
      add: "Addition",
      subtract: "Subtraction",
      multiply: "Multiplication",
      divide: "Division",
      percentage: "Percentage",
      power: "Power",
      sqrt: "Square Root",
      average: "Average",
      ratio: "Ratio",
      efficiency: "Efficiency",
    };
    const operationSymbols = {
      add: "+",
      subtract: "−",
      multiply: "×",
      divide: "÷",
    };
    const resultText = Number.isFinite(result) ? formatNumber(result) : "Undefined";
    const expression = operationSymbols[op]
      ? `${a} ${operationSymbols[op]} ${b}`
      : operationLabels[op] || "Calculation";
    const formulaText = formula || "Not supported by the current calculation engine";
    const intermediateText = Number.isFinite(result)
      ? `${a}${unitA ? ` ${unitA}` : ""} ${operationSymbols[op] || "→"} ${b}${unitB ? ` ${unitB}` : ""}`
      : "Awaiting supported operation";

    if (calcSteps) {
      calcSteps.innerHTML = `
        <div class="calc-step">
          <span>1</span>
          <p>Input A = ${a}${unitA ? ` ${escapeHtml(unitA)}` : ""}</p>
        </div>
        <div class="calc-step">
          <span>2</span>
          <p>Input B = ${b}${unitB ? ` ${escapeHtml(unitB)}` : ""}</p>
        </div>
        <div class="calc-step">
          <span>3</span>
          <p>Operation = ${operationLabels[op] || "Unsupported operation"}</p>
        </div>
        <div class="calc-step">
          <span>4</span>
          <p>${Number.isFinite(result) ? escapeHtml(formula) : "No result returned for this operation."}</p>
        </div>
      `;
    }

    if (calcResult) {
      calcResult.textContent = resultText;
    }

    if (calcExpression) calcExpression.textContent = expression;
    if (calcFormula) calcFormula.textContent = formulaText;
    if (calcIntermediate) calcIntermediate.textContent = intermediateText;
    if (calcFinal) calcFinal.textContent = resultText;

    if (Number.isFinite(result) && recentCalculationsEl) {
      recentCalculations.unshift(`${expression} = ${resultText}`);
      recentCalculations.splice(4);
      recentCalculationsEl.innerHTML = recentCalculations
        .map((item) => `<p class="recent-calculation-item">${escapeHtml(item)}</p>`)
        .join("");
    }

    showToast("Calculation completed");
  });
}

const calcType = document.getElementById("calcType");
const engineeringFields = document.getElementById("engineeringFields");

if (calcType && engineeringFields) {
  calcType.addEventListener("change", () => {
    engineeringFields.hidden = calcType.value !== "engineering";
  });
}

document.querySelectorAll("[data-formula]").forEach((button) => {
  button.addEventListener("click", () => {
    if (calcType) calcType.value = "engineering";
    if (engineeringFields) engineeringFields.hidden = false;
    showToast(`${button.dataset.formula} selected as a UI template`);
  });
});

/* ==========================================
   CODING WORKSPACE / SANDBOX TERMINAL
========================================== */

const runCode = document.getElementById("runCode");

if (runCode) {
  runCode.addEventListener("click", () => {
    const codeEditor = document.getElementById("codeEditor");
    const terminal = document.getElementById("terminal");

    if (terminal) {
      terminal.textContent = `[Sandbox Execution Engine]
--------------------------------
Executing code locally...
Status: 0 Exit Code (Success)

Output:
85.0

Memory: 14.2 MB | CPU Time: 0.012s
Security boundary: Isolated Sandbox
`;
    }

    showToast("Sandbox script executed successfully");
  });
}

const codeEditor = document.getElementById("codeEditor");
const codeLineNumbers = document.getElementById("codeLineNumbers");
const clearTerminal = document.getElementById("clearTerminal");
const copyTerminal = document.getElementById("copyTerminal");
const terminal = document.getElementById("terminal");

function updateCodeLineNumbers() {
  if (!codeEditor || !codeLineNumbers) return;

  const lineCount = codeEditor.value.split("\n").length;
  codeLineNumbers.textContent = Array.from(
    { length: lineCount },
    (_, index) => index + 1
  ).join("\n");
  codeLineNumbers.scrollTop = codeEditor.scrollTop;
}

if (codeEditor) {
  codeEditor.addEventListener("input", updateCodeLineNumbers);
  codeEditor.addEventListener("scroll", updateCodeLineNumbers);
  updateCodeLineNumbers();
}

if (clearTerminal && terminal) {
  clearTerminal.addEventListener("click", () => {
    terminal.textContent = "Console cleared.";
  });
}

if (copyTerminal && terminal) {
  copyTerminal.addEventListener("click", () => {
    navigator.clipboard?.writeText(terminal.textContent);
    showToast("Console output copied");
  });
}

/* ==========================================
   RAG / KNOWLEDGE BASE SEARCH
========================================== */

const ragButton = document.getElementById("ragButton");
const ragSearch = document.getElementById("ragSearch");

function performRagSearch() {
  if (!ragSearch) return;

  const q = ragSearch.value.trim().toLowerCase();
  const cards = document.querySelectorAll(".rag-card");

  let matchCount = 0;

  cards.forEach((card) => {
    const text = card.textContent.toLowerCase();
    if (!q || text.includes(q)) {
      card.style.display = "grid";
      matchCount++;
    } else {
      card.style.display = "none";
    }
  });

  if (q) {
    showToast(`Found ${matchCount} result(s) for "${ragSearch.value.trim()}"`);
  } else {
    showToast("Showing all knowledge sources");
  }
}

if (ragButton) ragButton.addEventListener("click", performRagSearch);

if (ragSearch) {
  ragSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      performRagSearch();
    }
  });
}

/* ==========================================
   HELPERS & INITIALIZATION
========================================== */

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char];
  });
}

function formatNumber(value) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

applyTheme(localStorage.getItem("sovai-theme") || "system");
