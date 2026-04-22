from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from app.auth import get_current_user
from app.db.supabase import get_service_client
from app.services.ingestion import extract_text, chunk_text, get_embeddings

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/markdown": "md",
}

@router.get("/{assistant_id}")
async def list_documents(assistant_id: str, user=Depends(get_current_user)):
    sb = get_service_client()
    result = sb.table("documents")\
        .select("*")\
        .eq("assistant_id", assistant_id)\
        .order("created_at", desc=True)\
        .execute()
    return result.data

@router.post("/{assistant_id}")
async def upload_document(
    assistant_id: str,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user=Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Tipo no soportado: {file.content_type}")

    file_type = ALLOWED_TYPES[file.content_type]
    file_bytes = await file.read()
    sb = get_service_client()

    # Subir a Storage
    storage_path = f"{user.id}/{assistant_id}/{file.filename}"
    sb.storage.from_("documents").upload(storage_path, file_bytes)

    # Crear registro en BD con status pending
    doc_result = sb.table("documents").insert({
        "assistant_id": assistant_id,
        "user_id": user.id,
        "filename": file.filename,
        "file_path": storage_path,
        "file_type": file_type,
        "status": "processing",
    }).execute()
    document = doc_result.data[0]

    # Procesar en background
    background_tasks.add_task(
        process_document, document["id"], assistant_id, file_bytes, file_type, sb
    )
    return document

async def process_document(doc_id, assistant_id, file_bytes, file_type, sb):
    try:
        text = extract_text(file_bytes, file_type)
        chunks = chunk_text(text)
        embeddings = get_embeddings(chunks)

        rows = [
            {
                "document_id": doc_id,
                "assistant_id": assistant_id,
                "content": chunk,
                "chunk_index": i,
                "embedding": emb,
                "metadata": {"chunk_index": i, "total_chunks": len(chunks)},
            }
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
        ]

        # Insertar en lotes de 100
        for i in range(0, len(rows), 100):
            sb.table("document_chunks").insert(rows[i:i+100]).execute()

        sb.table("documents").update({"status": "ready"}).eq("id", doc_id).execute()
    except Exception as e:
        sb.table("documents").update({"status": "error"}).eq("id", doc_id).execute()
        raise e

@router.delete("/{assistant_id}/{document_id}")
async def delete_document(assistant_id: str, document_id: str, user=Depends(get_current_user)):
    sb = get_service_client()
    # Borrar chunks (CASCADE lo hace automáticamente, pero por si acaso)
    sb.table("document_chunks").delete().eq("document_id", document_id).execute()
    # Borrar documento
    sb.table("documents").delete()\
        .eq("id", document_id)\
        .eq("assistant_id", assistant_id)\
        .execute()
    return {"ok": True}
