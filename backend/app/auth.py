from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from app.config import settings

from pydantic import BaseModel

class MockUser(BaseModel):
    id: str = "00000000-0000-0000-0000-000000000000"
    email: str = "user@example.com"

def get_current_user():
    """Devuelve un usuario estático para saltar el control de usuarios."""
    return MockUser()
