# 📋 Instrucciones Técnicas: Aplicación Full-Stack RAG Multi-Asistente

## Stack definitivo

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + React |
| Backend | Python + FastAPI |
| Base de datos | Supabase (PostgreSQL + pgvector + Auth + Storage) |
| LLM | OpenAI `gpt-4o-mini` |
| Embeddings | OpenAI `text-embedding-3-small` |
| Autenticación | Supabase Auth |

---

## Estructura del repositorio

```
rag-assistants/
├── frontend/                  # Next.js app
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/
│   │   │   ├── assistants/
│   │   │   │   ├── page.tsx           # Listado de asistentes
│   │   │   │   ├── new/page.tsx       # Crear asistente
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # Detalle/edición asistente
│   │   │   │       ├── documents/     # Documentos del asistente
│   │   │   │       └── chat/page.tsx  # Chat con el asistente
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/
│   │   ├── supabase.ts        # Cliente Supabase
│   │   └── api.ts             # Calls al backend FastAPI
│   ├── .env.local
│   └── package.json
│
├── backend/                   # FastAPI app
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── assistants.py
│   │   │   ├── documents.py
│   │   │   └── chat.py
│   │   ├── services/
│   │   │   ├── ingestion.py   # Extracción + chunking + embeddings
│   │   │   ├── retrieval.py   # Búsqueda vectorial en Supabase
│   │   │   └── llm.py         # Llamadas a OpenAI
│   │   ├── models/
│   │   │   └── schemas.py     # Pydantic models
│   │   └── db/
│   │       └── supabase.py    # Cliente Supabase Python
│   ├── .env
│   └── requirements.txt
│
├── supabase/
│   └── migrations/            # SQL de setup de tablas y pgvector
│
├── .gitignore
└── README.md
```

---

## 1. Configuración de Supabase

### 1.1 Activar extensión pgvector

En el SQL Editor de tu proyecto Supabase:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 1.2 Esquema de base de datos

Ejecuta este SQL completo en el SQL Editor:

```sql
-- Tabla de asistentes
CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de documentos
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,       -- ruta en Supabase Storage
  file_type TEXT NOT NULL,       -- pdf, docx, txt, etc.
  status TEXT DEFAULT 'pending', -- pending | processing | ready | error
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de chunks vectorizados
-- AISLAMIENTO POR ASISTENTE: assistant_id en cada chunk
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536),        -- dimensión de text-embedding-3-small
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice vectorial (HNSW es más rápido que IVFFlat para este caso)
CREATE INDEX ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Tabla de conversaciones
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Nueva conversación',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de mensajes
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,  -- fragmentos usados como contexto
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS) - cada usuario solo ve sus datos
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_assistants" ON assistants
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_documents" ON documents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_chunks" ON document_chunks
  FOR ALL USING (
    assistant_id IN (SELECT id FROM assistants WHERE user_id = auth.uid())
  );

CREATE POLICY "users_own_conversations" ON conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_messages" ON messages
  FOR ALL USING (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  );
```

### 1.3 Función de búsqueda vectorial con aislamiento

Esta función SQL garantiza que **cada asistente solo busca en sus propios chunks**:

```sql
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1536),
  match_assistant_id UUID,       -- filtra SIEMPRE por asistente
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE
    dc.assistant_id = match_assistant_id          -- AISLAMIENTO TOTAL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### 1.4 Storage bucket para documentos

En Supabase Dashboard → Storage → New bucket:
- Nombre: `documents`
- Public: **NO** (privado)

---

## 2. Backend (FastAPI)

### 2.1 Dependencias

`requirements.txt`:
```
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9
supabase==2.7.4
openai==1.45.0
pypdf==4.3.1
python-docx==1.1.2
python-pptx==1.0.2
langchain-text-splitters==0.3.0
python-jose==3.3.0
httpx==0.27.2
pydantic==2.8.2
pydantic-settings==2.4.0
python-dotenv==1.0.1
```

### 2.2 Variables de entorno

`.env`:
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...   # service_role key (NO la anon)
OPENAI_API_KEY=sk-...
FRONTEND_URL=http://localhost:3000
```

> ⚠️ Usa la `service_role` key en el backend para saltarte RLS cuando sea necesario (ingesta). Para las queries del usuario, pasa el JWT del usuario.

### 2.3 `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import assistants, documents, chat
from app.config import settings

app = FastAPI(title="RAG Assistants API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assistants.router, prefix="/api/assistants", tags=["assistants"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
```

### 2.4 Autenticación: verificar JWT de Supabase

`app/auth.py`:
```python
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from app.config import settings

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verifica el JWT de Supabase y devuelve el user_id."""
    token = credentials.credentials
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    try:
        user = supabase.auth.get_user(token)
        return user.user
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
```

### 2.5 Router de asistentes

`app/routers/assistants.py`:
```python
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
```

### 2.6 Servicio de ingesta (chunking + embeddings)

`app/services/ingestion.py`:
```python
import io
from pypdf import PdfReader
from docx import Document as DocxDocument
from pptx import Presentation
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

# --- Extracción de texto ---

def extract_text(file_bytes: bytes, file_type: str) -> str:
    if file_type == "pdf":
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    elif file_type in ("docx",):
        doc = DocxDocument(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs)
    elif file_type == "pptx":
        prs = Presentation(io.BytesIO(file_bytes))
        texts = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    texts.append(shape.text)
        return "\n".join(texts)
    elif file_type in ("txt", "md"):
        return file_bytes.decode("utf-8", errors="ignore")
    else:
        raise ValueError(f"Tipo de archivo no soportado: {file_type}")

# --- Chunking ---

def chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""],
    )
    return splitter.split_text(text)

# --- Embeddings ---

def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Genera embeddings en batch (máximo 2048 textos por llamada)."""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    return [item.embedding for item in response.data]
```

### 2.7 Router de documentos (subida + ingesta)

`app/routers/documents.py`:
```python
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from app.auth import get_current_user
from app.db.supabase import get_service_client
from app.services.ingestion import extract_text, chunk_text, get_embeddings

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/markdown": "md",
}

@router.get("/{assistant_id}")
async def list_documents(assistant_id: str, user=Depends(get_current_user)):
    sb = get_service_client()
    result = sb.table("documents")\
        .select("*")\
        .eq("assistant_id", assistant_id)\
        .eq("user_id", user.id)\
        .order("created_at", desc=True)\
        .execute()
    return result.data

@router.post("/{assistant_id}")
async def upload_document(
    assistant_id: str,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user=Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Tipo no soportado: {file.content_type}")

    file_type = ALLOWED_TYPES[file.content_type]
    file_bytes = await file.read()
    sb = get_service_client()

    # Subir a Storage
    storage_path = f"{user.id}/{assistant_id}/{file.filename}"
    sb.storage.from_("documents").upload(storage_path, file_bytes)

    # Crear registro en BD con status pending
    doc_result = sb.table("documents").insert({
        "assistant_id": assistant_id,
        "user_id": user.id,
        "filename": file.filename,
        "file_path": storage_path,
        "file_type": file_type,
        "status": "processing",
    }).execute()
    document = doc_result.data[0]

    # Procesar en background
    background_tasks.add_task(
        process_document, document["id"], assistant_id, file_bytes, file_type, sb
    )
    return document

async def process_document(doc_id, assistant_id, file_bytes, file_type, sb):
    try:
        text = extract_text(file_bytes, file_type)
        chunks = chunk_text(text)
        embeddings = get_embeddings(chunks)

        rows = [
            {
                "document_id": doc_id,
                "assistant_id": assistant_id,
                "content": chunk,
                "chunk_index": i,
                "embedding": emb,
                "metadata": {"chunk_index": i, "total_chunks": len(chunks)},
            }
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
        ]

        # Insertar en lotes de 100
        for i in range(0, len(rows), 100):
            sb.table("document_chunks").insert(rows[i:i+100]).execute()

        sb.table("documents").update({"status": "ready"}).eq("id", doc_id).execute()
    except Exception as e:
        sb.table("documents").update({"status": "error"}).eq("id", doc_id).execute()
        raise e

@router.delete("/{assistant_id}/{document_id}")
async def delete_document(assistant_id: str, document_id: str, user=Depends(get_current_user)):
    sb = get_service_client()
    # Borrar chunks (CASCADE lo hace automáticamente, pero por si acaso)
    sb.table("document_chunks").delete().eq("document_id", document_id).execute()
    # Borrar documento
    sb.table("documents").delete()\
        .eq("id", document_id)\
        .eq("assistant_id", assistant_id)\
        .eq("user_id", user.id)\
        .execute()
    return {"ok": True}
```

### 2.8 Servicio de retrieval (búsqueda vectorial aislada)

`app/services/retrieval.py`:
```python
from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def retrieve_context(query: str, assistant_id: str, supabase_client, k: int = 5):
    """
    Recupera los k chunks más relevantes SOLO del asistente indicado.
    Usa la función SQL match_chunks que filtra por assistant_id.
    """
    # 1. Embedding de la query
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=query,
    )
    query_embedding = response.data[0].embedding

    # 2. Búsqueda vectorial filtrada por assistant_id
    result = supabase_client.rpc("match_chunks", {
        "query_embedding": query_embedding,
        "match_assistant_id": assistant_id,
        "match_count": k,
        "match_threshold": 0.45,
    }).execute()

    return result.data  # lista de {id, document_id, content, metadata, similarity}
```

### 2.9 Router de chat con RAG

`app/routers/chat.py`:
```python
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
        .eq("user_id", user.id)\
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
```

### 2.10 Servicio LLM (generación de respuesta con citas)

`app/services/llm.py`:
```python
from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

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
        model="gpt-4o-mini",
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
```

---

## 3. Frontend (Next.js 14)

### 3.1 Dependencias

`package.json` (dependencias clave):
```json
{
  "dependencies": {
    "next": "14.2.5",
    "react": "^18",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.1",
    "axios": "^1.7.7",
    "tailwindcss": "^3.4.1",
    "lucide-react": "^0.446.0",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.1"
  }
}
```

### 3.2 Variables de entorno

`.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # anon key (pública, es segura)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3.3 Cliente Supabase

`lib/supabase.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 3.4 Helper para llamadas al backend con JWT

`lib/api.ts`:
```typescript
import axios from "axios";
import { supabase } from "./supabase";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

// Interceptor: añade el JWT de Supabase en cada request
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

export default api;
```

### 3.5 Páginas principales a implementar

#### `/dashboard/assistants` — Listado
- Fetch a `GET /api/assistants/`
- Tarjetas con nombre, descripción, botones de editar/eliminar/abrir chat
- Botón "Crear nuevo asistente"

#### `/dashboard/assistants/new` — Crear
- Formulario: nombre, descripción, instrucciones (textarea grande)
- POST a `/api/assistants/`

#### `/dashboard/assistants/[id]` — Editar + documentos
- Formulario de edición del asistente (PUT)
- Sección de documentos:
  - Lista de documentos con estado (pending/processing/ready/error)
  - Upload con drag & drop
  - Botón eliminar por documento

#### `/dashboard/assistants/[id]/chat` — Chat
- Selector de conversaciones (sidebar izquierdo)
- Botón "Nueva conversación"
- Área de chat con historial de mensajes
- Input de mensaje
- Al recibir respuesta: mostrar sección de fuentes/citas colapsable

### 3.6 Componente de Chat (lógica clave)

```typescript
// app/dashboard/assistants/[id]/chat/page.tsx (simplificado)

const [conversations, setConversations] = useState([]);
const [activeConversation, setActiveConversation] = useState(null);
const [messages, setMessages] = useState([]);
const [input, setInput] = useState("");
const [loading, setLoading] = useState(false);

const sendMessage = async () => {
  if (!input.trim() || !activeConversation) return;
  setLoading(true);

  // Optimistic update
  setMessages(prev => [...prev, { role: "user", content: input }]);
  const userMessage = input;
  setInput("");

  try {
    const res = await api.post(
      `/api/chat/conversations/${assistantId}/${activeConversation.id}/messages`,
      { content: userMessage }
    );
    setMessages(prev => [...prev, res.data]);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

// Componente de mensaje con fuentes
const MessageBubble = ({ message }) => (
  <div className={`message ${message.role}`}>
    <p>{message.content}</p>
    {message.sources?.length > 0 && (
      <details className="sources">
        <summary>📄 {message.sources.length} fuente(s)</summary>
        {message.sources.map((s, i) => (
          <div key={i} className="source-item">
            <span>Similitud: {(s.similarity * 100).toFixed(0)}%</span>
            <p>{s.content_preview}...</p>
          </div>
        ))}
      </details>
    )}
  </div>
);
```

---

## 4. Autenticación con Supabase Auth

### Flujo completo

1. El usuario se registra/loguea en el frontend via Supabase Auth
2. Supabase devuelve un `access_token` (JWT)
3. El frontend incluye ese JWT en cada request al backend FastAPI (`Authorization: Bearer <token>`)
4. El backend verifica el JWT con Supabase y extrae el `user_id`
5. Todas las queries a Supabase desde el backend usan ese `user_id` para respetar RLS

### Middleware de sesión en Next.js

`middleware.ts` (en la raíz del frontend):
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* handlers */ } }
  );
  const { data: { session } } = await supabase.auth.getSession();

  // Redirigir a login si no hay sesión en rutas protegidas
  if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = { matcher: ["/dashboard/:path*"] };
```

---

## 5. Cómo se cumplen los requisitos core

### Aislamiento por asistente
- Cada chunk tiene `assistant_id` en BD
- La función SQL `match_chunks` filtra **siempre** por `assistant_id`
- Es imposible que un asistente recupere chunks de otro: el filtro está a nivel de BD, no de aplicación

### Persistencia del chat
- Cada conversación es una fila en `conversations` ligada a `assistant_id` + `user_id`
- Los mensajes se guardan en `messages` con su `conversation_id`
- Al recargar, se cargan las conversaciones del asistente y sus mensajes
- Limpiar = crear nueva conversación (la anterior queda en BD)

### Citas y no inventar
- El system prompt instruye explícitamente al LLM a usar solo el contexto proporcionado
- Si no hay chunks relevantes (o similarity < 0.45), el contexto dirá que no hay info suficiente
- Las fuentes se guardan en `messages.sources` (JSON) y se muestran en el frontend
- `temperature: 0.2` reduce las alucinaciones

---

## 6. Ejecución local

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

---

## 7. `.env.example`

### Backend
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
OPENAI_API_KEY=sk-your-openai-key-here
FRONTEND_URL=http://localhost:3000
```

### Frontend
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 8. Orden de implementación recomendado

1. **Setup Supabase**: crear proyecto, ejecutar SQL de migraciones, crear bucket
2. **Backend básico**: FastAPI + auth + CRUD de asistentes → probar con Postman/Swagger
3. **Ingesta**: subida de documentos + chunking + embeddings → verificar en Supabase que aparecen chunks
4. **Retrieval**: función `match_chunks` + endpoint de test → verificar aislamiento entre asistentes
5. **Chat**: endpoint completo con RAG → probar que cita fuentes y rechaza preguntas sin contexto
6. **Frontend auth**: login/register con Supabase
7. **Frontend CRUD asistentes**: listado, crear, editar, eliminar
8. **Frontend documentos**: subida, listado, estado, eliminar
9. **Frontend chat**: interfaz completa con historial y fuentes
10. **Polish**: manejo de errores, loading states, UX

---

## 9. Tips y trampas comunes

- **`service_role` vs `anon` key**: usa `service_role` en el backend para operaciones de ingesta (insertar chunks), pero verifica siempre que el `user_id` pertenece al asistente para no romper el aislamiento multi-usuario
- **Embeddings en batch**: si el documento es largo y tiene muchos chunks, envíalos todos en una sola llamada a `embeddings.create()` — es mucho más rápido que llamar uno a uno
- **pgvector y arrays**: Supabase devuelve los vectores como strings. Al insertar desde Python, pasa directamente la lista `[0.1, 0.2, ...]`, el cliente lo serializa bien
- **CORS**: asegúrate de que `FRONTEND_URL` en el backend coincide exactamente con la URL del frontend (con o sin trailing slash puede romper)
- **Supabase Storage paths**: usa rutas tipo `userId/assistantId/filename` para organizar y facilitar borrado por asistente
- **RLS en mensajes**: los mensajes se consultan por `conversation_id`, así que la política RLS de messages debe hacer join con conversations para verificar el `user_id`
