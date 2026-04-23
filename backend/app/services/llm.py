from openai import AzureOpenAI, OpenAI
from app.config import settings

if settings.AZURE_OPENAI_CHAT_ENDPOINT:
    client = AzureOpenAI(
        api_key=settings.AZURE_OPENAI_CHAT_KEY or settings.OPENAI_API_KEY,
        api_version=settings.AZURE_OPENAI_API_VERSION,
        azure_endpoint=settings.AZURE_OPENAI_CHAT_ENDPOINT
    )
    CHAT_MODEL = settings.AZURE_OPENAI_CHAT_DEPLOYMENT
else:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    CHAT_MODEL = "gpt-4o-mini"

SYSTEM_TEMPLATE = """Eres un asistente inteligente.

INSTRUCCIONES DE TU PERSONALIDAD:
{instructions}

---

REGLAS DE CONTEXTO Y RESPUESTA:
1. Eres un asistente conversacional. Puedes responder a saludos, despedidas o conversaciones triviales (ej. "Hola", "¿Qué tal?") de forma natural y educada, siguiendo tu personalidad.
2. Sin embargo, para CUALQUIER pregunta que requiera información, hechos, datos, explicaciones, recetas o conocimiento específico, DEBES usar ÚNICA Y EXCLUSIVAMENTE los fragmentos de documentos proporcionados en el contexto.
3. Si el usuario pide información específica y NO está en el contexto de los documentos, DEBES negarte a responder diciendo amablemente que "No dispongo de esa información en mis documentos". NO uses tu conocimiento previo para responder.
4. NO menciones los fragmentos ni cites las fuentes (no digas "según el fragmento 1"). Responde de forma directa y fluida.
"""

def generate_response(
    user_message: str,
    assistant_instructions: str,
    history: list[dict],
    chunks: list[dict],
) -> tuple[str, list[dict]]:

    # Construir contexto de documentos
    if chunks:
        context_parts = []
        for i, chunk in enumerate(chunks):
            context_parts.append(f"[Fragmento {i+1}] (similitud: {chunk['similarity']:.2f})\n{chunk['content']}")
        context_text = "\n\n".join(context_parts)
    else:
        context_text = "No se encontraron fragmentos relevantes en los documentos del asistente."

    system_prompt = SYSTEM_TEMPLATE.format(instructions=assistant_instructions)

    # Construir mensajes
    messages = [{"role": "system", "content": system_prompt}]

    # Historial de conversación
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Mensaje del usuario con contexto RAG
    user_content = f"""CONTEXTO DE DOCUMENTOS:
{context_text}

---

PREGUNTA DEL USUARIO:
{user_message}"""

    messages.append({"role": "user", "content": user_content})

    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        temperature=0.2,  # bajo para respuestas más fieles al contexto
        max_tokens=1500,
    )

    response_text = response.choices[0].message.content

    # No devolvemos las fuentes al frontend según la petición del usuario
    sources = []

    return response_text, sources
