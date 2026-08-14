from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import os

from agent_service import invoke_AskModel, invoke_PlanModel, invoke_PlanModel_structured
from models import AskModel, PlanForUserModel, PlanModel, PlanStructuredOutput

# 1. Initialize the application
app = FastAPI()
TASKS_API_BASE_URL = os.getenv("TASKS_API_BASE_URL", "http://localhost:3001")


class ChatRequest(BaseModel):
    prompt: str


def build_task_payloads(plan_output: PlanStructuredOutput) -> list[str]:
    phase_buckets = [
        ("Week 1", plan_output.first_week_tasks),
        ("Weeks 2-4", plan_output.weeks_2_4_tasks),
        ("Day 30", plan_output.day_30_outcomes),
        ("Day 60", plan_output.day_60_outcomes),
        ("Day 90", plan_output.day_90_outcomes),
    ]
    parsed_tasks: list[str] = []
    for phase_label, items in phase_buckets:
        for item in items:
            cleaned_item = item.strip()
            if cleaned_item:
                parsed_tasks.append(f"[{phase_label}] {cleaned_item}")
    return parsed_tasks

# 2. Define a GET endpoint
@app.get("/")
async def read_root():
    return {"message": "Hello, your FastAPI is successfully connected!"}


@app.post("/ask")
async def ask(request: AskModel):
    try:
        result = invoke_AskModel(request)
        return {"response": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model invocation failed: {exc}")

@app.post("/plan")
async def plan(request: PlanForUserModel):
    try:
        narrative = invoke_PlanModel(request)
        structured = invoke_PlanModel_structured(request)
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
        "task_list": structured.model_dump(),
        "parsed_tasks": parsed_tasks,
        "tasks_created": created_tasks,
        "task_count": len(created_tasks),
    }


@app.post("/plan-structured")
async def plan_structured(request: PlanModel):
    try:
        result = invoke_PlanModel_structured(request)
        return {"task_list": result.model_dump()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model invocation failed: {exc}")