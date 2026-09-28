# SOVAI — Sovereign AI Workbench

> A self-hosted AI workbench for private, local-first processing of documents, knowledge, code, calculations, and vision workloads.

SOVAI is designed for organizations that need to work with sensitive information without relying on cloud AI services for core processing. It combines a browser-based workspace with a local FastAPI backend, LangChain/LangGraph agent orchestration, local Ollama models, local RAG, Python tools, sandboxed execution, verification, and report generation.

---

## 🎯 Problem

Sensitive environments such as refineries, PSUs, defence-linked manufacturing, and government offices may handle documents and knowledge that should remain inside the organization.

SOVAI addresses this requirement with a local-first architecture in which:

- AI inference runs through local models.
- Documents can be processed locally.
- Knowledge retrieval uses a local vector database.
- Coding and calculations can use local Python tools.
- Generated code can be executed in an isolated sandbox.
- Outputs can be verified before final delivery.
- Audit and security views provide visibility into activity.

> SOVAI is a prototype/workbench architecture. Production deployment should enforce network isolation, authentication, access control, sandboxing, and infrastructure-level security in addition to the application layer.

---

## ✨ Key Capabilities

### 🔐 Local AI Stack
Run open-weight models locally through Ollama for chat, RAG, coding, engineering/calculation, and vision workloads.

### 🧠 Smart Model Routing
Route a task to an appropriate local model based on the required capability, such as general chat/RAG, coding, engineering calculations, or vision/OCR.

### 📚 Local RAG
Index local documents with embeddings and retrieve relevant content using Qdrant.

### 👁️ Vision & OCR
Analyze images and scanned documents using the local vision model, with optional OCR fallback support.

### 🤖 Agent Orchestration
Use LangChain and LangGraph to structure planning, routing, tool execution, and verification workflows.

### 🐍 Python Tools
Use local Python tools for calculations, analysis, and task-specific automation.

### 🧪 Sandbox + Verification
Execute code in an isolated runtime and validate outputs before producing final results.

### 📄 Report Generation
Generate practical outputs such as DOCX/PDF reports from processed information.

### 🛡️ Security & Audit
Provide application-level visibility into local operation, audit activity, and network/security status.

---

## 🏗️ Architecture

```text
                         ┌─────────────────────┐
                         │    USER / WEB UI     │
                         │     HTML / CSS / JS  │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │       FastAPI       │
                         │      Backend API    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │     LangChain + LangGraph   │
                    │   Agent Planning & Routing   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │    Model Router     │
                         └───────┬─────┬───────┘
                                 │     │
              ┌──────────────────┘     └──────────────────┐
              ▼                                           ▼
      ┌────────────────┐                         ┌────────────────┐
      │  Local Models  │                         │  Local Tools   │
      │                │                         │                │
      │ Qwen3:4B       │                         │ Python         │
      │ Qwen2.5:3B     │                         │ Calculations   │
      │ Qwen2.5-Coder  │                         │ Analysis       │
      │ Qwen2.5-VL     │                         └───────┬────────┘
      └───────┬────────┘                                 │
              │                                          │
              ▼                                          ▼
      ┌────────────────┐                         ┌────────────────┐
      │   Local RAG    │                         │    Sandbox     │
      │                │                         │   Execution    │
      │ Documents      │                         └───────┬────────┘
      │ Nomic Embed    │                                 │
      │ Qdrant         │                                 ▼
      └───────┬────────┘                         ┌────────────────┐
              │                                  │    Verifier    │
              └─────────────────────────────────►│ Output Checks  │
                                                 └───────┬────────┘
                                                         │
                                                         ▼
                                                 ┌────────────────┐
                                                 │ Report         │
                                                 │ Generator      │
                                                 │ DOCX / PDF     │
                                                 └────────────────┘
```

### End-to-end workflow

```text
User Request
     ↓
Plan
     ↓
Route
     ↓
Execute
     ↓
Verify
     ↓
Deliver
```

---

## 🧩 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend API | FastAPI |
| Agent Orchestration | LangChain + LangGraph |
| Local Model Runtime | Ollama |
| Vector Database | Qdrant |
| Embeddings | Nomic Embeddings |
| Tools & Calculations | Python |
| Execution | Isolated Sandbox |
| Output | DOCX / PDF |

### Local Models

| Model | Purpose |
|---|---|
| `qwen2.5:3b` | General-purpose AI tasks |
| `qwen2.5-coder:3b` | Coding-related tasks |
| `qwen3:4b` | Engineering, mathematics, and calculations |
| `qwen2.5vl:3b` | Image and vision-related tasks |
| `nomic-embed-text` | Document and query embeddings |

---

## 🖥️ Frontend Workspace

The SOVAI workbench UI includes the following functional areas:

- Dashboard
- AI Chat
- Vision & OCR
- Files & Documents
- Knowledge Base
- Calculations
- Coding
- Sandbox
- Local Tools
- Security Center
- Audit Logs
- Settings

The frontend is implemented using vanilla HTML/CSS/JavaScript and is designed as a responsive, browser-based workbench.

---

## 📄 Document & Vision Processing

The composer supports local file attachments.

| Attachment | Processing path |
|---|---|
| PNG, JPG, JPEG, WEBP, SVG, GIF | Qwen2.5-VL vision model |
| PDF, DOC, DOCX | Text extraction + Qwen2.5-VL analysis |
| TXT, Markdown, code, CSV, spreadsheets | Document upload + RAG/chat processing |

Uploaded files are saved before processing. Qdrant can index supported documents for retrieval.

If Qdrant is unavailable, uploads can still succeed, but vector indexing/retrieval is skipped and the server logs an `RAG Indexing Warning`.

The default vision model is `qwen2.5vl:3b`.

---

## 📚 Local RAG Pipeline

The local knowledge workflow is:

```text
Local Documents
      ↓
Document Processing
      ↓
Nomic Embeddings
      ↓
Qdrant
      ↓
Semantic Search
      ↓
Relevant Context
      ↓
Local Model
```

This allows the system to retrieve relevant local knowledge instead of relying on an external knowledge service.

---

## 🤖 Agentic Workflow

SOVAI is structured around an agentic execution pattern:

### 1. Plan
Break a user request into the steps required to complete it.

### 2. Route
Select the appropriate model and local tools.

### 3. Execute
Read documents, search the local knowledge base, run calculations, execute code, or perform other supported operations.

### 4. Verify
Check generated results before producing the final deliverable.

### 5. Deliver
Generate a usable output such as a report or document.

LangChain and LangGraph provide the orchestration layer for these workflows.

---

## 🧪 Sandbox & Verification

Generated code should not be treated as final output automatically.

The intended execution flow is:

```text
Generated Code
     ↓
Isolated Sandbox
     ↓
Execution Result
     ↓
Verification
     ↓
Accepted Output
```

This is used for calculations, analysis, and coding-oriented tasks where execution and validation are required.

---

## 🛡️ Security Model

SOVAI follows a local-first security approach.

### Application-level principles

- Local model inference
- Local document processing
- Local vector search
- Local Python tooling
- Sandboxed code execution
- Audit visibility
- Network/security monitoring

### Security Center

The frontend provides a dedicated security area for showing:

- Local / offline status
- External-call status
- Audit activity
- Network monitoring
- Verification status

Actual production security must be enforced at the infrastructure, operating-system, network, identity, and deployment levels as well as in the application.

---

## ⚙️ Requirements

| Component | Version / Details |
|---|---|
| **Python** | `3.12.4` |
| **Package Manager** | `uv` |
| **Docker** | `28.4.0` |
| **Vector Database** | Qdrant |
| **Local Model Runtime** | Ollama |
| **General LLM** | `qwen2.5:3b` |
| **Coding Model** | `qwen2.5-coder:3b` |
| **Engineering Model** | `qwen3:4b` |
| **Vision Model** | `qwen2.5vl:3b` |
| **Embedding Model** | `nomic-embed-text` |

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd SovereignAI
```

### 2. Create / sync the environment

```bash
uv sync
```

### 3. Activate the environment

#### Windows PowerShell

```powershell
.\.venv\Scripts\activate
```

#### Linux / macOS

```bash
source .venv/bin/activate
```

Activation is optional when using `uv run`.

---

## 🦙 Ollama Setup

Pull the required local models:

```bash
ollama pull nomic-embed-text
ollama pull qwen2.5:3b
ollama pull qwen2.5-coder:3b
ollama pull qwen3:4b
ollama pull qwen2.5vl:3b
```

Verify:

```bash
ollama list
```

Expected models:

```text
nomic-embed-text
qwen2.5:3b
qwen2.5-coder:3b
qwen3:4b
qwen2.5vl:3b
```

---

## 🗄️ Qdrant Setup

Start Qdrant locally with Docker:

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

Qdrant:

```text
http://localhost:6333
```

Dashboard:

```text
http://localhost:6333/dashboard
```

---

## ▶️ Run the Project

The root `main.py` is the main application entry point.

```bash
uv run main.py
```

or:

```bash
uv run python main.py
```

---

## 🔧 Environment Configuration

Local model settings can be overridden through environment variables.

Examples:

```text
VISION_MODEL
OLLAMA_BASE_URL
EMBEDDING_MODEL
ENGINEERING_MODEL
```

Normal startup disables Uvicorn auto-reload so active local-model streams are not interrupted by file changes.

Enable reload when required:

```text
SOVAI_RELOAD=true
```

---

## 🛠️ Development Workflow

```bash
# Clone
git clone <repository-url>
cd SovereignAI

# Sync environment
uv sync

# Start Qdrant
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Verify Ollama
ollama list

# Run
uv run main.py
```

### Adding a dependency

Use `uv add`:

```bash
uv add <package-name>
```

This updates:

- `pyproject.toml`
- `uv.lock`

Commit both files so other developers can synchronize the same environment.

---

## ✅ Verify the Setup

### Python

```bash
python --version
```

Expected:

```text
Python 3.12.4
```

### uv

```bash
uv --version
```

### Docker

```bash
docker --version
```

### Ollama

```bash
ollama --version
```

### Models

```bash
ollama list
```

### Qdrant

Open:

```text
http://localhost:6333/dashboard
```

---

## 🧭 Example Use Case

### Inspection Report → Verified Approval Document

A representative workflow is:

```text
Scanned Inspection Report
          ↓
Vision / OCR
          ↓
Extract Findings
          ↓
Local RAG Search
          ↓
Relevant SOP / Knowledge
          ↓
Model Analysis
          ↓
Python / Sandbox
          ↓
Verification
          ↓
Report Generation
          ↓
DOCX / PDF
```

This combines multimodal understanding, local knowledge retrieval, model routing, tool execution, sandboxing, verification, and practical document generation.

---

## 🧯 Troubleshooting

### `Unsupported file format '.png'`

Use the `+` action followed by **Images & OCR Scans**. Do not upload images through the Documents page; that endpoint accepts document formats only.

### `Connection refused` during RAG indexing

Start Qdrant:

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

The application can still upload and process files without Qdrant, but knowledge-base retrieval is unavailable until Qdrant is running.

### `pytesseract` is unavailable

Direct image understanding uses Qwen2.5-VL. OCR fallback additionally requires the Python package and the Tesseract system executable.

Install the Python package with:

```bash
uv add pytesseract
```

---

## 📁 Suggested Repository Structure

```text
SovereignAI/
│
├── main.py
├── pyproject.toml
├── uv.lock
├── README.md
│
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── agents/
├── models/
├── rag/
├── tools/
├── sandbox/
├── data/
└── docs/
```

> Adjust the structure above to match the actual repository tree as the implementation evolves.

---

## 🎥 Demo Flow

For the prototype demonstration, the recommended end-to-end flow is:

```text
Login
  ↓
Dashboard
  ↓
Upload Document
  ↓
Vision / OCR
  ↓
Local RAG
  ↓
Smart Model Routing
  ↓
Agent Execution
  ↓
Python / Sandbox
  ↓
Verification
  ↓
Report Generation
  ↓
Audit / Security View
```

---

## 🗺️ Roadmap

- [ ] Complete model-routing automation
- [ ] Expand LangGraph agent workflows
- [ ] Improve multimodal document processing
- [ ] Expand local RAG pipelines
- [ ] Harden sandbox isolation
- [ ] Expand automated verification
- [ ] Add richer DOCX/PDF report generation
- [ ] Improve audit and security monitoring
- [ ] Validate fully offline deployment
- [ ] Production-grade authentication and access control

---

## 👥 Team

**Team BlackFyre**

**SOVAI — Sovereign AI Workbench**

---

## 📜 License

Add the appropriate project license here.

---

## ⭐ Project Goal

SOVAI aims to demonstrate how organizations can build useful AI-assisted workflows around sensitive information while keeping the core AI stack under their own infrastructure and control.
