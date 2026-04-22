from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.db.supabase import get_service_client
from app.services.retrieval import retrieve_context
from app.services.llm import generate_response
from app.models.schemas import ChatMessage

router = APIRouter()

@router.get("/conversations/{assistant_id}")
async def list_conversations(assistant_id: str, user=Depends(get_current_user)):
    sb = get_service_client()
    result = sb.table("conversations")\
        .select("*")\
        .eq("assistant_id", assistant_id)\
        .order("updated_at", desc=True)\
        .execute()
    return result.data

@router.post("/conversations/{assistant_id}")
async def create_conversation(assistant_id: str, user=Depends(get_current_user)):
    sb = get_service_client()
    result = sb.table("conversations").insert({
        "assistant_id": assistant_id,
        "user_id": user.id,
    }).execute()
    return result.data[0]

@router.get("/conversations/{assistant_id}/{conversation_id}/messages")
async def get_messages(assistant_id: str, conversation_id: str, user=Depends(get_current_user)):
    sb = get_service_client()
    result = sb.table("messages")\
        .select("*")\
        .eq("conversation_id", conversation_id)\
        .order("created_at")\
        .execute()
    return result.data

@router.post("/conversations/{assistant_id}/{conversation_id}/messages")
async def send_message(
    assistant_id: str,
    conversation_id: str,
    body: ChatMessage,
    user=Depends(get_current_user),
):
    sb = get_service_client()

    # Obtener el asistente (instrucciones)
    assistant_result = sb.table("assistants")\
        .select("*")\
        .eq("id", assistant_id)\
        .single()\
        .execute()
    if not assistant_result.data:
        raise HTTPException(404, "Asistente no encontrado")
    assistant = assistant_result.data

    # Guardar mensaje del usuario
    sb.table("messages").insert({
        "conversation_id": conversation_id,
        "role": "user",
        "content": body.content,
    }).execute()

    # Recuperar historial reciente (últimos 10 mensajes)
    history_result = sb.table("messages")\
        .select("role, content")\
        .eq("conversation_id", conversation_id)\
        .order("created_at", desc=True)\
        .limit(10)\
        .execute()
    history = list(reversed(history_result.data[:-1]))  # excluir el que acabamos de insertar

    # Retrieval RAG - AISLADO por assistant_id
    chunks = retrieve_context(body.content, assistant_id, sb)

    # Generar respuesta con LLM
    response_text, sources = generate_response(
        user_message=body.content,
        assistant_instructions=assistant["instructions"],
        history=history,
        chunks=chunks,
    )

    # Guardar respuesta
    msg_result = sb.table("messages").insert({
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": response_text,
        "sources": sources,
    }).execute()

    # Actualizar timestamp de conversación
    sb.table("conversations").update({"updated_at": "now()"})\
        .eq("id", conversation_id).execute()

    return msg_result.data[0]

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user=Depends(get_current_user)):
    sb = get_service_client()
    sb.table("conversations").delete().eq("id", conversation_id).execute()
    return {"ok": True}
