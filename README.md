# SovereignAI

A local AI workbench for private, offline-capable **RAG, local LLM inference, and vision analysis** using Ollama and Qdrant.

## Requirements

| Component           | Version / Details  |
| ------------------- | ------------------ |
| **Python**          | `3.12.4`           |
| **Package Manager** | `uv`               |
| **Docker**          | `28.4.0`           |
| **Vector Database** | Qdrant (optional for uploads) |
| **LLM**             | `qwen2.5:3b`       |
| **Coding Model**    | `qwen2.5-coder:3b` |
| **Engineering Model** | `qwen3:4b`       |
| **Vision Model**    | `qwen2.5vl:3b`     |
| **Embedding Model** | `nomic-embed-text` |

---

# Ollama Models

The project uses the following local Ollama models:

| Model              | Purpose                                |
| ------------------ | -------------------------------------- |
| `nomic-embed-text` | Generate document and query embeddings |
| `qwen2.5:3b`       | General-purpose AI tasks               |
| `qwen2.5-coder:3b` | Coding-related tasks                   |
| `qwen3:4b`         | Engineering, mathematics, and calculations |
| `qwen2.5vl:3b`     | Image and vision-related tasks         |

Pull all required models:

```bash
ollama pull nomic-embed-text
ollama pull qwen2.5:3b
ollama pull qwen2.5-coder:3b
ollama pull qwen3:4b
ollama pull qwen2.5vl:3b
```

Verify the installed models:

```bash
ollama list
```

The following models should be available:

```text
nomic-embed-text
qwen2.5:3b
qwen2.5-coder:3b
qwen3:4b
qwen2.5vl:3b
```

---

# Developer Setup

## 1. Clone the Repository

```bash
git clone <repository-url>
cd SovereignAI
```

## 2. Create the Virtual Environment

Create the virtual environment using `uv`:

```bash
uv venv
```

## 3. Install Dependencies

All Python dependencies are defined in `pyproject.toml` and locked in `uv.lock`.

Run:

```bash
uv sync
```

This automatically installs all required Python dependencies into the project's virtual environment.

> There is no need to manually install individual Python packages.

## 4. Activate the Virtual Environment

### Windows PowerShell

```powershell
.\.venv\Scripts\activate
```

### Linux / macOS

```bash
source .venv/bin/activate
```

> Activation is optional when using `uv run`.

---

# Qdrant Setup

Qdrant is used as the local vector database for storing and retrieving document embeddings.

Start Qdrant using Docker:

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

Qdrant will be available at:

```text
http://localhost:6333
```

### Qdrant Dashboard

Open the Qdrant dashboard:

```text
http://localhost:6333/dashboard
```

---

# Running the Project

The root `main.py` is the main entry point for the project.

Run:

```bash
uv run main.py
```

Alternatively:

```bash
uv run python main.py
```

## Attachments and Vision

Use the `+` button in the composer to attach files:

| Attachment | Processing path |
| --- | --- |
| PNG, JPG, JPEG, WEBP, SVG, GIF | Qwen2.5-VL vision model |
| PDF, DOC, DOCX | Text extraction plus Qwen2.5-VL analysis |
| TXT, Markdown, code, CSV, spreadsheets | Document upload and RAG/chat processing |

Images and PDF/Word documents can be sent with a question to the vision model.
The backend saves uploaded files before processing them. Qdrant indexes documents
for retrieval, but an upload still succeeds when Qdrant is offline; the server
logs an `RAG Indexing Warning` and skips vector indexing in that case.

The default vision model is `qwen2.5vl:3b`. Override local model settings with
environment variables such as `VISION_MODEL`, `OLLAMA_BASE_URL`, and
`EMBEDDING_MODEL` before starting the backend.

---

# Development Workflow

After cloning the repository:

```bash
git clone <repository-url>
cd SovereignAI
```

Sync the project environment:

```bash
uv sync
```

Start Qdrant:

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

Verify the Ollama models:

```bash
ollama list
```

Run the project:

```bash
uv run main.py
```

---

# Adding Dependencies

Use `uv add` when adding a new Python dependency:

```bash
uv add <package-name>
```

This automatically updates:

* `pyproject.toml`
* `uv.lock`

Commit both files so other developers can synchronize the same environment.

Other developers can then run:

```bash
uv sync
```

---

# Verify the Setup

### Check Python

```bash
python --version
```

Expected:

```text
Python 3.12.4
```

### Check uv

```bash
uv --version
```

### Check Docker

```bash
docker --version
```

Expected:

```text
Docker version 28.4.0
```

### Check Ollama

```bash
ollama --version
```

### Check Ollama Models

```bash
ollama list
```

### Exit From Virtual Environment
```bash
deactivate
```

The following models should be available:

```text
nomic-embed-text
qwen2.5:3b
qwen2.5-coder:3b
qwen2.5vl:3b
```

### Check Qdrant

Open:

```text
http://localhost:6333/dashboard
```

---

# Quick Setup

For a new developer:

```bash
# Clone repository
git clone <repository-url>

# Enter project
cd SovereignAI

# Create/sync environment and install dependencies
uv sync

# Start Qdrant
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Pull Ollama models
ollama pull nomic-embed-text
ollama pull qwen2.5:3b
ollama pull qwen2.5-coder:3b
ollama pull qwen2.5vl:3b

# Verify models
ollama list

# Run the project
uv run main.py
```

---

## Development Environment

The project uses:

* **uv** - Python project and dependency management
* **Ollama** - Local LLM, coding, vision, and embedding inference
* **Qdrant** - Local vector database
* **Docker** - Container runtime for Qdrant
* **Python 3.12.4** - Application runtime
# Engineering and mathematics model

SOVAI includes a dedicated **Engineering / Math / Calculations** route in the model selector. By default it uses `qwen3:4b` with a technical response guide for equations, units, assumptions, numbered working, and final answers.

```bash
ollama pull qwen3:4b
```

Override the local model with `ENGINEERING_MODEL` in your environment if required.

Normal startup disables Uvicorn auto-reload so an active local-model stream is not
terminated by a file change. Developers can opt in with `SOVAI_RELOAD=true`.

## Troubleshooting

### `Unsupported file format '.png'`

Use `+` followed by **Images & OCR Scans**. Do not upload images through the
Documents page; that endpoint accepts document formats only.

### `Connection refused` during RAG indexing

Start Qdrant and retry indexing:

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

The application can still upload and process files without Qdrant, but retrieval
from the knowledge base is unavailable until Qdrant is running.

### `pytesseract` is unavailable

Direct image understanding uses Qwen2.5-VL. OCR fallback additionally requires
the optional Python package and the Tesseract system executable:

```bash
uv add pytesseract
```
