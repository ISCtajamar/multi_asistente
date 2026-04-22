from openai import AzureOpenAI, OpenAI
from app.config import settings

if settings.AZURE_OPENAI_EMBEDDING_ENDPOINT:
    client = AzureOpenAI(
        api_key=settings.AZURE_OPENAI_EMBEDDING_KEY or settings.OPENAI_API_KEY,
        api_version=settings.AZURE_OPENAI_API_VERSION,
        azure_endpoint=settings.AZURE_OPENAI_EMBEDDING_ENDPOINT
    )
    EMBEDDING_MODEL = settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
else:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    EMBEDDING_MODEL = "text-embedding-3-small"

def retrieve_context(query: str, assistant_id: str, supabase_client, k: int = 5):
    """
    Recupera los k chunks más relevantes SOLO del asistente indicado.
    Usa la función SQL match_chunks que filtra por assistant_id.
    """
    # 1. Embedding de la query
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=query,
    )
    query_embedding = response.data[0].embedding

    # 2. Búsqueda vectorial filtrada por assistant_id
    result = supabase_client.rpc("match_chunks", {
        "query_embedding": query_embedding,
        "match_assistant_id": assistant_id,
        "match_count": k,
        "match_threshold": 0.25,
    }).execute()

    return result.data  # lista de {id, document_id, content, metadata, similarity}
