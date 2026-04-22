from supabase import create_client, Client
from app.config import settings

def get_supabase_client(jwt: str = None) -> Client:
    """
    Devuelve un cliente de Supabase con service_role para saltar RLS.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

def get_service_client() -> Client:
    """
    Devuelve un cliente con la service_role key (salta RLS).
    Usar con cuidado solo para tareas administrativas o ingesta.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
