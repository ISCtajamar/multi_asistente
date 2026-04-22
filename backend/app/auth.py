from pydantic import BaseModel

class DummyUser(BaseModel):
    id: str = "9fdffe4a-ce00-4dc9-ae15-2de7571660f2"
    email: str = "default@app.local"

def get_current_user():
    """Devuelve un usuario dummy para saltar la autenticación."""
    return DummyUser()
