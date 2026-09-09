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


def _extract_upstream_error_detail(response: httpx.Response, fallback: str) -> str:
    try:
        payload = response.json()
        if isinstance(payload, dict):
            detail = payload.get("error") or payload.get("detail")
            if isinstance(detail, str) and detail.strip():
                return detail
    except ValueError:
        pass
    return fallback


async def _fetch_tasks_for_user(user_id: int, authorization: str) -> list[dict]:
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
        raise HTTPException(status_code=response.status_code, detail="Could not load tasks for this user")

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Task fetch failed with status {response.status_code}",
        )

    tasks = response.json()
    if not isinstance(tasks, list):
        raise HTTPException(status_code=502, detail="Task fetch returned an invalid payload")
    return tasks


async def _fetch_current_tasks_for_user(user_id: int, authorization: str) -> list[str]:
    tasks = await _fetch_tasks_for_user(user_id, authorization)
    return [_format_task_context_line(task) for task in tasks if str(task.get("text", "")).strip()]


async def _save_narrative_plan(user_id: int, narrative_plan, authorization: str) -> None:
    plan_windows = {
        "plan30Day": narrative_plan.day_30,
        "plan60Day": narrative_plan.day_60,
        "plan90Day": narrative_plan.day_90,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            for field_name, text in plan_windows.items():
                response = await client.patch(
                    f"{TASKS_API_BASE_URL}/users/{user_id}/{field_name}",
                    json={field_name: text},
                    headers={"Authorization": authorization},
                )

                if response.status_code == 200:
                    continue

                if response.status_code == 404:
                    raise HTTPException(status_code=404, detail="User not found in onboarding API")

                if response.status_code in {400, 401, 403}:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=_extract_upstream_error_detail(response, "Could not save generated plan"),
                    )

                raise HTTPException(
                    status_code=502,
                    detail=f"Plan sync failed with status {response.status_code}",
                )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach onboarding API: {exc}")


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

    await _save_narrative_plan(request.user_id, narrative_plan, normalized_auth)

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

    parsed_tasks = build_task_payloads(structured)
    updated_tasks = []
    created_tasks = []
    unchanged_task_ids: list[int] = []

    try:
        existing_tasks = await _fetch_tasks_for_user(request.user_id, normalized_auth)
        pending_tasks = [
            task for task in existing_tasks if not bool(task.get("completed", False))
        ]

        async with httpx.AsyncClient(timeout=20.0) as client:
            # Update existing pending tasks by stable order, then append any overflow as new tasks.
            for index, new_text in enumerate(parsed_tasks):
                if index < len(pending_tasks):
                    current_task = pending_tasks[index]
                    task_id = current_task.get("id")
                    if not isinstance(task_id, int) or task_id < 1:
                        raise HTTPException(status_code=502, detail="Task update failed due to invalid task ID")

                    old_text = str(current_task.get("text", "")).strip()
                    if old_text == new_text:
                        unchanged_task_ids.append(task_id)
                        continue

                    response = await client.patch(
                        f"{TASKS_API_BASE_URL}/tasks/{task_id}",
                        json={"text": new_text},
                        headers={"Authorization": normalized_auth},
                    )

                    if response.status_code == 200:
                        updated_tasks.append(response.json())
                        continue

                    if response.status_code == 404:
                        raise HTTPException(status_code=404, detail="Task not found in onboarding API")

                    if response.status_code == 400:
                        raise HTTPException(
                            status_code=400,
                            detail=_extract_upstream_error_detail(response, "Invalid task update payload"),
                        )

                    if response.status_code in {401, 403}:
                        raise HTTPException(status_code=response.status_code, detail="Not allowed to update this task")

                    raise HTTPException(
                        status_code=502,
                        detail=f"Task update failed with status {response.status_code}",
                    )

                response = await client.post(
                    f"{TASKS_API_BASE_URL}/users/{request.user_id}/tasks",
                    json={"text": new_text},
                    headers={"Authorization": normalized_auth},
                )

                if response.status_code == 201:
                    created_tasks.append(response.json())
                    continue

                if response.status_code == 404:
                    raise HTTPException(status_code=404, detail="User not found in onboarding API")

                if response.status_code == 400:
                    raise HTTPException(
                        status_code=400,
                        detail=_extract_upstream_error_detail(response, "Invalid user ID or task data"),
                    )

                if response.status_code in {401, 403}:
                    raise HTTPException(status_code=response.status_code, detail="Not allowed to create tasks for this user")

                raise HTTPException(
                    status_code=502,
                    detail=f"Task sync failed with status {response.status_code}",
                )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach onboarding API: {exc}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Task sync failed: {exc}")

    await _save_narrative_plan(request.user_id, narrative_plan, normalized_auth)

    return {
        "response": narrative,
        "narrative_plan": narrative_plan.model_dump(),
        "task_list": structured.model_dump(),
        "parsed_tasks": parsed_tasks,
        "tasks_updated": updated_tasks,
        "tasks_created": created_tasks,
        "unchanged_task_ids": unchanged_task_ids,
        "task_update_count": len(updated_tasks),
        "task_create_count": len(created_tasks),
        "task_count": len(parsed_tasks),
    }
