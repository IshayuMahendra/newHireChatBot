from __future__ import annotations

import httpx
from fastapi import HTTPException

from app.schemas.onboarding import PlanStructuredOutput


def extract_upstream_error_detail(response: httpx.Response, fallback: str) -> str:
    try:
        payload = response.json()
        if isinstance(payload, dict):
            detail = payload.get("error") or payload.get("detail")
            if isinstance(detail, str) and detail.strip():
                return detail
    except ValueError:
        pass
    return fallback


def parse_task_phase_and_text(task_text: str) -> tuple[str, str]:
    cleaned = task_text.strip()
    if cleaned.startswith("[") and "]" in cleaned:
        phase, text = cleaned[1:].split("]", 1)
        return phase.strip() or "Task", text.strip() or cleaned
    return "Task", cleaned


def format_task_context_line(task: dict) -> str:
    task_id = task.get("id", "?")
    raw_text = str(task.get("text", "")).strip()
    phase, text = parse_task_phase_and_text(raw_text)
    status = "completed" if bool(task.get("completed", False)) else "pending"
    created_at = str(task.get("createdAt", "")).strip() or "unknown"
    return f"id={task_id}; status={status}; phase={phase}; text={text}; createdAt={created_at}"


async def fetch_tasks_for_user(user_id: int, authorization: str, tasks_api_base_url: str) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{tasks_api_base_url}/users/{user_id}/tasks",
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


async def fetch_current_tasks_for_user(user_id: int, authorization: str, tasks_api_base_url: str) -> list[str]:
    tasks = await fetch_tasks_for_user(user_id, authorization, tasks_api_base_url)
    return [format_task_context_line(task) for task in tasks if str(task.get("text", "")).strip()]


async def save_narrative_plan(user_id: int, narrative_plan, authorization: str, tasks_api_base_url: str) -> None:
    plan_windows = {
        "plan30Day": narrative_plan.day_30,
        "plan60Day": narrative_plan.day_60,
        "plan90Day": narrative_plan.day_90,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            for field_name, text in plan_windows.items():
                response = await client.patch(
                    f"{tasks_api_base_url}/users/{user_id}/{field_name}",
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
                        detail=extract_upstream_error_detail(response, "Could not save generated plan"),
                    )

                raise HTTPException(
                    status_code=502,
                    detail=f"Plan sync failed with status {response.status_code}",
                )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach onboarding API: {exc}")


def build_task_payloads(plan_output: PlanStructuredOutput) -> list[str]:
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
