from supabase import create_client, Client
from app.config import settings

def get_supabase_client(jwt: str = None) -> Client:
    """
    Devuelve un cliente de Supabase.
    Si se pasa un JWT, el cliente actuará en nombre del usuario (RLS).
    """
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    if jwt:
        client.postgrest.auth(jwt)
    return client

def get_service_client() -> Client:
    """
    Devuelve un cliente con la service_role key (salta RLS).
    Usar con cuidado solo para tareas administrativas o ingesta.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
