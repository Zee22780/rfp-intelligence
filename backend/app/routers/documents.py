from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from app.schemas import DocumentItem, DocumentListResponse, DocumentType
from app.services.processing import process_document
import os
from dotenv import load_dotenv
from supabase import create_client
from uuid import UUID, uuid4
from datetime import datetime

load_dotenv()

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

router = APIRouter()

# -------------------------------------------------------------
#  Get a list of all documents
# -------------------------------------------------------------

@router.get("/documents", response_model=DocumentListResponse)
def list_documents():
    results = supabase.table("documents").select("*").execute()

    document_list = [
        DocumentItem(
            id=r["id"],
            filename=r["filename"],
            file_type=r["file_type"],
            document_type=r["document_type"],
            status=r["status"],
            date_uploaded=r["date_uploaded"]
        )
        for r in results.data
    ]
    

    return DocumentListResponse(
        document_list=document_list
    )

# -------------------------------------------------------------
#  Get one document based on id
# -------------------------------------------------------------

@router.get("/documents/{id}", response_model=DocumentItem)
def get_document(id: UUID):
    result = supabase.table("documents").select("*").eq("id", str(id)).execute()

    r = result.data[0]

    return DocumentItem(
        id=r["id"],
        filename=r["filename"],
        file_type=r["file_type"],
        document_type=r["document_type"],
        status=r["status"],
        date_uploaded=r["date_uploaded"]
    )

# -------------------------------------------------------------
#  Delete a single document
# -------------------------------------------------------------

@router.delete("/documents/{id}")
def delete_document(id: UUID):
    # 1. Get the document first (need storage_path)
    doc_result = supabase.table("documents").select("*").eq("id", str(id)).execute()
    
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    
    storage_path = doc_result.data[0]["storage_path"]
    
    # 2. Delete chunks
    supabase.table("chunks").delete().eq("document_id", str(id)).execute()
    
    # 3. Delete file from storage
    supabase.storage.from_("rfp-documents").remove([storage_path])
    
    # 4. Delete document record
    supabase.table("documents").delete().eq("id", str(id)).execute()
    
    return {"message": "Document successfully deleted"}


# -------------------------------------------------------------
#  Upload a document
# -------------------------------------------------------------

@router.post("/documents")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...)
):
    # 1. Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # 2. Generate unique filename to avoid collisions
    file_id = str(uuid4())
    storage_path = f"{file_id}/{file.filename}"
    
    # 3. Read file content
    file_content = await file.read()
    
    # 4. Upload to Supabase Storage
    storage_result = supabase.storage.from_("rfp-documents").upload(
        path=storage_path,
        file=file_content,
        file_options={"content-type": "application/pdf"}
    )
    
    # 5. Create document record in database
    doc_record = {
        "filename": file.filename,
        "file_type": "pdf",
        "document_type": document_type,
        "storage_path": storage_path,
        "status": "queued",
        "date_uploaded": datetime.now().isoformat()
    }
    
    result = supabase.table("documents").insert(doc_record).execute()

    #  Initiate background processing
    doc = result.data[0]
    background_tasks.add_task(process_document, doc["id"], storage_path)
    
    return {
        "message": "Document uploaded successfully",
        "document": doc
    }