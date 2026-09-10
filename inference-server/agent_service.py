from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph

from models import AskModel, GraphState, PlanModel, PlanNarrativeOutput, PlanStructuredOutput
from rag import retrieve_policy_context_skeleton

MODEL_NAME = "gpt-5.6-luna"

load_dotenv()

ASK_PROMPT_TEMPLATE = PromptTemplate.from_template(
    """# New Hire Assistant

You are a welcoming onboarding assistant helping a new hire feel supported and confident.

## Context
- Role: {role}
- Department: {department}
- Onboarding day: {onboarding_day}
- Current tasks: {current_tasks}
- Current plan: {current_plan}
- Retrieval status: {rag_status}
- Retrieved sources: {rag_sources}
- User question: {user_prompt}

## Response guidelines
- Use a warm, encouraging, human tone.
- Provide practical, concise guidance.
- Tailor advice to the role and department.
- For any question about tasks, answer from Current tasks first.
- Current tasks lines may include metadata in this format: id=<id>; status=<status>; phase=<phase>; text=<task>; createdAt=<timestamp>.
- If asked about a window like Week 1, filter tasks by matching phase before giving general advice.
- If task context is empty, say that clearly before giving a fallback suggestion.
- If details are missing, state assumptions clearly.
- Avoid robotic or overly formal phrasing.
- Don't implement markdown into the response.
"""
)

PLAN_NARRATIVE_PROMPT_TEMPLATE = PromptTemplate.from_template(
        """# Narrative New Hire Onboarding Planner

You are a welcoming onboarding assistant creating a personalized onboarding story.

## Context
- Role: {role}
- Department: {department}
- Onboarding day: {onboarding_day}
- Current tasks: {current_tasks}
- Current plan: {current_plan}
- Retrieval status: {rag_status}

## Task
Return five concise narrative paragraphs for the onboarding plan.

## Requirements
- Match the provided structured schema exactly.
- Write one paragraph for each section:
    - week_1
    - week_2_4
    - day_30
    - day_60
    - day_90
- Make each section feel like the next step in the same onboarding journey.
- Make the guidance meaningfully different based on role and department.
- Use the current tasks and current plan to adapt the next version of the onboarding plan instead of restarting from scratch.
- If the user already has progress reflected in their tasks or plan, build forward from that progress.
- Use a supportive, practical, human tone.
"""
)

PLAN_STRUCTURED_PROMPT_TEMPLATE = PromptTemplate.from_template(
    """# Structured New Hire Onboarding Planner

You are an assistant providing onboarding tasks for new hires.

## Context
- Role: {role}
- Department: {department}
- Onboarding day: {onboarding_day}
- Current tasks: {current_tasks}
- Current plan: {current_plan}
- Retrieval status: {rag_status}

## Task
Return a simplified and continuous onboarding plan with short, actionable items.

## Requirement
Return output that matches the provided structured schema.

## Quality requirements
- Make the flow progressive from Week 1 -> Week 2-4 -> Day 30 -> Day 60 -> Day 90.
- Do not repeat the same task in different phases.
- Use the current tasks and current plan to adjust the task recommendations based on progress already made.
- Keep each item concise and practical.
- Keep language clear, supportive, and human while staying short.
"""
)

def _format_current_tasks(tasks: list[str]) -> str:
    if not tasks:
        return "None"
    return "; ".join(tasks)


PLAN_KEY_ALIASES = {
    "week_1": "planWeek1",
    "week_2_4": "planWeek2_4",
    "day_30": "plan30Day",
    "day_60": "plan60Day",
    "day_90": "plan90Day",
    "planWeek1": "planWeek1",
    "planWeek2_4": "planWeek2_4",
    "plan30Day": "plan30Day",
    "plan60Day": "plan60Day",
    "plan90Day": "plan90Day",
}


def _normalize_plan_dict(plan: dict[str, str]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for key, value in plan.items():
        cleaned_key = PLAN_KEY_ALIASES.get(str(key).strip(), str(key).strip())
        cleaned_value = str(value).strip()
        if cleaned_key and cleaned_value:
            normalized[cleaned_key] = cleaned_value
    return normalized


def _format_current_plan(plan: dict[str, str]) -> str:
    if not plan:
        return "None"
    normalized_plan = _normalize_plan_dict(plan)
    ordered_keys = ["planWeek1", "planWeek2_4", "plan30Day", "plan60Day", "plan90Day"]
    display_labels = {
        "planWeek1": "Week 1",
        "planWeek2_4": "Week 2-4",
        "plan30Day": "Day 30",
        "plan60Day": "Day 60",
        "plan90Day": "Day 90",
    }
    sections: list[str] = []
    for key in ordered_keys:
        value = normalized_plan.get(key)
        if value:
            sections.append(f"{display_labels[key]}: {value}")
    if not sections:
        for key, value in normalized_plan.items():
            if value:
                sections.append(f"{display_labels.get(key, key)}: {value}")
    return " | ".join(sections) if sections else "None"


def _build_prompt_payload(state: GraphState) -> dict[str, str | int]:
    return {
        "role": state["role"],
        "department": state["department"],
        "onboarding_day": int(state.get("onboarding_day", 1)),
        "current_tasks": _format_current_tasks(state.get("current_tasks", [])),
        "current_plan": _format_current_plan(state.get("current_plan", {})),
        "rag_status": str(state.get("rag_status", "skeleton")),
        "rag_sources": ", ".join(state.get("rag_sources", [])) or "None",
        "user_prompt": str(state.get("user_prompt", "")),
    }


def _format_narrative_plan_output(plan: PlanNarrativeOutput) -> str:
    return "\n\n".join(
        [
            f"Week 1: {plan.week_1}",
            f"Week 2-4: {plan.week_2_4}",
            f"Day 30: {plan.day_30}",
            f"Day 60: {plan.day_60}",
            f"Day 90: {plan.day_90}",
        ]
    )


def _gather_context_node(state: GraphState) -> GraphState:
    return {
        "onboarding_day": max(int(state.get("onboarding_day", 1)), 1),
        "current_tasks": state.get("current_tasks", []),
        "current_plan": state.get("current_plan", {}),
    }


def _rag_skeleton_node(state: GraphState) -> GraphState:
    rag_result = retrieve_policy_context_skeleton(state)
    return {
        "rag_status": str(rag_result.get("rag_status", "skeleton")),
        "rag_confidence": float(rag_result.get("rag_confidence", 0.0)),
        "rag_sources": list(rag_result.get("rag_sources", [])),
        "rag_chunks": list(rag_result.get("rag_chunks", [])),
    }


def _route_workflow(state: GraphState) -> str:
    return "generate_plan" if state.get("workflow") == "plan" else "generate_ask"


def _generate_ask_node(state: GraphState) -> GraphState:
    model = ChatOpenAI(model=MODEL_NAME, reasoning_effort="none")
    chain = ASK_PROMPT_TEMPLATE | model | StrOutputParser()
    response = chain.invoke(_build_prompt_payload(state))
    return {"response": response}


def _generate_plan_node(state: GraphState) -> GraphState:
    model = ChatOpenAI(model=MODEL_NAME, reasoning_effort="none")
    prompt_payload = _build_prompt_payload(state)
    narrative_sections_chain = PLAN_NARRATIVE_PROMPT_TEMPLATE | model.with_structured_output(PlanNarrativeOutput)
    structured_chain = PLAN_STRUCTURED_PROMPT_TEMPLATE | model.with_structured_output(PlanStructuredOutput)

    narrative_plan = narrative_sections_chain.invoke(prompt_payload)
    structured_plan = structured_chain.invoke(prompt_payload)

    return {
        "response": _format_narrative_plan_output(narrative_plan),
        "narrative_plan": narrative_plan,
        "structured_plan": structured_plan,
    }


def _build_graph():
    builder = StateGraph(GraphState)
    builder.add_node("gather_context", _gather_context_node)
    builder.add_node("rag_retrieve_skeleton", _rag_skeleton_node)
    builder.add_node("generate_ask", _generate_ask_node)
    builder.add_node("generate_plan", _generate_plan_node)

    builder.add_edge(START, "gather_context")
    builder.add_edge("gather_context", "rag_retrieve_skeleton")
    builder.add_conditional_edges(
        "rag_retrieve_skeleton",
        _route_workflow,
        {
            "generate_ask": "generate_ask",
            "generate_plan": "generate_plan",
        },
    )
    builder.add_edge("generate_ask", END)
    builder.add_edge("generate_plan", END)
    return builder.compile()


WORKFLOW_GRAPH = _build_graph()


def invoke_PlanWorkflow(ctx: PlanModel) -> GraphState:
    return WORKFLOW_GRAPH.invoke(
        {
            "workflow": "plan",
            "role": ctx.role,
            "department": ctx.department,
            "onboarding_day": ctx.onboarding_day,
            "current_tasks": ctx.current_tasks,
            "current_plan": ctx.current_plan,
        }
    )


def invoke_AskWorkflow(ctx: AskModel) -> GraphState:
    return WORKFLOW_GRAPH.invoke(
        {
            "workflow": "ask",
            "role": ctx.role,
            "department": ctx.department,
            "user_prompt": ctx.user_prompt,
            "onboarding_day": ctx.onboarding_day,
            "current_tasks": ctx.current_tasks,
            "current_plan": ctx.current_plan,
        }
    )



