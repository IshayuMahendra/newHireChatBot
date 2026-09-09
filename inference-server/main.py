from typing import Annotated
import base64
import json

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os

from agent_service import invoke_AskWorkflow, invoke_PlanWorkflow
from models import AskModel, PlanForUserModel
from task_payloads import build_task_payloads

app = FastAPI()
TASKS_API_BASE_URL = os.getenv("TASKS_API_BASE_URL", "http://localhost:3001")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def read_root():
    return {"message": "FastAPI inference server is running."}


@app.post("/ask")
async def ask(
    request: AskModel,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
):
    normalized_auth = _normalize_bearer_header(authorization)

    try:
        ask_request = request

        if normalized_auth:
            token_payload = _decode_token_payload_without_verification(normalized_auth)
            user_id = token_payload.get("id")
            if isinstance(user_id, int) and user_id > 0:
                current_tasks = await _fetch_current_tasks_for_user(user_id, normalized_auth)
                ask_request = request.model_copy(update={"current_tasks": current_tasks})

        ask_result = invoke_AskWorkflow(ask_request)
        return {
            "response": str(ask_result.get("response", "")),
            "rag": {
                "status": str(ask_result.get("rag_status", "skeleton")),
                "confidence": float(ask_result.get("rag_confidence", 0.0)),
                "sources": list(ask_result.get("rag_sources", [])),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model invocation failed: {exc}")

def _normalize_bearer_header(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned.lower().startswith("bearer "):
        return cleaned
    return f"Bearer {cleaned}"


def _decode_token_payload_without_verification(authorization: str) -> dict:
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


def _parse_task_phase_and_text(task_text: str) -> tuple[str, str]:
    cleaned = task_text.strip()
    if cleaned.startswith("[") and "]" in cleaned:
        phase, text = cleaned[1:].split("]", 1)
        return phase.strip() or "Task", text.strip() or cleaned
    return "Task", cleaned


def _format_task_context_line(task: dict) -> str:
    task_id = task.get("id", "?")
    raw_text = str(task.get("text", "")).strip()
    phase, text = _parse_task_phase_and_text(raw_text)
    status = "completed" if bool(task.get("completed", False)) else "pending"
    created_at = str(task.get("createdAt", "")).strip() or "unknown"
    return f"id={task_id}; status={status}; phase={phase}; text={text}; createdAt={created_at}"


async def _fetch_current_tasks_for_user(user_id: int, authorization: str) -> list[str]:
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{TASKS_API_BASE_URL}/users/{user_id}/tasks",
                headers={"Authorization": authorization},
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach onboarding API: {exc}")

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="User not found in onboarding API")

    if response.status_code in {401, 403}:
        raise HTTPException(status_code=response.status_code, detail="Could not load task context for this user")

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Task context fetch failed with status {response.status_code}",
        )

    tasks = response.json()
    return [_format_task_context_line(task) for task in tasks if str(task.get("text", "")).strip()]


@app.post("/plan")
async def plan(
    request: PlanForUserModel,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
):
    normalized_auth = _normalize_bearer_header(authorization)
    if not normalized_auth:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    try:
        plan_result = invoke_PlanWorkflow(request)
        narrative = str(plan_result.get("response", ""))
        narrative_plan = plan_result["narrative_plan"]
        structured = plan_result["structured_plan"]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model invocation failed: {exc}")

    parsed_tasks = build_task_payloads(structured)
    created_tasks = []

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            for task_text in parsed_tasks:
                response = await client.post(
                    f"{TASKS_API_BASE_URL}/users/{request.user_id}/tasks",
                    json={"text": task_text},
                    headers={"Authorization": normalized_auth},
                )

                if response.status_code == 201:
                    created_tasks.append(response.json())
                    continue

                if response.status_code == 404:
                    raise HTTPException(status_code=404, detail="User not found in onboarding API")

                if response.status_code == 400:
                    response_detail = response.json().get("error", "Invalid user ID or task data")
                    raise HTTPException(status_code=400, detail=response_detail)

                raise HTTPException(
                    status_code=502,
                    detail=f"Task sync failed with status {response.status_code}",
                )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach onboarding API: {exc}")
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(status_code=500, detail=f"Task sync failed: {exc}")

    return {
        "response": narrative,
        "narrative_plan": narrative_plan.model_dump(),
        "task_list": structured.model_dump(),
        "parsed_tasks": parsed_tasks,
        "tasks_created": created_tasks,
        "task_count": len(created_tasks),
    }


@app.post("/plan/update")
async def update_plan(
    request: PlanForUserModel,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
):
    normalized_auth = _normalize_bearer_header(authorization)
    if not normalized_auth:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    try:
        plan_result = invoke_PlanWorkflow(request)
        narrative = str(plan_result.get("response", ""))
        narrative_plan = plan_result["narrative_plan"]
        structured = plan_result["structured_plan"]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model invocation failed: {exc}")

    return {
        "response": narrative,
        "narrative_plan": narrative_plan.model_dump(),
        "task_list": structured.model_dump(),
    }
