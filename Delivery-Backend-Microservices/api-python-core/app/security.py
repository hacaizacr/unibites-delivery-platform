from passlib.context import CryptContext
import base64
import hmac
import hashlib
import json
import time
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Use a default fallback secret; in production this must be overridden via environment variables.
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-unibites-key-change-in-production-123456")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 86400  # 24 hours

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_jwt_token(data: dict) -> str:
    """Generates an HS256 JWT token using standard libraries."""
    payload = data.copy()
    payload["exp"] = int(time.time()) + ACCESS_TOKEN_EXPIRE_SECONDS
    
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    
    header_encoded = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_encoded = base64url_encode(json.dumps(payload).encode('utf-8'))
    
    signing_input = f"{header_encoded}.{payload_encoded}".encode('utf-8')
    signature = hmac.new(JWT_SECRET.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_encoded = base64url_encode(signature)
    
    return f"{header_encoded}.{payload_encoded}.{signature_encoded}"

def verify_jwt_token(token: str) -> dict:
    """Decodes and validates an HS256 JWT token. Returns payload or None if invalid."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        
        header_encoded, payload_encoded, signature_encoded = parts
        
        signing_input = f"{header_encoded}.{payload_encoded}".encode('utf-8')
        expected_signature = hmac.new(JWT_SECRET.encode('utf-8'), signing_input, hashlib.sha256).digest()
        expected_signature_encoded = base64url_encode(expected_signature)
        
        # Prevent timing attacks on signature comparison
        if not hmac.compare_digest(signature_encoded, expected_signature_encoded):
            return None
            
        payload = json.loads(base64url_decode(payload_encoded).decode('utf-8'))
        
        if payload.get("exp", 0) < time.time():
            return None  # Token expired
            
        return payload
    except Exception:
        return None

