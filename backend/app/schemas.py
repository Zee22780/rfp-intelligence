from pydantic import BaseModel
from typing import List, Literal, Optional
from uuid import UUID
from datetime import datetime

# -------------------------------------------------------------
# Search Request and Response Schemas
# -------------------------------------------------------------

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 10
    use_hyde: Optional[bool] = True

class SourceMatch(BaseModel):
    filename: str
    locator: str
    similarity_score: float
    # For a small preview of the text check, add snippet
    snippet: str

class SearchResponse(BaseModel):
    query: str
    sources: List[SourceMatch]
    confidence_level: Literal["high", "medium", "low"]
    synthesized_response: str

# -------------------------------------------------------------
#  Document Upload and Processing Schemas
# -------------------------------------------------------------

DocumentType = Literal["RFP Document", "Case Study", "Pitch Deck", "Client Presentation"]

class DocumentItem(BaseModel):
    id: UUID
    filename: str
    file_type: str
    document_type: DocumentType
    status: str
    date_uploaded: datetime

class DocumentListResponse(BaseModel):
    document_list: List[DocumentItem]

class SearchHistoryItem(BaseModel):
    id: UUID
    query_text: str
    created_at: datetime

class SearchHistoryResponse(BaseModel):
    items: List[SearchHistoryItem]