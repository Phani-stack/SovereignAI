# SoverignAI

A local AI workbench for private, offline-capable **RAG and local LLM inference** using Ollama and Qdrant.

## Requirements

| Component           | Version / Details  |
| ------------------- | ------------------ |
| **Python**          | `3.12.4`           |
| **Package Manager** | `uv`               |
| **Docker**          | `28.4.0`           |
| **Vector Database** | Qdrant             |
| **LLM**             | `qwen2.5:3b`       |
| **Coding Model**    | `qwen2.5-coder:7b` |
| **Vision Model**    | `qwen2.5vl:3b`     |
| **Embedding Model** | `nomic-embed-text` |

-- 

# Ollama Models

The project uses the following local Ollama models:

| Model              | Purpose                                |
| ------------------ | -------------------------------------- |
| `nomic-embed-text` | Generate document and query embeddings |
| `qwen2.5:3b`       | General-purpose AI tasks               |
| `qwen2.5-coder:7b` | Coding-related tasks                   |
| `qwen2.5vl:3b`     | Image and vision-related tasks         |

Pull all required models:

```bash
ollama pull nomic-embed-text
ollama pull qwen2.5:3b
ollama pull qwen2.5-coder:7b
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
qwen2.5-coder:7b
qwen2.5vl:3b
```

---

# Developer Setup

## 1. Clone the Repository

```bash
git clone <repository-url>
cd SoverignAI
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

---

# Development Workflow

After cloning the repository:

```bash
git clone <repository-url>
cd SoverignAI
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
qwen2.5-coder:7b
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
cd SoverignAI

# Create/sync environment and install dependencies
uv sync

# Start Qdrant
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Pull Ollama models
ollama pull nomic-embed-text
ollama pull qwen2.5:3b
ollama pull qwen2.5-coder:7b
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
