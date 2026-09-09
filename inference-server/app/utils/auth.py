import base64
import json

from fastapi import HTTPException


def normalize_bearer_header(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned.lower().startswith("bearer "):
        return cleaned
    return f"Bearer {cleaned}"


def decode_token_payload_without_verification(authorization: str) -> dict:
    token = authorization.split(" ", 1)[1]
    token_parts = token.split(".")
    if len(token_parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid authentication token format")

    payload_segment = token_parts[1]
    padded_payload = payload_segment + "=" * (-len(payload_segment) % 4)

    try:
        decoded_payload = base64.urlsafe_b64decode(padded_payload.encode("utf-8"))
        return json.loads(decoded_payload.decode("utf-8"))
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid authentication token payload")
