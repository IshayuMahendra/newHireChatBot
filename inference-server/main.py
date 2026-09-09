from typing import Annotated

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
async def ask(request: AskModel):
    try:
        ask_result = invoke_AskWorkflow(request)
        return {
            "response": str(ask_result.get("response", "")),
            "rag": {
                "status": str(ask_result.get("rag_status", "skeleton")),
                "confidence": float(ask_result.get("rag_confidence", 0.0)),
                "sources": list(ask_result.get("rag_sources", [])),
            },
        }
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
