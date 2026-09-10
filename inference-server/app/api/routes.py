import os
from typing import Annotated

import httpx
from fastapi import Header, HTTPException
from fastapi.routing import APIRouter

from app.schemas.onboarding import AskModel, PlanForUserModel
from app.services.workflows import invoke_AskWorkflow, invoke_PlanWorkflow
from app.utils.auth import decode_token_payload_without_verification, normalize_bearer_header
from app.utils.task_sync import extract_upstream_error_detail, fetch_current_tasks_for_user, fetch_tasks_for_user, save_narrative_plan

router = APIRouter()
TASKS_API_BASE_URL = os.getenv("TASKS_API_BASE_URL", "http://localhost:3001")


@router.get("/")
async def read_root():
    return {"message": "FastAPI inference server is running."}


@router.post("/ask")
async def ask(
    request: AskModel,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
):
    normalized_auth = normalize_bearer_header(authorization)

    try:
        ask_request = request

        user_id: int | None = None
        if normalized_auth:
            token_payload = decode_token_payload_without_verification(normalized_auth)
            user_id = token_payload.get("id")
            if isinstance(user_id, int) and user_id > 0:
                current_tasks = await fetch_current_tasks_for_user(user_id, normalized_auth, TASKS_API_BASE_URL)
                ask_request = request.model_copy(update={"current_tasks": current_tasks})

        ask_result = invoke_AskWorkflow(ask_request, user_id=user_id, token=normalized_auth)
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


@router.post("/plan")
async def plan(
    request: PlanForUserModel,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
):
    normalized_auth = normalize_bearer_header(authorization)
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

    await save_narrative_plan(request.user_id, narrative_plan, normalized_auth, TASKS_API_BASE_URL)

    return {
        "response": narrative,
        "narrative_plan": narrative_plan.model_dump(),
        "task_list": structured.model_dump(),
        "parsed_tasks": parsed_tasks,
        "tasks_created": created_tasks,
        "task_count": len(created_tasks),
    }


@router.post("/plan/update")
async def update_plan(
    request: PlanForUserModel,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
):
    normalized_auth = normalize_bearer_header(authorization)
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
        existing_tasks = await fetch_tasks_for_user(request.user_id, normalized_auth, TASKS_API_BASE_URL)
        pending_tasks = [task for task in existing_tasks if not bool(task.get("completed", False))]

        async with httpx.AsyncClient(timeout=20.0) as client:
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
                            detail=extract_upstream_error_detail(response, "Invalid task update payload"),
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
                        detail=extract_upstream_error_detail(response, "Invalid user ID or task data"),
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

    await save_narrative_plan(request.user_id, narrative_plan, normalized_auth, TASKS_API_BASE_URL)

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


def build_task_payloads(plan_output) -> list[str]:
    phase_buckets = [
        ("Week 1", plan_output.week_1_tasks),
        ("Week 2-4", plan_output.week_2_4_tasks),
        ("30 Days", plan_output.day_30_tasks),
        ("60 Days", plan_output.day_60_tasks),
        ("90 Days", plan_output.day_90_tasks),
    ]
    parsed_tasks: list[str] = []
    for phase_label, items in phase_buckets:
        for item in items:
            cleaned_item = item.strip()
            if cleaned_item:
                parsed_tasks.append(f"[{phase_label}] {cleaned_item}")
    return parsed_tasks
