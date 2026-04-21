from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from app.config import settings

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verifica el JWT de Supabase y devuelve el user_id."""
    token = credentials.credentials
    # Usamos anon key para verificar el token del usuario
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    try:
        user = supabase.auth.get_user(token)
        if not user.user:
             raise HTTPException(status_code=401, detail="Token inválido o expirado")
        return user.user
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
