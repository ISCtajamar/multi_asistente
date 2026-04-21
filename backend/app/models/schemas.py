from pydantic import BaseModel
from typing import Optional, List

class AssistantCreate(BaseModel):
    name: str
    description: Optional[str] = None
    instructions: str

class AssistantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None

class ChatMessage(BaseModel):
    content: str
