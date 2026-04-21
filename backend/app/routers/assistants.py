from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.db.supabase import get_supabase_client
from app.models.schemas import AssistantCreate, AssistantUpdate

router = APIRouter()

@router.get("/")
async def list_assistants(user=Depends(get_current_user)):
    sb = get_supabase_client(user.id)  # pasa JWT del usuario → RLS activo
    result = sb.table("assistants").select("*").order("created_at", desc=True).execute()
    return result.data

@router.post("/")
async def create_assistant(body: AssistantCreate, user=Depends(get_current_user)):
    sb = get_supabase_client(user.id)
    result = sb.table("assistants").insert({
        "user_id": user.id,
        "name": body.name,
        "description": body.description,
        "instructions": body.instructions,
    }).execute()
    return result.data[0]

@router.put("/{assistant_id}")
async def update_assistant(assistant_id: str, body: AssistantUpdate, user=Depends(get_current_user)):
    sb = get_supabase_client(user.id)
    result = sb.table("assistants").update(body.model_dump(exclude_none=True))\
        .eq("id", assistant_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Asistente no encontrado")
    return result.data[0]

@router.delete("/{assistant_id}")
async def delete_assistant(assistant_id: str, user=Depends(get_current_user)):
    sb = get_supabase_client(user.id)
    sb.table("assistants").delete().eq("id", assistant_id).eq("user_id", user.id).execute()
    return {"ok": True}
