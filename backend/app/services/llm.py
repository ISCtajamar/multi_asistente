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

SYSTEM_TEMPLATE = """Eres un asistente especializado. Sigue SIEMPRE estas reglas:

{instructions}

---

REGLAS DE COMPORTAMIENTO (obligatorias):
1. Responde ÚNICAMENTE basándote en los fragmentos de documentos proporcionados en el contexto.
2. Si el contexto no contiene información suficiente para responder, di explícitamente:
   "No tengo información suficiente en los documentos disponibles para responder a esta pregunta."
   NO inventes, NO uses conocimiento externo.
3. Al final de tu respuesta, añade siempre una sección "**Fuentes:**" listando los fragmentos usados,
   con el formato: [Fragmento X] - primeras palabras del fragmento...
4. Si el contexto es suficiente, responde de forma clara y concisa citando los fragmentos relevantes
   con la notación [Fragmento X] dentro del texto.
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

    # Preparar sources para guardar en BD
    sources = [
        {
            "chunk_id": chunk["id"],
            "document_id": chunk["document_id"],
            "content_preview": chunk["content"][:200],
            "similarity": chunk["similarity"],
        }
        for chunk in chunks
    ]

    return response_text, sources
