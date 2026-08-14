from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from agent_service import invoke_AskModel, invoke_PlanModel, invoke_PlanModel_structured
from models import AskModel, PlanModel

# 1. Initialize the application
app = FastAPI()


class ChatRequest(BaseModel):
    prompt: str

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
async def plan(request: PlanModel):
    try:
        result = invoke_PlanModel(request)
        return {"response" : result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model invocation failed: {exc}")


@app.post("/plan-structured")
async def plan_structured(request: PlanModel):
    try:
        result = invoke_PlanModel_structured(request)
        return {"response": result.model_dump()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model invocation failed: {exc}")