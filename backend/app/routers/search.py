import json
from fastapi import APIRouter
from app.schemas import SearchRequest, SearchResponse, SourceMatch, SearchHistoryItem, SearchHistoryResponse
import os
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client

load_dotenv()

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

router = APIRouter()

# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

def get_embedding(text: str) -> list[float]:
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


# ---------------------------------------------------------------------------
# Item 6: HyDE query expansion
# ---------------------------------------------------------------------------

def generate_hypothetical_answer(query: str) -> str:
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini", max_tokens=200,
        messages=[{"role": "user", "content": (
            "You are an expert on RFP responses and company capabilities documents. "
            "Write a concise paragraph (2-4 sentences) that would appear in a company proposal "
            f"and directly answers this question:\n\n{query}\n\n"
            "Write the paragraph as if it appears in a professional document. "
            "Do not say you are guessing. Just write the passage."
        )}]
    )
    return response.choices[0].message.content.strip()


def embed_for_search(query: str, use_hyde: bool = True) -> list[float]:
    text = generate_hypothetical_answer(query) if use_hyde else query
    return get_embedding(text)


# ---------------------------------------------------------------------------
# Item 5: Hybrid search via match_chunks_hybrid RPC
# RRF scores are ~0.005–0.030, not 0–1 cosine values.
# ---------------------------------------------------------------------------

SCORE_FLOOR = 0.001


def search_chunks(query: str, query_embedding: list[float], top_k: int = 10) -> list[dict]:
    result = supabase.rpc("match_chunks_hybrid", {
        "query_embedding": query_embedding,
        "query_text": query,
        "match_count": top_k
    }).execute()
    return [r for r in result.data if r["similarity"] >= SCORE_FLOOR]


# ---------------------------------------------------------------------------
# Item 4: LLM re-ranking
# ---------------------------------------------------------------------------

def rerank_chunks(query: str, chunks: list[dict], top_n: int = 5) -> list[dict]:
    if not chunks:
        return []

    chunk_descriptions = "\n\n".join([
        f"[Chunk {i+1}]:\n{c['chunk_text'][:400]}"
        for i, c in enumerate(chunks)
    ])
    prompt = (
        f"Score each chunk's relevance to the question on a scale of 0-10.\n"
        f"Reply ONLY with a JSON array of integers, one per chunk, in order.\n"
        f"Example for 3 chunks: [8, 2, 6]\n\n"
        f"QUESTION: {query}\n\n"
        f"CHUNKS:\n{chunk_descriptions}\n\n"
        f"SCORES (JSON array only):"
    )

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini", max_tokens=100,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        scores = json.loads(raw)
        if not isinstance(scores, list) or len(scores) != len(chunks):
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        print(f"[rerank] failed to parse scores, returning chunks as-is. raw={raw!r}")
        return chunks[:top_n]
    scored = sorted(zip(scores, chunks), key=lambda x: x[0], reverse=True)
    print(f"[rerank] scores: {scores}")
    return [chunk for _, chunk in scored[:top_n]]


# ---------------------------------------------------------------------------
# Item 10: Multi-query retrieval
# ---------------------------------------------------------------------------

def decompose_query(query: str) -> list[str]:
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini", max_tokens=200,
        messages=[{"role": "user", "content": (
            "Break this question into 1-4 independent retrieval sub-questions. "
            "If already simple, return just the original question. "
            "Reply ONLY with a JSON array of strings.\n\nQuestion: " + query
        )}]
    )
    raw = response.choices[0].message.content.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        sub_queries = json.loads(raw)
        if not isinstance(sub_queries, list) or not sub_queries:
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        print(f"[decompose] failed to parse, falling back to original query. raw={raw!r}")
        sub_queries = [query]
    print(f"[decompose] sub-queries: {sub_queries}")
    return sub_queries


# ---------------------------------------------------------------------------
# Synthesis
# ---------------------------------------------------------------------------

def synthesize_response(query: str, chunks: list[dict]) -> str:
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        # Item 8: use parent window for synthesis when available
        chunk_body = chunk.get("parent_chunk_text") or chunk["chunk_text"]
        context_parts.append(
            f"[Source {i}: {chunk['filename']}, {chunk['locator']}]\n{chunk_body}"
        )

    context = "\n\n---\n\n".join(context_parts)

    prompt = f"""You are helping draft an RFP response. Using ONLY the sources provided below, answer the question.

RULES:
- Use only information from the provided sources
- Cite each claim with [Source N]
- If the sources don't contain enough information, say so clearly
- Be concise and professional
- Format your response using markdown: use bullet points for lists or multiple items, bold for key terms, and short paragraphs with line breaks for longer answers. Use plain prose only when the answer is a single short sentence.

SOURCES:
{context}

QUESTION: {query}

RESPONSE:"""

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/search", response_model=SearchResponse)
def search(request: SearchRequest):
    # Item 6: embed query via HyDE (or raw if use_hyde=False)
    query_embedding = embed_for_search(request.query, use_hyde=request.use_hyde)

    # Item 10: decompose into sub-queries, retrieve for each, deduplicate by id
    sub_queries = decompose_query(request.query)
    seen_ids: set = set()
    merged: list[dict] = []
    for sub_q in sub_queries:
        sub_embedding = embed_for_search(sub_q, use_hyde=request.use_hyde)
        for r in search_chunks(sub_q, sub_embedding, top_k=6):
            if r["id"] not in seen_ids:
                seen_ids.add(r["id"])
                merged.append(r)

    # Item 4: rerank merged candidates, keep top 5
    results = rerank_chunks(request.query, merged, top_n=5)

    # Log query and results to Supabase (best-effort, never breaks the response)
    try:
        log_result = supabase.table("query_log").insert({"query_text": request.query}).execute()
        query_log_id = log_result.data[0]["id"]
        rows = [
            {"query_id": query_log_id, "chunk_id": r["id"], "similarity_score": r["similarity"], "rank": i}
            for i, r in enumerate(results, start=1)
        ]
        if rows:
            supabase.table("query_results").insert(rows).execute()
    except Exception as e:
        print(f"[search log] failed to write to Supabase: {e}")

    # Confidence by rank position (RRF scores are not 0-1, so don't threshold on similarity)
    if len(results) >= 2:
        confidence = "high"
    elif len(results) == 1:
        confidence = "medium"
    else:
        confidence = "low"

    sources = [
        SourceMatch(
            filename=r["filename"],
            locator=r["locator"],
            similarity_score=r["similarity"],
            snippet=r["chunk_text"][:300],
        )
        for r in results
    ]

    synthesized = synthesize_response(request.query, results)

    return SearchResponse(
        query=request.query,
        sources=sources,
        confidence_level=confidence,
        synthesized_response=synthesized
    )


@router.get("/search-history", response_model=SearchHistoryResponse)
def get_search_history(limit: int = 10):
    result = (
        supabase.table("query_log")
        .select("id, query_text, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    items = [
        SearchHistoryItem(id=r["id"], query_text=r["query_text"], created_at=r["created_at"])
        for r in result.data
    ]
    return SearchHistoryResponse(items=items)
