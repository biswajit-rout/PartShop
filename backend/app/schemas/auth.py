from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Payload sent by the cashier when logging in."""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Payload returned upon successful authentication."""
    access_token: str
    token_type: str = "bearer"
