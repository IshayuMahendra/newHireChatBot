from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv
from models import AskModel, PlanModel, PlanStructuredOutput
# from langchain.agents import create_agent

MODEL_NAME = "gpt-5.6-luna"

# Load environment variables from .env file
load_dotenv()


# agent = create_agent(
#     model = MODEL_NAME
# )

# Future feature 

# Implement these into Markdown
ASK_PROMPT_TEMPLATE = PromptTemplate.from_template(
    """# New Hire Assistant

You are an assistant helping a new hire.

## Context
- Role: {role}
- Department: {department}
- User question: {user_prompt}

## Response guidelines
- Provide practical, concise guidance.
- Tailor advice to the role and department.
- If details are missing, state assumptions clearly.
"""
)

PLAN_PROMPT_TEMPLATE = PromptTemplate.from_template(
    """# New Hire Onboarding Planner

You are an assistant providing onboarding tasks for new hires.

## Context
- Role: {role}
- Department: {department}

## Task
Generate a practical 30-60-90 day onboarding plan with clear action items.

## Output format
- Day 30: focus areas and concrete tasks
- Day 60: focus areas and concrete tasks
- Day 90: focus areas and concrete tasks
- Include measurable outcomes for each phase
"""
)

PLAN_STRUCTURED_PROMPT_TEMPLATE = PromptTemplate.from_template(
    """# Structured New Hire Onboarding Planner

You are an assistant providing onboarding tasks for new hires.

## Context
- Role: {role}
- Department: {department}

## Task
Return a 30-60-90 day onboarding plan with specific action items and measurable outcomes.

## Requirement
Return output that matches the provided structured schema.
"""
)


def invoke_AskModel(ctx: AskModel) -> str:
    model = ChatOpenAI(model=MODEL_NAME)
    chain = ASK_PROMPT_TEMPLATE | model | StrOutputParser()
    return chain.invoke(
        {
            "role": ctx.role,
            "department": ctx.department,
            "user_prompt": ctx.user_prompt,
        }
    )

def invoke_PlanModel(ctx: PlanModel) -> str:
    model = ChatOpenAI(model=MODEL_NAME)
    chain = PLAN_PROMPT_TEMPLATE | model | StrOutputParser()
    return chain.invoke({"role": ctx.role, "department": ctx.department})


def invoke_PlanModel_structured(ctx: PlanModel) -> PlanStructuredOutput:
    model = ChatOpenAI(model=MODEL_NAME)
    structured_llm = model.with_structured_output(PlanStructuredOutput)
    chain = PLAN_STRUCTURED_PROMPT_TEMPLATE | structured_llm
    return chain.invoke({"role": ctx.role, "department": ctx.department})



