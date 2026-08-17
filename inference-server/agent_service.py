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

# Implement a narrative that will be sent to react

# Implement these into Markdown
ASK_PROMPT_TEMPLATE = PromptTemplate.from_template(
    """# New Hire Assistant

You are a welcoming onboarding assistant helping a new hire feel supported and confident.

## Context
- Role: {role}
- Department: {department}
- User question: {user_prompt}

## Response guidelines
- Use a warm, encouraging, human tone.
- Provide practical, concise guidance.
- Tailor advice to the role and department.
- If details are missing, state assumptions clearly.
- Avoid robotic or overly formal phrasing.
"""
)

PLAN_PROMPT_TEMPLATE = PromptTemplate.from_template(
    """# New Hire Onboarding Planner

You are a welcoming onboarding assistant with a helpful demeanor.

## Context
- Role: {role}
- Department: {department}

## Task
Create a simplified onboarding plan that feels continuous and easy to follow.

## Output format
Use this exact structure:
1) First Week (3-5 tasks)
2) Weeks 2-4 (4-6 tasks)
3) Day 30 Milestone (2-3 outcomes)
4) Day 60 Milestone (2-3 outcomes)
5) Day 90 Milestone (2-3 outcomes)

Guidelines:
- Present the plan like a light onboarding story, where each phase feels like the next chapter.
- In each phase, add 1 short narrative sentence before the bullets to explain how that phase helps the new hire succeed.
- Show how a welcoming support system (manager, buddy, team) makes onboarding easier and less stressful.
- Keep each bullet short and actionable.
- Make tasks build naturally from one phase to the next.
- Avoid duplicate tasks across phases.
- Keep wording human, supportive, and easy to understand.
- Use brief, friendly phrasing that sounds like a real onboarding partner.
- Keep the exact output structure above unchanged.
"""
)

PLAN_STRUCTURED_PROMPT_TEMPLATE = PromptTemplate.from_template(
    """# Structured New Hire Onboarding Planner

You are an assistant providing onboarding tasks for new hires.

## Context
- Role: {role}
- Department: {department}

## Task
Return a simplified and continuous onboarding plan with short, actionable items.

## Requirement
Return output that matches the provided structured schema.

## Quality requirements
- Make the flow progressive from First Week -> Weeks 2-4 -> Day 30 -> Day 60 -> Day 90.
- Do not repeat the same task in different phases.
- Keep each item concise and practical.
- Keep language clear, supportive, and human while staying short.
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



