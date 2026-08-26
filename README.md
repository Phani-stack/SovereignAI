to switch venv: venv\Scripts\activate
to run application: streamlit run app.py

ai-workspace/
│
├── frontend/                         # UI / Client layer
│   ├── app.py                        # Streamlit entry point
│   ├── pages/
│   │   ├── chat.py
│   │   ├── files.py
│   │   ├── images.py
│   │   └── tasks.py
│   ├── components/
│   │   ├── chat_ui.py
│   │   ├── file_uploader.py
│   │   └── task_view.py
│   └── assets/
│
├── backend/                          # API Backend
│   ├── main.py                       # FastAPI entry point
│   ├── api/
│   │   ├── routes/
│   │   │   ├── chat.py
│   │   │   ├── files.py
│   │   │   ├── images.py
│   │   │   └── tasks.py
│   │   └── dependencies.py
│   │
│   ├── schemas/                      # Request/response models
│   │   ├── chat.py
│   │   ├── file.py
│   │   └── task.py
│   │
│   └── services/
│       ├── chat_service.py
│       ├── file_service.py
│       └── task_service.py
│
├── orchestration/                    # AI Orchestration / LangGraph
│   ├── graph.py
│   ├── state.py
│   ├── nodes/
│   │   ├── planner.py
│   │   ├── agent_router.py
│   │   ├── executor.py
│   │   └── verifier.py
│   └── workflows/
│       ├── chat_workflow.py
│       └── task_workflow.py
│
├── agents/                           # Specialized AI agents
│   ├── research_agent.py
│   ├── rag_agent.py
│   ├── coding_agent.py
│   ├── document_agent.py
│   └── multimodal_agent.py
│
├── models/                           # Local / external AI models
│   ├── llm/
│   │   ├── ollama.py
│   │   ├── groq.py
│   │   └── openai.py
│   │
│   ├── embeddings/
│   │   ├── local_embeddings.py
│   │   └── embedding_service.py
│   │
│   └── vision/
│       ├── vision_model.py
│       └── image_processor.py
│
├── rag/                              # Retrieval Augmented Generation
│   ├── ingestion/
│   │   ├── document_loader.py
│   │   ├── chunker.py
│   │   └── metadata.py
│   │
│   ├── retrieval/
│   │   ├── retriever.py
│   │   └── reranker.py
│   │
│   └── vectorstore/
│       ├── qdrant.py
│       └── collections.py
│
├── multimodal/                       # Multimodal processing
│   ├── ocr/
│   │   ├── ocr_engine.py
│   │   └── text_extractor.py
│   │
│   ├── vision/
│   │   ├── image_analyzer.py
│   │   └── vision_pipeline.py
│   │
│   └── document_parser.py
│
├── tools/                            # Tools layer
│   ├── files/
│   │   ├── read_file.py
│   │   ├── write_file.py
│   │   └── file_search.py
│   │
│   ├── search/
│   │   └── web_search.py
│   │
│   ├── python/
│   │   └── python_executor.py
│   │
│   ├── email/
│   │   └── email_tool.py
│   │
│   └── calculations/
│       └── calculator.py
│
├── storage/                          # Data / workspace storage
│   ├── uploads/
│   ├── processed/
│   ├── outputs/
│   ├── vector_db/
│   └── workspace/
│
├── security/                         # Security & governance layer
│   ├── authentication.py
│   ├── authorization.py
│   ├── rbac.py
│   ├── permissions.py
│   ├── audit.py
│   └── middleware.py
│
├── config/                           # Configuration
│   ├── settings.py
│   ├── logging.py
│   └── model_config.py
│
├── database/                         # Persistent application DB
│   ├── connection.py
│   ├── models.py
│   └── repositories/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── deployment/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── nginx/
│   │   └── nginx.conf
│   └── kubernetes/
│
├── .env
├── .env.example
├── .gitignore
├── requirements.txt
├── pyproject.toml
├── README.md
└── docker-compose.yml