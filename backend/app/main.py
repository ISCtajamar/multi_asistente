from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import assistants, documents, chat
from app.config import settings

app = FastAPI(title="RAG Assistants API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assistants.router, prefix="/api/assistants", tags=["assistants"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

@app.get("/")
async def root():
    return {"message": "RAG Assistants API is running"}
