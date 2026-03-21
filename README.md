# RFP Intelligence

A RAG-powered chat interface for querying your organisation's RFP documents, case studies, and pitch decks. Upload PDFs, ask questions in plain English, and get cited, synthesised answers grounded in your actual documents.

## How it works

```
Upload PDF → extract + chunk → embed → store in Supabase (pgvector)
                                                    ↓
Query → HyDE expansion → decompose → multi-query retrieval → rerank → GPT-4o synthesis → answer + sources
```

**Processing pipeline**
- Text is extracted with `pdfplumber`; sparse pages (< 100 chars) fall back to GPT-4o Vision
- Repeated lines across 3+ pages (headers, footers, page numbers) are stripped
- Section headings are detected and prepended to the embedding text
- 150-token child chunks are embedded for retrieval; each carries a 500-token parent window used for synthesis

**Search pipeline**
1. **HyDE** — generates a hypothetical answer to the query, embeds that instead of the raw question for better semantic alignment
2. **Multi-query** — decomposes compound queries into up to 4 sub-questions and retrieves for each, then deduplicates
3. **Hybrid search** — combines vector similarity and full-text search via Supabase RPC with Reciprocal Rank Fusion
4. **LLM reranking** — GPT-4o-mini scores the merged candidate set; top 5 are kept for synthesis

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, Tailwind CSS |
| Backend | FastAPI (Python) |
| Database + vectors | Supabase (PostgreSQL + pgvector) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| Synthesis | OpenAI `gpt-4o` |
| Reranking / HyDE | OpenAI `gpt-4o-mini` |
| PDF parsing | pdfplumber, PyMuPDF |

## Project structure

```
ai-rfp-intelligence/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app, CORS config
│   │   ├── schemas.py            # Pydantic models
│   │   ├── routers/
│   │   │   ├── auth.py           # Login endpoint
│   │   │   ├── documents.py      # Upload, list, get, delete endpoints
│   │   │   └── search.py         # Query pipeline (HyDE, decompose, rerank, synthesise)
│   │   └── services/
│   │       └── processing.py     # PDF extraction, chunking, embedding
│   └── requirements.txt
└── frontend/
    └── src/
        ├── middleware.ts         # Auth cookie check, redirects to /login
        └── app/
            ├── page.tsx          # Chat UI and document manager
            ├── login/page.tsx    # Login form
            ├── components/       # Sidebar, Header, ChatInput, DocumentManager
            ├── services/api.ts   # API client
            └── types/types.ts    # Shared types
```

## Local setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- A [Supabase](https://supabase.com) project with pgvector enabled
- An OpenAI API key

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
LOGIN_USERNAME=your-username
LOGIN_PASSWORD=your-password
AUTH_TOKEN_SECRET=your-secret
```

Start the API:

```bash
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:3000`.


## API reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate. Body: `{ "username": "...", "password": "..." }` |
| `POST` | `/api/search` | Query documents. Body: `{ "query": "..." }` |
| `GET` | `/api/documents` | List all uploaded documents |
| `GET` | `/api/documents/{id}` | Get a single document by ID |
| `POST` | `/api/documents` | Upload a PDF. Form fields: `file`, `document_type` |
| `DELETE` | `/api/documents/{id}` | Delete a document and its chunks |

**Supported document types:** `RFP Document`, `Case Study`, `Pitch Deck`, `Client Presentation`

**Search response shape:**

```json
{
  "query": "What is our experience with federal contracts?",
  "confidence_level": "high",
  "synthesized_response": "...",
  "sources": [
    {
      "filename": "proposal-2024.pdf",
      "locator": "Page 12",
      "similarity_score": 0.021,
      "snippet": "..."
    }
  ]
}
```
