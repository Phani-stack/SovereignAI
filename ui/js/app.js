const API_BASE_URL = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file'))
    ? window.location.origin
    : 'http://127.0.0.1:8000';

const appShell = document.getElementById('appShell');
const workspace = document.getElementById('workspace');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const agentPanel = document.getElementById('agentPanel');
const agentPanelToggle = document.getElementById('agentPanelToggle');
const agentPanelClose = document.getElementById('agentPanelClose');

const messageInput = document.getElementById('messageInput');
const composer = document.getElementById('composer');
const composerDropZone = document.getElementById('composerDropZone');
const sendBtn = document.getElementById('sendBtn');
const newTaskBtn = document.getElementById('newTaskBtn');
const voiceBtn = document.getElementById('voiceBtn');
const uploadChips = document.getElementById('uploadChips');
const messages = document.getElementById('messages');
const historySearch = document.getElementById('historySearch');
const modelSelector = document.getElementById('modelSelector');
const activeModelBadge = document.getElementById('activeModelBadge');
const verificationStatus = document.getElementById('verificationStatus');
const workspaceTitle = document.getElementById('workspaceTitle');
const documentUploadBtn = document.getElementById('documentUploadBtn');

// Attach & File Pickers
const attachWrapper = document.getElementById('attachWrapper');
const attachBtn = document.getElementById('attachBtn');
const attachMenu = document.getElementById('attachMenu');
const fileInputAll = document.getElementById('fileInputAll');
const fileInputDoc = document.getElementById('fileInputDoc');
const fileInputImg = document.getElementById('fileInputImg');
const fileInputCode = document.getElementById('fileInputCode');
const fileInputData = document.getElementById('fileInputData');
const fileInputFolder = document.getElementById('fileInputFolder');

// RAG Picker Modal
const ragPickerModal = document.getElementById('ragPickerModal');
const ragPickerClose = document.getElementById('ragPickerClose');
const ragPickerCancel = document.getElementById('ragPickerCancel');
const ragPickerSearch = document.getElementById('ragPickerSearch');
const ragPickerList = document.getElementById('ragPickerList');
const ragPickerAttachBtn = document.getElementById('ragPickerAttachBtn');
const ragSelectedCount = document.getElementById('ragSelectedCount');

// Account Card
const accountCard = document.getElementById('accountCard');
const accountTrigger = document.getElementById('accountTrigger');
const accountName = document.getElementById('accountName');
const accountRole = document.getElementById('accountRole');
const accountAvatar = document.getElementById('accountAvatar');
const accountLocalName = document.getElementById('accountLocalName');
const themeOptions = document.querySelectorAll('.theme-option');
const suggestionPrompts = document.querySelectorAll('.suggestion-prompt');

const acceptedExtensions = [
    'pdf', 'docx', 'doc', 'txt', 'md', 'rtf',
    'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif',
    'py', 'js', 'ts', 'json', 'sql', 'sh', 'cpp', 'c', 'java', 'rs', 'go', 'yml', 'yaml', 'html', 'css',
    'csv', 'xlsx', 'xls', 'tsv'
];

const mockKnowledgeBaseDocs = [
    { id: 'rag-1', name: 'Turbine_Maintenance_Manual_2024.pdf', type: 'doc', ext: 'PDF', size: 2516582, category: 'Maintenance', chunks: 142 },
    { id: 'rag-2', name: 'Safety_Protocol_ISO45001.docx', type: 'doc', ext: 'DOCX', size: 1153433, category: 'Safety & Compliance', chunks: 68 },
    { id: 'rag-3', name: 'Sensor_Telemetry_Schema.py', type: 'code', ext: 'PY', size: 46080, category: 'Automation', chunks: 12 },
    { id: 'rag-4', name: 'Vibration_Analysis_Log_Q3.csv', type: 'data', ext: 'CSV', size: 3984588, category: 'Diagnostics', chunks: 210 },
    { id: 'rag-5', name: 'Industrial_Inspection_Guidelines.pdf', type: 'doc', ext: 'PDF', size: 5452595, category: 'Inspection', chunks: 318 },
    { id: 'rag-6', name: 'Emergency_Shutdown_Procedures.docx', type: 'doc', ext: 'DOCX', size: 911360, category: 'Safety & Operations', chunks: 45 },
    { id: 'rag-7', name: 'Hydraulic_Pressure_Calibrations.xlsx', type: 'data', ext: 'XLSX', size: 1782579, category: 'Operations', chunks: 94 }
];

let selectedRagDocIds = new Set();
let backendIndexedDocuments = [];
const uploadedFiles = [];
const workstationsAccounts = [
    { name: 'Maya Lopez', initials: 'ML', role: 'Maintenance Engineer · Maintenance', localAccount: 'ENG-04' },
    { name: 'Noah Patel', initials: 'NP', role: 'Controls Engineer · Automation', localAccount: 'CTRL-02' },
    { name: 'Alicia Chen', initials: 'AC', role: 'Safety Engineer · Process Safety', localAccount: 'SAFE-01' }
];
let activeAccountIndex = 0;
let editingBubble = null;
let activeTaskLog = [];
let activeRequestController = null;
let activeRequestId = 0;
let isGenerating = false;
let activeAssistantMessage = null;

function setGeneratingState(generating) {
    isGenerating = generating;
    if (!sendBtn) return;

    sendBtn.textContent = generating ? '' : 'Send';
    sendBtn.classList.toggle('stop-button', generating);
    sendBtn.setAttribute('aria-label', generating ? 'Stop generating response' : 'Send message');
    sendBtn.title = generating ? 'Stop generating' : 'Send message';
    updateSendState();
}

function stopActiveGeneration() {
    if (!activeRequestController) return;

    activeRequestId += 1;
    activeRequestController.abort();
    activeRequestController = null;

    if (activeAssistantMessage) {
        const bubble = activeAssistantMessage.querySelector('.message-bubble');
        const currentText = bubble?.innerText?.trim() || '';
        const stoppedText = !currentText || currentText === 'Thinking...'
            ? 'Stopped.'
            : `${currentText}\n\nStopped.`;
        updateAssistantMessage(activeAssistantMessage, stoppedText);
        updateThinkingTrace(activeAssistantMessage, 'Generation stopped', 'error');
        activeAssistantMessage = null;
    }

    setGeneratingState(false);
    if (verificationStatus) verificationStatus.textContent = 'Stopped';
}

async function fetchBackendDocuments() {
    try {
        const response = await fetch(`${API_BASE_URL}/documents/`);
        if (!response.ok) return;
        const data = await response.json();
        if (data && Array.isArray(data.documents)) {
            backendIndexedDocuments = data.documents;
            renderDocumentsView();
        }
    } catch (err) {
        console.warn('Failed to fetch backend documents:', err);
    }
}

async function deleteBackendDocument(filename) {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;
    try {
        const response = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            backendIndexedDocuments = backendIndexedDocuments.filter(d => d.filename !== filename);
            renderDocumentsView();
            await fetchBackendDocuments();
            if (verificationStatus) verificationStatus.textContent = 'Document deleted';
        } else {
            alert('Failed to delete document from backend.');
        }
    } catch (err) {
        console.error('Delete document error:', err);
    }
}

const models = {
    auto: {
        label: 'Auto',
        responseLabel: 'Qwen3:4B',
        reason: 'Auto mode selects Chat / RAG, Code, or Vision / OCR based on task content.'
    },
    qwen3: {
        label: 'Qwen3:4B',
        responseLabel: 'Qwen3:4B',
        reason: 'Selected for Chat / RAG because the prompt needs local knowledge retrieval.'
    },
    coder: {
        label: 'Qwen2.5-Coder:3B',
        responseLabel: 'Qwen2.5-Coder:3B',
        reason: 'Selected for code generation, repair, and sandbox-oriented tasks.'
    },
    engineering: {
        label: 'Qwen3:4B · Engineering',
        responseLabel: 'Qwen3:4B',
        reason: 'Selected for engineering calculations, mathematics, formulas, and unit-aware analysis.'
    },
    vision: {
        label: 'Qwen2.5-VL:3B',
        responseLabel: 'Qwen2.5-VL:3B',
        reason: 'Selected for vision, OCR, scanned documents, and image understanding.'
    }
};

/* Format file size */
function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* Get file category & meta */
function getFileCategory(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext) || (file.type && file.type.startsWith('image/'))) {
        return { category: 'image', icon: '🖼️', label: ext.toUpperCase() || 'IMG' };
    }
    if (['pdf'].includes(ext)) {
        return { category: 'pdf', icon: '📄', label: 'PDF' };
    }
    if (['docx', 'doc', 'txt', 'md', 'rtf'].includes(ext)) {
        return { category: 'doc', icon: '📝', label: ext.toUpperCase() };
    }
    if (['py', 'js', 'ts', 'json', 'sql', 'sh', 'cpp', 'c', 'java', 'rs', 'go', 'yml', 'yaml', 'html', 'css'].includes(ext)) {
        return { category: 'code', icon: '💻', label: ext.toUpperCase() };
    }
    if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) {
        return { category: 'data', icon: '📊', label: ext.toUpperCase() };
    }
    return { category: 'file', icon: '📁', label: ext.toUpperCase() || 'FILE' };
}

/* Sidebar & Drawer Toggle Handlers */
function toggleSidebar() {
    if (window.innerWidth <= 820) {
        const isOpen = sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    } else {
        appShell.classList.toggle('sidebar-collapsed');
    }
}

function openSidebar() {
    if (window.innerWidth <= 820) {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        appShell.classList.remove('sidebar-collapsed');
    }
}

function closeSidebar() {
    if (window.innerWidth <= 820) {
        sidebar.classList.remove('active');
        if (!agentPanel.classList.contains('active')) {
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    } else {
        appShell.classList.add('sidebar-collapsed');
    }
}

function toggleAgentPanel() {
    if (window.innerWidth <= 1180) {
        const isOpen = agentPanel.classList.toggle('active');
        sidebarOverlay.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    } else {
        appShell.classList.toggle('right-panel-collapsed');
        workspace?.classList.toggle('panel-collapsed');
    }
}

function openAgentPanel() {
    if (window.innerWidth <= 1180) {
        agentPanel.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        appShell.classList.remove('right-panel-collapsed');
        workspace?.classList.remove('panel-collapsed');
    }
}

function closeAgentPanel() {
    if (window.innerWidth <= 1180) {
        agentPanel.classList.remove('active');
        if (!sidebar.classList.contains('active')) {
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    } else {
        appShell.classList.add('right-panel-collapsed');
        workspace?.classList.add('panel-collapsed');
    }
}

function closeDrawers() {
    sidebar.classList.remove('active');
    agentPanel.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
    closeAttachMenu();
    closeRagPicker();
}

/* Attach Menu Handlers */
function toggleAttachMenu() {
    const isOpen = attachMenu.classList.toggle('open');
    attachBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function closeAttachMenu() {
    attachMenu?.classList.remove('open');
    attachBtn?.setAttribute('aria-expanded', 'false');
}

/* Adjust Textarea Height */
function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${Math.min(messageInput.scrollHeight, 150)}px`;
}

function updateSendState() {
    const hasText = messageInput.value.trim().length > 0;
    sendBtn.disabled = isGenerating ? false : (!hasText && uploadedFiles.length === 0 && !attachedImage);
}

function getSelectedModel() {
    return models[modelSelector.value] || models.auto;
}

function updateModelRouting() {
    const model = getSelectedModel();
    activeModelBadge.textContent = model.label;
}

function setTheme(theme) {
    const selectedTheme = theme || 'system';
    document.documentElement.dataset.theme = selectedTheme;

    try {
        localStorage.setItem('sovai-theme', selectedTheme);
    } catch {
        // Theme remains active for this page load if storage is unavailable.
    }

    themeOptions.forEach((button) => {
        button.classList.toggle('active', button.dataset.theme === selectedTheme);
        button.setAttribute('aria-pressed', button.dataset.theme === selectedTheme ? 'true' : 'false');
    });
}

function renderUploadChips() {
    uploadChips.innerHTML = '';

    uploadedFiles.forEach((file, index) => {
        const chip = document.createElement('div');
        chip.className = 'file-chip';

        const fileMeta = getFileCategory(file);

        if (file.type && file.type.startsWith('image/')) {
            const image = document.createElement('img');
            image.alt = '';
            image.src = URL.createObjectURL(file);
            chip.appendChild(image);
        } else {
            const icon = document.createElement('span');
            icon.className = 'file-chip-icon';
            icon.textContent = fileMeta.icon;
            chip.appendChild(icon);
        }

        const name = document.createElement('span');
        name.className = 'file-chip-name';
        name.textContent = file.name;

        chip.appendChild(name);

        if (file.size) {
            const size = document.createElement('span');
            size.className = 'file-chip-size';
            size.textContent = formatFileSize(file.size);
            chip.appendChild(size);
        }

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.setAttribute('aria-label', `Remove ${file.name}`);
        remove.textContent = '✕';
        remove.addEventListener('click', (e) => {
            e.stopPropagation();
            uploadedFiles.splice(index, 1);
            renderUploadChips();
            updateSendState();
        });

        chip.appendChild(remove);
        uploadChips.appendChild(chip);
    });
}

function addFiles(fileList) {
    if (!fileList || !fileList.length) return;

    Array.from(fileList).forEach((file) => {
        const extension = file.name.split('.').pop().toLowerCase();
        if (acceptedExtensions.includes(extension)) {
            // Avoid duplicate additions
            const exists = uploadedFiles.some(f => f.name === file.name && f.size === file.size);
            if (!exists) {
                uploadedFiles.push(file);
            }
        }
    });

    renderUploadChips();
    updateSendState();
}

/* RAG Knowledge Base Modal */
function openRagPicker() {
    selectedRagDocIds.clear();
    ragPickerSearch.value = '';
    renderRagDocList();
    ragPickerModal.classList.add('open');
    ragPickerModal.setAttribute('aria-hidden', 'false');
    updateRagModalState();
    ragPickerSearch.focus();
}

function closeRagPicker() {
    ragPickerModal.classList.remove('open');
    ragPickerModal.setAttribute('aria-hidden', 'true');
}

function updateRagModalState() {
    const count = selectedRagDocIds.size;
    ragSelectedCount.textContent = `${count} document${count === 1 ? '' : 's'} selected`;
    ragPickerAttachBtn.disabled = count === 0;
}

function renderRagDocList() {
    const query = ragPickerSearch.value.trim().toLowerCase();
    ragPickerList.innerHTML = '';

    const backendAsRagDocs = backendIndexedDocuments.map(d => ({
        id: `backend-${d.filename}`,
        name: d.filename,
        type: 'doc',
        ext: d.filename.split('.').pop().toUpperCase() || 'DOC',
        size: d.size || 1024,
        category: 'Uploaded Storage',
        chunks: Math.max(1, Math.floor((d.size || 2048) / 512))
    }));

    const combined = [...backendAsRagDocs, ...mockKnowledgeBaseDocs];

    const filtered = combined.filter(doc => {
        return doc.name.toLowerCase().includes(query) || doc.category.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        ragPickerList.innerHTML = '<div class="empty-state"><p>No knowledge base documents matching your search.</p></div>';
        return;
    }

    filtered.forEach(doc => {
        const isSelected = selectedRagDocIds.has(doc.id);
        const item = document.createElement('div');
        item.className = `rag-item ${isSelected ? 'selected' : ''}`;

        let icon = '📄';
        if (doc.type === 'code') icon = '💻';
        else if (doc.type === 'data') icon = '📊';

        item.innerHTML = `
            <input type="checkbox" class="rag-item-checkbox" ${isSelected ? 'checked' : ''} aria-label="Select ${doc.name}">
            <div class="rag-item-icon">${icon}</div>
            <div class="rag-item-details">
                <strong class="rag-item-title">${doc.name}</strong>
                <div class="rag-item-meta">
                    <span>${doc.category}</span> · 
                    <span>${formatFileSize(doc.size)}</span> · 
                    <span>${doc.chunks} chunks</span>
                </div>
            </div>
        `;

        const checkbox = item.querySelector('.rag-item-checkbox');

        const toggleSelection = () => {
            if (selectedRagDocIds.has(doc.id)) {
                selectedRagDocIds.delete(doc.id);
            } else {
                selectedRagDocIds.add(doc.id);
            }
            item.classList.toggle('selected', selectedRagDocIds.has(doc.id));
            checkbox.checked = selectedRagDocIds.has(doc.id);
            updateRagModalState();
        };

        item.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                toggleSelection();
            }
        });

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedRagDocIds.add(doc.id);
            } else {
                selectedRagDocIds.delete(doc.id);
            }
            item.classList.toggle('selected', selectedRagDocIds.has(doc.id));
            updateRagModalState();
        });

        ragPickerList.appendChild(item);
    });
}

function attachSelectedRagDocs() {
    selectedRagDocIds.forEach(id => {
        const doc = mockKnowledgeBaseDocs.find(d => d.id === id);
        if (doc) {
            // Create a pseudo File object for RAG attached document
            const pseudoFile = new File([''], doc.name, {
                type: doc.type === 'doc' ? 'application/pdf' : 'text/plain',
                lastModified: Date.now()
            });
            Object.defineProperty(pseudoFile, 'size', { value: doc.size });
            pseudoFile.isRagKnowledge = true;

            const exists = uploadedFiles.some(f => f.name === pseudoFile.name);
            if (!exists) {
                uploadedFiles.push(pseudoFile);
            }
        }
    });

    closeRagPicker();
    renderUploadChips();
    updateSendState();
    messageInput.focus();
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeMathText(text) {
    return String(text || '')
        .replace(/&#x20;|&#32;|&nbsp;/gi, ' ')
        .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1) / ($2)')
        .replace(/\\text\{([^{}]*)\}/g, '$1')
        .replace(/\\mathrm\{([^{}]*)\}/g, '$1')
        .replace(/\\operatorname\{([^{}]*)\}/g, '$1')
        .replace(/\\dot\{m\}/g, 'ṁ')
        .replace(/\\Delta/g, 'Δ')
        .replace(/\\eta/g, 'η')
        .replace(/\\times|\\cdot/g, '×')
        .replace(/\\approx/g, '≈')
        .replace(/\\degree/g, '°')
        .replace(/\^\\circ/g, '°')
        .replace(/_\{\\text\{([^{}]*)\}\}/g, '_$1')
        .replace(/_\{([^{}]+)\}/g, '_$1')
        .replace(/\^\{([^{}]+)\}/g, '^$1')
        .replace(/\\boxed\{([^{}]+)\}/g, '$1')
        .replace(/\\boxed\{([^\n]+)\}/g, '$1')
        .replace(/\\\[|\\\]|\\\(|\\\)/g, '')
        .replace(/\\,/g, ' ')
        .replace(/\\%/g, '%');
}

function plainTextToHtml(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') {
        text = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
    }
    if (!text.trim()) return '';

    let html = escapeHtml(normalizeMathText(text));

    // Dependency-free display equations. The model is prompted to keep their
    // contents readable even when a full TeX renderer is unavailable.
    html = html.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, '<div class="math-display">$1</div>');

    // Fenced Code blocks with language label & Copy button
    html = html.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang.trim() || 'code';
        const codeId = 'code_' + Math.random().toString(36).substr(2, 9);
        return `<div class="code-block-container" style="margin: 12px 0; border-radius: 8px; border: 1px solid #27272a; overflow: hidden; background: #09090b; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: #18181b; border-bottom: 1px solid #27272a; font-family: monospace; font-size: 0.78rem; color: #a1a1aa;">
                <span>${language}</span>
                <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('${codeId}').innerText).then(() => { this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy', 2000); })" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #e4e4e7; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; cursor: pointer; transition: background 0.15s;">Copy</button>
            </div>
            <pre style="margin: 0; padding: 12px; overflow-x: auto; font-family: monospace; font-size: 0.88rem; line-height: 1.5; color: #f4f4f5;"><code id="${codeId}">${code.trim()}</code></pre>
        </div>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:#18181b; color:#e4e4e7; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.88em; border: 1px solid rgba(255,255,255,0.08);">$1</code>');

    // Markdown Headers
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 1.15rem; font-weight: 700; color: #f4f4f5; margin: 16px 0 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 4px;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 1.3rem; font-weight: 700; color: #f4f4f5; margin: 20px 0 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 1.5rem; font-weight: 800; color: #ffffff; margin: 24px 0 12px 0; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 8px;">$1</h1>');

    // Markdown Blockquotes
    html = html.replace(/^&gt;\s?(.*$)/gim, '<blockquote style="border-left: 3px solid #10b981; margin: 10px 0; padding: 8px 14px; background: rgba(16, 185, 129, 0.05); color: #d4d4d8; border-radius: 0 6px 6px 0;">$1</blockquote>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #f4f4f5; font-weight: 700;">$1</strong>');

    // Italics
    html = html.replace(/\*([^*]+)\*/g, '<em style="color: #e4e4e7;">$1</em>');

    // Bullet points
    html = html.replace(/^\s*[\-\*]\s+(.*)$/gm, '<li style="margin-left: 20px; margin-bottom: 4px; color: #e4e4e7;">$1</li>');

    // Newlines to <br>
    html = html.replace(/\n/g, '<br>');

    // Convert generated document file paths into direct downloadable UI cards
    const filePathRegex = /(?:(?:[A-Za-z]:[\\/]|data[\\/]outputs[\\/]|outputs[\\/]|storage[\\/])?[a-zA-Z0-9_-]+\.(?:pptx|docx|pdf|xlsx|csv))\b/gi;

    html = html.replace(filePathRegex, (match) => {
        if (/https?:\/\/|localhost|127\.0\.0\.1|:\d+/i.test(match)) {
            return match;
        }

        const filename = match.split(/[\\/]/).pop();
        if (!filename || !filename.includes('.')) return match;
        const ext = filename.split('.').pop().toUpperCase();
        if (!['PPTX', 'DOCX', 'PDF', 'XLSX', 'CSV'].includes(ext)) return match;

        let icon = '📄';
        let badgeBg = 'rgba(16, 185, 129, 0.15)';
        let badgeColor = '#10b981';

        if (['PPTX', 'PPT'].includes(ext)) { icon = '📊'; badgeBg = 'rgba(249, 115, 22, 0.15)'; badgeColor = '#f97316'; }
        else if (['DOCX', 'DOC'].includes(ext)) { icon = '📝'; badgeBg = 'rgba(59, 130, 246, 0.15)'; badgeColor = '#3b82f6'; }
        else if (['PDF'].includes(ext)) { icon = '📕'; badgeBg = 'rgba(239, 68, 68, 0.15)'; badgeColor = '#ef4444'; }
        else if (['XLSX', 'XLS', 'CSV'].includes(ext)) { icon = '📈'; badgeBg = 'rgba(34, 197, 94, 0.15)'; badgeColor = '#22c55e'; }

        return `
<div class="generated-download-card" style="margin: 12px 0; padding: 12px 16px; background: rgba(24, 24, 27, 0.85); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 16px; max-width: 100%; box-shadow: 0 4px 14px rgba(0,0,0,0.35);">
    <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
        <div style="font-size: 1.5rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: ${badgeBg}; border-radius: 8px; flex-shrink: 0;">${icon}</div>
        <div style="min-width: 0;">
            <strong style="color: #f4f4f5; font-size: 0.95rem; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(filename)}</strong>
            <span style="font-size: 0.75rem; color: ${badgeColor}; font-weight: 600; text-transform: uppercase;">${ext} File</span>
        </div>
    </div>
    <a href="${API_BASE_URL}/documents/download/${encodeURIComponent(filename)}" download="${escapeHtml(filename)}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; background: #10b981; color: #09090b; font-weight: 700; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 0.85rem; cursor: pointer; transition: background 0.15s ease; flex-shrink: 0;" onmouseover="this.style.background='#34d399'" onmouseout="this.style.background='#10b981'">
        ⬇ Download ${ext}
    </a>
</div>`;
    });

    return html;
}

function appendUserMessage(text, files, image = null) {
    const article = document.createElement('article');
    article.className = 'message user-message';
    messages.classList.add('has-messages');

    const imageHtml = image ? `
        <div class="user-attached-image-card" style="margin-top: 10px; max-width: 340px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(16, 185, 129, 0.4); background: rgba(0, 0, 0, 0.5); box-shadow: 0 4px 14px rgba(0,0,0,0.35);">
            <img src="${image.url}" alt="${escapeHtml(image.filename)}" style="width: 100%; max-height: 240px; object-fit: contain; display: block; background: #09090b;" />
            <div style="padding: 6px 12px; background: rgba(16, 185, 129, 0.15); font-size: 0.78rem; color: #a3e635; display: flex; align-items: center; justify-content: space-between; font-weight: 500;">
                <span>🖼️ ${escapeHtml(image.filename)}</span>
                <span style="font-size: 0.7rem; opacity: 0.85; text-transform: uppercase;">Vision Image</span>
            </div>
        </div>
    ` : '';

    const fileList = files.length
        ? `<div class="user-attached-cards" style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px; width: 100%;">${files.map((file) => {
            const meta = getFileCategory(file);
            const sizeStr = file.size ? ` · ${formatFileSize(file.size)}` : '';
            return `
                <div class="user-attached-chip" style="display: flex; align-items: center; gap: 10px; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.12); padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; width: 100%;">
                    <span style="font-size: 1.2rem; flex-shrink: 0;">${meta.icon}</span>
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                        <strong style="display: block; color: var(--text); font-weight: 600; font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(file.name)}</strong>
                        <span style="font-size: 0.75rem; opacity: 0.75;">${meta.label}${sizeStr} · Attached for local processing</span>
                    </div>
                </div>
            `;
        }).join('')}</div>`
        : '';

    const promptContent = text ? plainTextToHtml(text) : (image ? '' : '<span style="opacity: 0.75; font-style: italic;">Analyze attached image.</span>');
    const formattedText = promptContent ? `<div class="user-prompt-text" style="font-size: 0.98rem; line-height: 1.5; color: #000000; word-break: break-word; font-weight: 600; ${image ? 'margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(0, 0, 0, 0.15);' : ''}">${promptContent}</div>` : '';

    article.innerHTML = `
        <div class="avatar">U</div>
        <div class="message-content">
            <div class="message-meta">You</div>
            <div class="message-bubble" style="display: flex; flex-direction: column;">${formattedText}${imageHtml}${fileList}</div>
            <div class="message-toolbar" aria-label="Message actions">
                <button type="button" class="edit-btn">Edit</button>
                <button type="button" class="copy-btn">Copy</button>
            </div>
        </div>
    `;

    const bubble = article.querySelector('.message-bubble');
    bubble.dataset.originalText = text;

    const editBtn = article.querySelector('.edit-btn');
    const copyBtn = article.querySelector('.copy-btn');

    editBtn?.addEventListener('click', () => {
        editingBubble = bubble;
        messageInput.value = bubble.dataset.originalText || '';
        if (sendBtn) {
            sendBtn.textContent = 'Save';
        }
        adjustTextareaHeight();
        updateSendState();
        messageInput.focus();
    });

    copyBtn?.addEventListener('click', () => {
        const textToCopy = bubble.dataset.originalText || '';
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        });
    });

    messages.appendChild(article);
}

function appendAssistantMessage(initialText) {
    const article = document.createElement('article');
    article.className = 'message system-message';
    messages.classList.add('has-messages');

    article.innerHTML = `
        <div class="avatar">AI</div>
        <div class="message-content">
            <div class="message-meta">SOVAI Assistant</div>
            <details class="thinking-trace" open>
                <summary><span class="thinking-spinner" aria-hidden="true"></span><span class="thinking-label">Thinking</span><span class="thinking-chevron" aria-hidden="true">›</span></summary>
                <ol class="thinking-steps"><li class="active">Preparing the local request</li></ol>
            </details>
            <div class="message-bubble assistant-answer">${initialText === 'Thinking...' ? '' : plainTextToHtml(initialText)}</div>
            <div class="message-toolbar" aria-label="Message actions">
                <button type="button" class="copy-btn">Copy</button>
            </div>
        </div>
    `;

    const copyBtn = article.querySelector('.copy-btn');
    const bubble = article.querySelector('.message-bubble');

    copyBtn?.addEventListener('click', () => {
        const textToCopy = bubble ? bubble.innerText : '';
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        });
    });

    messages.appendChild(article);
    messages.scrollTop = messages.scrollHeight;
    return article;
}

function updateThinkingTrace(articleElement, label, state = 'active') {
    if (!articleElement) return;
    const list = articleElement.querySelector('.thinking-steps');
    const summaryLabel = articleElement.querySelector('.thinking-label');
    if (!list) return;
    list.querySelectorAll('li.active').forEach((item) => item.classList.remove('active'));
    const item = document.createElement('li');
    item.textContent = label;
    item.className = state;
    list.appendChild(item);
    if (summaryLabel) summaryLabel.textContent = state === 'error' ? 'Processing failed' : (state === 'done' ? 'Thought through' : 'Thinking');
    if (state === 'done' || state === 'error') {
        articleElement.querySelector('.thinking-trace')?.removeAttribute('open');
    }
}

function updateAssistantMessage(articleElement, newText, isError = false) {
    if (!articleElement) return;
    const bubble = articleElement.querySelector('.message-bubble');
    if (bubble) {
        bubble.innerHTML = plainTextToHtml(newText);
        if (isError) {
            bubble.style.color = '#ef4444';
            bubble.style.borderLeft = '3px solid #ef4444';
            bubble.style.paddingLeft = '10px';
        } else {
            bubble.style.color = '';
            bubble.style.borderLeft = '';
            bubble.style.paddingLeft = '';
        }
    }
}

async function sendChatMessage(userText, assistantMsgElement) {
    const requestId = ++activeRequestId;
    const controller = new AbortController();
    activeRequestController = controller;
    activeAssistantMessage = assistantMsgElement;
    setGeneratingState(true);

    try {
        const selectedModel = modelSelector ? modelSelector.value : 'auto';
        const selectedModelLabel = getSelectedModel().label;
        updateThinkingTrace(assistantMsgElement, `Selected ${selectedModelLabel}`);

        // Auto-upload any attached files to backend storage for RAG indexing
        if (uploadedFiles.length > 0) {
            updateThinkingTrace(assistantMsgElement, 'Indexing attached files for local retrieval');
            for (const file of uploadedFiles) {
                if (!file.isRagKnowledge && file.name && file.size > 0) {
                    try {
                        await uploadDocumentToBackend(file);
                        selectedRagDocIds.add(file.name);
                    } catch (uploadErr) {
                        console.warn('Auto-upload document error:', file.name, uploadErr);
                    }
                }
            }
        }

        const selectedDocs = Array.from(selectedRagDocIds);

        const payload = { 
            message: userText,
            model: selectedModel,
            selected_docs: selectedDocs
        };

        if (attachedImage) {
            payload.image_path = attachedImage.location || attachedImage.filename;
        }

        const response = await fetch(`${API_BASE_URL}/chat/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        updateThinkingTrace(assistantMsgElement, 'Connected to the local model');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';
        updateThinkingTrace(assistantMsgElement, 'Generating the response');

        while (true) {
            const { done, value } = await reader.read();
            if (done || requestId !== activeRequestId) break;
            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;
            updateAssistantMessage(assistantMsgElement, accumulatedText);
            if (messages) {
                messages.scrollTop = messages.scrollHeight;
            }
        }

        if (requestId === activeRequestId && verificationStatus) {
            verificationStatus.textContent = 'Verified · Success';
            updateThinkingTrace(assistantMsgElement, 'Response complete', 'done');
        }
    } catch (err) {
        if (err.name === 'AbortError' || requestId !== activeRequestId) {
            return;
        }
        console.error('Chat API Error:', err);
        updateThinkingTrace(assistantMsgElement, 'The local model request failed', 'error');
        updateAssistantMessage(
            assistantMsgElement, 
            `Error communicating with backend chat endpoint (${API_BASE_URL}/chat/):\n${err.message}\n\nPlease check if your FastAPI backend server is running via 'python main.py'.`, 
            true
        );
        if (verificationStatus) verificationStatus.textContent = 'Error';
    } finally {
        if (requestId === activeRequestId) {
            activeRequestController = null;
            activeAssistantMessage = null;
            setGeneratingState(false);
        }
    }
}

async function sendVisionMessage(queryText, imageFile, assistantMsgElement, imagePath = null, documentFile = null) {
    const requestId = ++activeRequestId;
    const controller = new AbortController();
    activeRequestController = controller;
    activeAssistantMessage = assistantMsgElement;
    setGeneratingState(true);

    try {
        const formData = new FormData();
        formData.append('query', queryText || 'Analyze image');
        if (imageFile) {
            formData.append('image', imageFile);
        } else if (documentFile) {
            formData.append('document', documentFile);
        } else if (imagePath) {
            formData.append('image_path', imagePath);
        }

        const response = await fetch(`${API_BASE_URL}/vision/`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        const displayMsg = `Attachment Processed Successfully:\n• Message: ${data.message}\n• File: ${data.filename}\n• Query: ${data.query}`;
        if (requestId !== activeRequestId) return;
        updateAssistantMessage(assistantMsgElement, displayMsg);
        if (verificationStatus) verificationStatus.textContent = 'Verified · Vision Completed';
    } catch (err) {
        if (err.name === 'AbortError' || requestId !== activeRequestId) {
            return;
        }
        console.error('Vision API Error:', err);
        updateAssistantMessage(
            assistantMsgElement, 
            `Error communicating with vision endpoint (${API_BASE_URL}/vision/):\n${err.message}\n\nPlease verify backend server is running.`, 
            true
        );
        if (verificationStatus) verificationStatus.textContent = 'Error';
    } finally {
        if (requestId === activeRequestId) {
            activeRequestController = null;
            activeAssistantMessage = null;
            setGeneratingState(false);
        }
    }
}

async function uploadDocumentToBackend(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/documents/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || `HTTP ${response.status}`);
        }

        const exists = backendIndexedDocuments.some(d => d.filename === data.filename);
        if (!exists) {
            backendIndexedDocuments.push({
                filename: data.filename,
                location: data.location,
                message: data.message || 'Indexed',
                uploaded_at: new Date().toLocaleTimeString(),
                size: file.size,
                status: 'Indexed'
            });
        }

        renderDocumentsView();
        return data;
    } catch (err) {
        console.error('Document Upload API Error:', err);
        throw err;
    }
}

function getDocIcon(filename) {
    if (!filename) return '📄';
    const ext = filename.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return '📝';
    if (['ppt', 'pptx'].includes(ext)) return '📊';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📈';
    if (['py', 'js', 'ts', 'html', 'css', 'json', 'sql', 'sh', 'cpp'].includes(ext)) return '💻';
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return '🖼️';
    return '📁';
}

let activeDocTab = 'uploaded';
let isUploadingDoc = false;
let uploadingFileName = '';

function updateDocTabStyles() {
    const tabUploaded = document.getElementById('docTabUploaded');
    const tabGenerated = document.getElementById('docTabGenerated');

    if (tabUploaded) {
        if (activeDocTab === 'uploaded') {
            tabUploaded.style.border = '1px solid rgba(16, 185, 129, 0.4)';
            tabUploaded.style.background = 'rgba(16, 185, 129, 0.15)';
            tabUploaded.style.color = '#10b981';
            tabUploaded.classList.add('active');
        } else {
            tabUploaded.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            tabUploaded.style.background = 'rgba(24, 24, 27, 0.6)';
            tabUploaded.style.color = '#a1a1aa';
            tabUploaded.classList.remove('active');
        }
    }

    if (tabGenerated) {
        if (activeDocTab === 'generated') {
            tabGenerated.style.border = '1px solid rgba(59, 130, 246, 0.4)';
            tabGenerated.style.background = 'rgba(59, 130, 246, 0.15)';
            tabGenerated.style.color = '#60a5fa';
            tabGenerated.classList.add('active');
        } else {
            tabGenerated.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            tabGenerated.style.background = 'rgba(24, 24, 27, 0.6)';
            tabGenerated.style.color = '#a1a1aa';
            tabGenerated.classList.remove('active');
        }
    }
}

function renderDocumentsView() {
    const container = document.getElementById('documentsList');
    if (!container) return;

    renderRagView();

    const uploadedDocs = backendIndexedDocuments.filter(d => d.category === 'uploaded' || (d.location && d.location.toLowerCase().includes('storage')));
    const generatedDocs = backendIndexedDocuments.filter(d => d.category === 'generated' || (d.location && d.location.toLowerCase().includes('outputs')));

    const categorizedSet = new Set([...uploadedDocs, ...generatedDocs]);
    const remainingDocs = backendIndexedDocuments.filter(d => !categorizedSet.has(d));
    uploadedDocs.push(...remainingDocs);

    // Update Tab Badges
    const badgeUploaded = document.getElementById('docUploadedBadge');
    const badgeGenerated = document.getElementById('docGeneratedBadge');
    if (badgeUploaded) badgeUploaded.textContent = uploadedDocs.length + (isUploadingDoc ? 1 : 0);
    if (badgeGenerated) badgeGenerated.textContent = generatedDocs.length;

    updateDocTabStyles();

    container.innerHTML = '';

    if (activeDocTab === 'uploaded') {
        if (uploadedDocs.length === 0 && !isUploadingDoc) {
            container.innerHTML = `
                <div class="empty-state" id="documentsEmptyState">
                    <h3>No uploaded documents</h3>
                    <p>Uploaded files will appear here with indexing status and document actions. Click "Upload documents" above to add files.</p>
                </div>
            `;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'dashboard-grid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        grid.style.gap = '1rem';

        if (isUploadingDoc) {
            const loadingCard = document.createElement('article');
            loadingCard.className = 'panel-card';
            loadingCard.style.padding = '1rem';
            loadingCard.style.borderRadius = '8px';
            loadingCard.style.border = '1px solid rgba(16, 185, 129, 0.5)';
            loadingCard.style.background = 'rgba(16, 185, 129, 0.08)';
            loadingCard.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; overflow: hidden;">
                        <div style="width: 22px; height: 22px; border: 2.5px solid rgba(16, 185, 129, 0.25); border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0;"></div>
                        <strong style="word-break: break-all; font-size: 0.9rem; color: #10b981;">${escapeHtml(uploadingFileName || 'Document')}</strong>
                    </div>
                    <span style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 2px 8px; border-radius: 4px; font-weight: 700; flex-shrink: 0;">Indexing</span>
                </div>
                <div style="font-size: 0.75rem; color: #a1a1aa; margin-top: 0.5rem; line-height: 1.4;">
                    <div><strong>Status:</strong> Extracting chunks & indexing into Qdrant Vector DB...</div>
                </div>
            `;
            grid.appendChild(loadingCard);
        }

        uploadedDocs.forEach((doc) => {
            const icon = getDocIcon(doc.filename);
            const card = document.createElement('article');
            card.className = 'panel-card';
            card.style.padding = '1rem';
            card.style.borderRadius = '8px';
            card.style.border = '1px solid var(--border-color, #27272a)';
            card.style.background = 'var(--card-bg, #18181b)';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'space-between';

            card.innerHTML = `
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
                            <span style="font-size: 1.25rem; flex-shrink: 0;">${icon}</span>
                            <strong style="word-break: break-all; font-size: 0.9rem;">${escapeHtml(doc.filename)}</strong>
                        </div>
                        <span style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 8px; border-radius: 4px; font-weight: 600; flex-shrink: 0;">Indexed</span>
                    </div>
                    <div style="font-size: 0.75rem; color: #a1a1aa; margin-top: 0.5rem; line-height: 1.4;">
                        <div><strong>Path:</strong> ${escapeHtml(doc.location || 'Storage')}</div>
                        <div><strong>Size:</strong> ${formatFileSize(doc.size)} · <strong>Uploaded:</strong> ${doc.uploaded_at || 'Just now'}</div>
                    </div>
                </div>
                <div style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
                    <a href="${API_BASE_URL}/documents/download/${encodeURIComponent(doc.filename)}" download="${escapeHtml(doc.filename)}" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 5px 12px; border-radius: 4px; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-weight: 500;" target="_blank">⬇ Download</a>
                    <button type="button" class="delete-doc-btn" data-filename="${escapeHtml(doc.filename)}" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 500;">Delete</button>
                </div>
            `;

            const delBtn = card.querySelector('.delete-doc-btn');
            delBtn?.addEventListener('click', () => deleteBackendDocument(doc.filename));

            grid.appendChild(card);
        });

        container.appendChild(grid);

    } else if (activeDocTab === 'generated') {
        if (generatedDocs.length === 0) {
            container.innerHTML = `
                <div class="empty-state" id="documentsEmptyState">
                    <h3>No AI generated artifacts</h3>
                    <p>Documents created by AI (DOCX, PDF, PPTX, XLSX) will appear here with unique timestamps.</p>
                </div>
            `;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'dashboard-grid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        grid.style.gap = '1rem';

        generatedDocs.forEach((doc) => {
            const icon = getDocIcon(doc.filename);
            const card = document.createElement('article');
            card.className = 'panel-card';
            card.style.padding = '1rem';
            card.style.borderRadius = '8px';
            card.style.border = '1px solid rgba(59, 130, 246, 0.3)';
            card.style.background = 'rgba(15, 23, 42, 0.6)';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'space-between';

            card.innerHTML = `
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
                            <span style="font-size: 1.25rem; flex-shrink: 0;">${icon}</span>
                            <strong style="word-break: break-all; font-size: 0.9rem;">${escapeHtml(doc.filename)}</strong>
                        </div>
                        <span style="font-size: 0.75rem; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 2px 8px; border-radius: 4px; font-weight: 600; flex-shrink: 0;">Generated</span>
                    </div>
                    <div style="font-size: 0.75rem; color: #a1a1aa; margin-top: 0.5rem; line-height: 1.4;">
                        <div><strong>Location:</strong> Outputs Directory</div>
                        <div><strong>Size:</strong> ${formatFileSize(doc.size)} · <strong>Created:</strong> ${doc.uploaded_at || 'Just now'}</div>
                    </div>
                </div>
                <div style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
                    <a href="${API_BASE_URL}/documents/download/${encodeURIComponent(doc.filename)}" download="${escapeHtml(doc.filename)}" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); padding: 5px 12px; border-radius: 4px; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-weight: 500;" target="_blank">⬇ Download</a>
                    <button type="button" class="delete-doc-btn" data-filename="${escapeHtml(doc.filename)}" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 500;">Delete</button>
                </div>
            `;

            const delBtn = card.querySelector('.delete-doc-btn');
            delBtn?.addEventListener('click', () => deleteBackendDocument(doc.filename));

            grid.appendChild(card);
        });

        container.appendChild(grid);
    }
}

function renderRagView() {
    const container = document.getElementById('ragCollectionsList');
    if (!container) return;

    const uploadedDocs = backendIndexedDocuments.filter(d => d.category === 'uploaded' || (d.location && d.location.toLowerCase().includes('storage')));

    if (uploadedDocs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No knowledge collections</h3>
                <p>Collections will appear after local documents are uploaded into the RAG vector store.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';
    grid.style.marginTop = '1rem';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
    grid.style.gap = '1rem';

    uploadedDocs.forEach((doc) => {
        const icon = getDocIcon(doc.filename);
        const card = document.createElement('article');
        card.className = 'panel-card';
        card.style.padding = '1rem';
        card.style.borderRadius = '8px';
        card.style.border = '1px solid var(--border-color, #27272a)';
        card.style.background = 'var(--card-bg, #18181b)';

        card.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
                    <span style="font-size: 1.25rem; flex-shrink: 0;">${icon}</span>
                    <strong style="word-break: break-all; font-size: 0.9rem;">${escapeHtml(doc.filename)}</strong>
                </div>
                <span style="font-size: 0.75rem; background: rgba(59, 130, 246, 0.15); color: #3b82f6; padding: 2px 8px; border-radius: 4px; font-weight: 600; flex-shrink: 0;">Vector Collection</span>
            </div>
            <div style="font-size: 0.75rem; color: #a1a1aa; margin-top: 0.5rem; line-height: 1.4;">
                <div><strong>Status:</strong> Active in Qdrant Vector DB</div>
                <div><strong>Size:</strong> ${formatFileSize(doc.size)} · <strong>Uploaded:</strong> ${doc.uploaded_at || 'Just now'}</div>
            </div>
        `;
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

function resetComposer() {
    messageInput.value = '';
    uploadedFiles.splice(0, uploadedFiles.length);
    attachedImage = null;
    renderUploadChips();
    renderAttachedImagePreview();
    adjustTextareaHeight();
    updateSendState();
    editingBubble = null;
    messageInput.focus();
}

function resetConversation() {
    messages.querySelectorAll('.message').forEach((message) => message.remove());
    messages.classList.remove('has-messages');
    verificationStatus.textContent = 'Idle';
}

function renderAccountCard() {
    const activeAccount = workstationsAccounts[activeAccountIndex];

    if (!activeAccount) {
        return;
    }

    accountName.textContent = activeAccount.name;
    accountRole.textContent = activeAccount.role;
    accountAvatar.textContent = activeAccount.initials;
    accountLocalName.textContent = activeAccount.localAccount;
}

function toggleAccountMenu(forceOpen) {
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !accountCard.classList.contains('open');
    accountCard.classList.toggle('open', shouldOpen);
    accountCard.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    accountTrigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function closeAccountMenu() {
    toggleAccountMenu(false);
}

function switchAccount() {
    activeAccountIndex = (activeAccountIndex + 1) % workstationsAccounts.length;
    renderAccountCard();
    closeAccountMenu();
}

function switchView(viewId) {
    const target = document.getElementById(viewId);
    if (!target) {
        return;
    }

    document.querySelectorAll('.view').forEach((view) => {
        view.classList.toggle('active', view.id === viewId);
    });

    document.querySelectorAll('[data-view]').forEach((button) => {
        button.classList.toggle('active', button.dataset.view === viewId);
    });

    workspaceTitle.textContent = target.dataset.title || 'SOVAI';

    if (viewId === 'documentsView' || viewId === 'ragView') {
        fetchBackendDocuments();
    }

    if (window.innerWidth <= 820) {
        closeSidebar();
    }
}

async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            if (verificationStatus && (verificationStatus.textContent === 'Idle' || verificationStatus.textContent === 'Disconnected')) {
                verificationStatus.textContent = 'Connected · Local Server';
            }
        }
    } catch {
        if (verificationStatus) verificationStatus.textContent = 'Disconnected';
    }
}

window.lastRanSandboxCode = 'print("Hello from SovereignAI Sandbox!")';

async function runCodeInSandbox(code) {
    const sandboxCodeEditor = document.getElementById('sandboxCodeEditor');
    if (code && sandboxCodeEditor) {
        sandboxCodeEditor.value = code;
    }
    const codeToRun = (sandboxCodeEditor ? sandboxCodeEditor.value : code) || window.lastRanSandboxCode;
    window.lastRanSandboxCode = codeToRun;

    switchView('sandboxView');
    
    const outputBox = document.getElementById('sandboxOutputConsole');
    const statusBadge = document.getElementById('sandboxStatusBadge');
    
    if (statusBadge) {
        statusBadge.style.background = 'rgba(234, 179, 8, 0.15)';
        statusBadge.style.color = '#eab308';
        statusBadge.style.borderColor = 'rgba(234, 179, 8, 0.3)';
        statusBadge.textContent = 'EXECUTING...';
    }

    const timestamp = new Date().toLocaleTimeString();

    if (outputBox) {
        outputBox.style.color = '#10b981';
        outputBox.textContent = `[${timestamp}] [SYS] Initializing isolated Python 3.13 process...\n[${timestamp}] [SYS] Transmitting script to sandbox execution engine...\n[${timestamp}] [STREAM] Output log started:\n--------------------------------------------------\n`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/sandbox/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: codeToRun })
        });
        const data = await response.json();
        const endTimestamp = new Date().toLocaleTimeString();

        if (data.status === 'success') {
            if (outputBox) {
                outputBox.style.color = '#10b981';
                outputBox.textContent += `${data.output}\n--------------------------------------------------\n[${endTimestamp}] [SUCCESS] Task completed cleanly with exit code 0.`;
                outputBox.scrollTop = outputBox.scrollHeight;
            }
            if (statusBadge) {
                statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
                statusBadge.style.color = '#10b981';
                statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                statusBadge.textContent = 'SUCCESS [0]';
            }
            if (verificationStatus) verificationStatus.textContent = 'Verified · Sandbox Success';
        } else {
            if (outputBox) {
                outputBox.style.color = '#ef4444';
                outputBox.textContent += `${data.output}\n--------------------------------------------------\n[${endTimestamp}] [ERROR] Process terminated with exit code ${data.exit_code}.`;
                outputBox.scrollTop = outputBox.scrollHeight;
            }
            if (statusBadge) {
                statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
                statusBadge.style.color = '#ef4444';
                statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                statusBadge.textContent = `ERROR [${data.exit_code}]`;
            }
            if (verificationStatus) verificationStatus.textContent = 'Error · Sandbox Failed';
        }
    } catch (err) {
        const endTimestamp = new Date().toLocaleTimeString();
        if (outputBox) {
            outputBox.style.color = '#ef4444';
            outputBox.textContent += `\n[${endTimestamp}] [FATAL] Exception during execution: ${err.message}`;
        }
        if (statusBadge) {
            statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
            statusBadge.style.color = '#ef4444';
            statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            statusBadge.textContent = 'CRASH';
        }
    }
}

function filterHistory() {
    const query = historySearch.value.trim().toLowerCase();
    document.querySelectorAll('.history-item').forEach((item) => {
        const title = item.dataset.title.toLowerCase();
        item.hidden = query.length > 0 && !title.includes(query);
    });
}

function renameHistoryItem(item) {
    const currentTitle = item.dataset.title;
    const nextTitle = window.prompt('Rename conversation', currentTitle);

    if (!nextTitle || !nextTitle.trim()) {
        return;
    }

    const title = nextTitle.trim();
    item.dataset.title = title;
    item.querySelector('button span').textContent = title;
    item.querySelector('.history-rename').setAttribute('aria-label', `Rename ${title}`);
    item.querySelector('.history-delete').setAttribute('aria-label', `Delete ${title}`);
}

function deleteHistoryItem(item) {
    item.remove();
}

/* Event Listeners */
sidebarToggle?.addEventListener('click', toggleSidebar);
sidebarClose?.addEventListener('click', closeSidebar);
agentPanelToggle?.addEventListener('click', toggleAgentPanel);
agentPanelClose?.addEventListener('click', closeAgentPanel);
sidebarOverlay?.addEventListener('click', closeDrawers);

/* Attach Menu triggers */
attachBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleAttachMenu();
});

document.querySelectorAll('.attach-menu-item').forEach(button => {
    button.addEventListener('click', () => {
        const action = button.dataset.action;
        closeAttachMenu();

        if (action === 'upload-all') fileInputAll?.click();
        else if (action === 'upload-doc') fileInputDoc?.click();
        else if (action === 'upload-img') fileInputImg?.click();
        else if (action === 'upload-code') fileInputCode?.click();
        else if (action === 'upload-data') fileInputData?.click();
        else if (action === 'upload-folder') fileInputFolder?.click();
        else if (action === 'pick-rag') openRagPicker();
    });
});

/* Connect file inputs */
[fileInputAll, fileInputDoc, fileInputCode, fileInputData, fileInputFolder].forEach(input => {
    input?.addEventListener('change', (event) => {
        addFiles(event.target.files);
        input.value = '';
    });
});

documentUploadBtn?.addEventListener('click', () => {
    const directDocInput = document.getElementById('directDocInput');
    if (directDocInput) {
        directDocInput.click();
    } else {
        fileInputAll?.click();
    }
});

const directDocInput = document.getElementById('directDocInput');
directDocInput?.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const uploadBtn = document.getElementById('documentUploadBtn');
    if (uploadBtn) uploadBtn.disabled = true;

    if (verificationStatus) verificationStatus.textContent = 'Uploading & indexing document...';

    for (const file of files) {
        try {
            isUploadingDoc = true;
            uploadingFileName = file.name;
            activeDocTab = 'uploaded';
            renderDocumentsView();

            await uploadDocumentToBackend(file);
        } catch (err) {
            console.error('Failed uploading document:', err);
            alert(`Error uploading ${file.name}: ${err.message}`);
        } finally {
            isUploadingDoc = false;
            uploadingFileName = '';
        }
    }

    if (uploadBtn) uploadBtn.disabled = false;
    await fetchBackendDocuments();
    if (verificationStatus) verificationStatus.textContent = 'Document uploaded & indexed';
    directDocInput.value = '';
});

/* Documents Section Sub-Navigation Tabs */
const docTabUploaded = document.getElementById('docTabUploaded');
const docTabGenerated = document.getElementById('docTabGenerated');

docTabUploaded?.addEventListener('click', () => {
    activeDocTab = 'uploaded';
    renderDocumentsView();
});

docTabGenerated?.addEventListener('click', () => {
    activeDocTab = 'generated';
    renderDocumentsView();
});

/* Image Picker Modal Elements */
const imagePickerModal = document.getElementById('imagePickerModal');
const imagePickerClose = document.getElementById('imagePickerClose');
const imagePickerCancel = document.getElementById('imagePickerCancel');
const imagePickerAttachBtn = document.getElementById('imagePickerAttachBtn');
const imgTabComputer = document.getElementById('imgTabComputer');
const imgTabExisting = document.getElementById('imgTabExisting');
const imageGalleryGrid = document.getElementById('imageGalleryGrid');
const imageGalleryEmpty = document.getElementById('imageGalleryEmpty');
const imageSelectedCount = document.getElementById('imageSelectedCount');

let attachedImage = null;
let selectedGalleryImage = null;
let storedGalleryImages = [];

function openImagePickerModal() {
    if (!imagePickerModal) return;
    imagePickerModal.style.display = 'flex';
    imagePickerModal.setAttribute('aria-hidden', 'false');
    selectedGalleryImage = null;
    if (imagePickerAttachBtn) imagePickerAttachBtn.disabled = true;
    if (imageSelectedCount) imageSelectedCount.textContent = 'No image selected';
    fetchStoredImages();
}

function closeImagePickerModal() {
    if (!imagePickerModal) return;
    imagePickerModal.style.display = 'none';
    imagePickerModal.setAttribute('aria-hidden', 'true');
    selectedGalleryImage = null;
}

async function fetchStoredImages() {
    try {
        const response = await fetch(`${API_BASE_URL}/vision/images`);
        if (!response.ok) return;
        const data = await response.json();
        storedGalleryImages = data.images || [];
        renderImageGalleryGrid();
    } catch (err) {
        console.error('Failed to fetch stored images:', err);
    }
}

function renderImageGalleryGrid() {
    if (!imageGalleryGrid) return;
    imageGalleryGrid.innerHTML = '';

    if (storedGalleryImages.length === 0) {
        if (imageGalleryEmpty) imageGalleryEmpty.style.display = 'block';
        return;
    }

    if (imageGalleryEmpty) imageGalleryEmpty.style.display = 'none';

    storedGalleryImages.forEach(img => {
        const card = document.createElement('div');
        card.className = 'gallery-img-card';
        card.style.cssText = 'border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; overflow: hidden; background: rgba(24,24,27,0.7); cursor: pointer; transition: all 0.2s ease; position: relative;';
        
        card.innerHTML = `
            <div style="width: 100%; height: 90px; background: #09090b; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                <img src="${API_BASE_URL}${img.url}" alt="${escapeHtml(img.filename)}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="padding: 6px 8px; font-size: 0.75rem; color: #a1a1aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <strong style="color: #f4f4f5; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(img.filename)}</strong>
                <span>${img.created_at || ''}</span>
            </div>
        `;

        card.addEventListener('click', () => {
            document.querySelectorAll('.gallery-img-card').forEach(c => {
                c.style.borderColor = 'rgba(255,255,255,0.12)';
                c.style.background = 'rgba(24,24,27,0.7)';
            });
            card.style.borderColor = '#10b981';
            card.style.background = 'rgba(16,185,129,0.12)';

            selectedGalleryImage = img;
            if (imagePickerAttachBtn) imagePickerAttachBtn.disabled = false;
            if (imageSelectedCount) imageSelectedCount.textContent = `Selected: ${img.filename}`;
        });

        card.addEventListener('dblclick', () => {
            selectedGalleryImage = img;
            attachSelectedGalleryImage();
        });

        imageGalleryGrid.appendChild(card);
    });
}

function attachSelectedGalleryImage() {
    if (!selectedGalleryImage) return;
    attachedImage = {
        filename: selectedGalleryImage.filename,
        url: `${API_BASE_URL}${selectedGalleryImage.url}`,
        location: selectedGalleryImage.location || selectedGalleryImage.filename
    };
    renderAttachedImagePreview();
    closeImagePickerModal();
}

function renderAttachedImagePreview() {
    let previewContainer = document.getElementById('attachedImagePreviewBar');
    if (!previewContainer) {
        const composer = document.querySelector('.composer');
        if (composer) {
            previewContainer = document.createElement('div');
            previewContainer.id = 'attachedImagePreviewBar';
            previewContainer.style.cssText = 'padding: 8px 12px; margin-bottom: 6px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem;';
            composer.parentNode.insertBefore(previewContainer, composer);
        }
    }

    if (!previewContainer) return;

    if (attachedImage) {
        previewContainer.style.display = 'flex';
        previewContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                <img src="${attachedImage.url}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
                <div style="min-width: 0;">
                    <strong style="color: #10b981; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🖼️ ${escapeHtml(attachedImage.filename)}</strong>
                    <span style="font-size: 0.72rem; color: #a1a1aa;">Attached for Vision Model Analysis</span>
                </div>
            </div>
            <button type="button" id="detachImgBtn" style="background: transparent; border: 0; color: #ef4444; font-size: 1.1rem; cursor: pointer; padding: 2px 8px; font-weight: 700;">✕</button>
        `;
        document.getElementById('detachImgBtn')?.addEventListener('click', detachImage);
    } else {
        previewContainer.style.display = 'none';
    }
}

function detachImage() {
    attachedImage = null;
    renderAttachedImagePreview();
}

imgTabComputer?.addEventListener('click', () => {
    fileInputImg?.click();
});

imgTabExisting?.addEventListener('click', () => {
    fetchStoredImages();
});

imagePickerClose?.addEventListener('click', closeImagePickerModal);
imagePickerCancel?.addEventListener('click', closeImagePickerModal);
imagePickerAttachBtn?.addEventListener('click', attachSelectedGalleryImage);
imagePickerModal?.addEventListener('click', (e) => {
    if (e.target === imagePickerModal) closeImagePickerModal();
});

fileInputImg?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const file = files[0];
    try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE_URL}/vision/upload`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        attachedImage = {
            filename: data.filename,
            url: `${API_BASE_URL}${data.url}`,
            location: data.location
        };
        renderAttachedImagePreview();
        closeImagePickerModal();
    } catch (err) {
        console.error('Image upload error:', err);
        alert(`Error uploading image: ${err.message}`);
    }
    fileInputImg.value = '';
});

/* RAG Modal Events */
ragPickerClose?.addEventListener('click', closeRagPicker);
ragPickerCancel?.addEventListener('click', closeRagPicker);
ragPickerSearch?.addEventListener('input', renderRagDocList);
ragPickerAttachBtn?.addEventListener('click', attachSelectedRagDocs);
ragPickerModal?.addEventListener('click', (e) => {
    if (e.target === ragPickerModal) closeRagPicker();
});

/* Keyboard shortcuts */
document.addEventListener('keydown', (event) => {
    // Toggle sidebar with Ctrl+B or Cmd+B
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b' && !event.shiftKey) {
        event.preventDefault();
        toggleSidebar();
    }

    // Toggle right panel with Ctrl+Shift+B or Ctrl+I
    if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'i' || (event.shiftKey && event.key.toLowerCase() === 'b'))) {
        event.preventDefault();
        toggleAgentPanel();
    }

    if (event.key === 'Escape') {
        closeDrawers();
        closeAttachMenu();
        closeRagPicker();
        closeAccountMenu();
    }

    if (event.key === 'Enter' && !event.shiftKey && event.target === messageInput) {
        event.preventDefault();
        if (!sendBtn.disabled) {
            composer.requestSubmit();
        }
    }
});

messageInput?.addEventListener('input', () => {
    adjustTextareaHeight();
    updateSendState();
});

composer?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isGenerating) {
        stopActiveGeneration();
        return;
    }

    const text = messageInput.value.trim();
    const files = [...uploadedFiles];
    const currentImg = attachedImage;

    if (!text && files.length === 0 && !currentImg) {
        return;
    }

    if (editingBubble) {
        editingBubble.dataset.originalText = text;
        const fileListContainer = editingBubble.querySelector('.source-cards');
        const fileListHtml = fileListContainer ? fileListContainer.outerHTML : '';
        editingBubble.innerHTML = `${text ? plainTextToHtml(text) : 'Analyze the attached files.'}${fileListHtml}`;
        editingBubble = null;
        if (sendBtn) {
            sendBtn.textContent = 'Send';
        }
        resetComposer();
    } else {
        appendUserMessage(text, files, currentImg);
        if (verificationStatus) verificationStatus.textContent = 'Contacting backend...';
        messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });

        const assistantMsg = appendAssistantMessage('Thinking...');

        // Separate image vs doc attachments
        const imageFile = files.find(f => (f.type && f.type.startsWith('image/')) || ['png','jpg','jpeg','webp'].some(ext => f.name.toLowerCase().endsWith(ext)));
        const visionDocument = files.find(f => ['pdf', 'doc', 'docx'].includes(f.name.split('.').pop().toLowerCase()));
        const docFiles = files.filter(f => f !== imageFile && f !== visionDocument);

        resetComposer();

        // Process Document files upload if any
        for (const docFile of docFiles) {
            if (docFile.size > 0 && !docFile.isRagKnowledge) {
                try {
                    await uploadDocumentToBackend(docFile);
                } catch (err) {
                    console.warn('Document upload warning:', docFile.name, err);
                }
            }
        }

        if (imageFile || currentImg || visionDocument) {
            updateAssistantMessage(assistantMsg, 'Processing attachment with vision endpoint...');
            await sendVisionMessage(text, imageFile, assistantMsg, currentImg?.location || currentImg?.filename, visionDocument);
        } else {
            await sendChatMessage(text || 'Analyze attached files', assistantMsg);
        }
    }
});

voiceBtn?.addEventListener('click', () => {
    messageInput.value = messageInput.value
        ? `${messageInput.value} Voice input placeholder.`
        : 'Voice input placeholder.';
    adjustTextareaHeight();
    updateSendState();
    messageInput.focus();
});

/* Drag and drop handling */
['dragenter', 'dragover'].forEach((eventName) => {
    composerDropZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        composerDropZone.classList.add('drag-over');
    });
});

['dragleave', 'drop'].forEach((eventName) => {
    composerDropZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        composerDropZone.classList.remove('drag-over');
    });
});

composerDropZone?.addEventListener('drop', (event) => {
    addFiles(event.dataTransfer.files);
});

newTaskBtn?.addEventListener('click', () => {
    stopActiveGeneration();
    switchView('chatView');
    resetConversation();
    resetComposer();
    messages.scrollTo({ top: 0, behavior: 'smooth' });
});

historySearch?.addEventListener('input', filterHistory);

document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
});

document.getElementById('sandboxRerunBtn')?.addEventListener('click', () => {
    const editor = document.getElementById('sandboxCodeEditor');
    const code = editor ? editor.value : (window.lastRanSandboxCode || 'print("Hello from SovereignAI Sandbox!")');
    runCodeInSandbox(code);
});

document.getElementById('sandboxClearBtn')?.addEventListener('click', () => {
    const outputBox = document.getElementById('sandboxOutputConsole');
    const statusBadge = document.getElementById('sandboxStatusBadge');
    if (outputBox) outputBox.textContent = '[CLEARED] Sandbox terminal log cleared.';
    if (statusBadge) {
        statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        statusBadge.style.color = '#10b981';
        statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        statusBadge.textContent = 'READY';
    }
});

document.getElementById('sandboxCopyLogsBtn')?.addEventListener('click', () => {
    const outputBox = document.getElementById('sandboxOutputConsole');
    if (outputBox) {
        navigator.clipboard.writeText(outputBox.textContent).then(() => {
            const btn = document.getElementById('sandboxCopyLogsBtn');
            if (btn) {
                const orig = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = orig, 2000);
            }
        });
    }
});

document.querySelectorAll('.history-item > button').forEach((button) => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.history-item').forEach((item) => item.classList.remove('selected'));
        button.closest('.history-item').classList.add('selected');
        switchView('chatView');
    });
});

document.querySelectorAll('.history-rename').forEach((button) => {
    button.addEventListener('click', () => renameHistoryItem(button.closest('.history-item')));
});

document.querySelectorAll('.history-delete').forEach((button) => {
    button.addEventListener('click', () => deleteHistoryItem(button.closest('.history-item')));
});

modelSelector?.addEventListener('change', updateModelRouting);
accountTrigger?.addEventListener('click', () => toggleAccountMenu());

document.querySelectorAll('.menu-item').forEach((button) => {
    button.addEventListener('click', () => {
        const action = button.dataset.action;

        if (action === 'profile' || action === 'settings') {
            switchView('settingsView');
        }

        if (action === 'switch-account') {
            switchAccount();
        }

        if (action === 'sign-out') {
            closeAccountMenu();
        }

        closeAccountMenu();
    });
});

/* Click outside dismiss */
document.addEventListener('click', (event) => {
    if (accountCard && !accountCard.contains(event.target)) {
        closeAccountMenu();
    }

    if (attachWrapper && !attachWrapper.contains(event.target)) {
        closeAttachMenu();
    }
});

themeOptions.forEach((button) => {
    button.addEventListener('click', () => setTheme(button.dataset.theme));
});

suggestionPrompts.forEach((button) => {
    button.addEventListener('click', () => {
        messageInput.value = button.textContent.trim();
        adjustTextareaHeight();
        updateSendState();
        messageInput.focus();
    });
});

let previousWidth = window.innerWidth;
window.addEventListener('resize', () => {
    const currentWidth = window.innerWidth;

    if (previousWidth < 1180 && currentWidth >= 1180) {
        closeDrawers();
    }

    if (previousWidth < 820 && currentWidth >= 820) {
        closeSidebar();
    }

    previousWidth = currentWidth;
});

let savedTheme = 'system';
try {
    savedTheme = localStorage.getItem('sovai-theme') || 'system';
} catch {
    savedTheme = 'system';
}

setTheme(savedTheme);
renderAccountCard();
updateModelRouting();
adjustTextareaHeight();
updateSendState();
checkBackendHealth();
fetchBackendDocuments();
setInterval(checkBackendHealth, 10000);
requestAnimationFrame(() => {
    document.body.classList.remove('is-booting');
});
