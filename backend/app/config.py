from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_ANON_KEY: str
    # Configuración General / OpenAI estándar
    OPENAI_API_KEY: str = "sk-..."
    
    # Azure AI Foundry / Azure OpenAI
    AZURE_OPENAI_API_VERSION: str = "2024-02-01"
    
    # Chat (Model Deployment)
    AZURE_OPENAI_CHAT_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_CHAT_KEY: Optional[str] = None
    AZURE_OPENAI_CHAT_DEPLOYMENT: Optional[str] = None
    
    # Embeddings (Model Deployment)
    AZURE_OPENAI_EMBEDDING_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_EMBEDDING_KEY: Optional[str] = None
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: Optional[str] = None

    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
