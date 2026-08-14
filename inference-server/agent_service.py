from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
from models import AskModel, PlanModel, PlanStructuredOutput
# from langchain.agents import create_agent

MODEL_NAME = "gpt-5.6-luna"

# Load environment variables from .env file
load_dotenv()


# agent = create_agent(
#     model = MODEL_NAME
# )

# Implement these into Markdown
def invoke_AskModel(ctx: AskModel) -> str:
    model = ChatOpenAI(model=MODEL_NAME)
    final_prompt = (
        f"""You are an assistant helping a new hire.
        Context:
        Role: {ctx.role}
        Department: {ctx.department}
        User question: {ctx.user_prompt}"""
    )
    response = model.invoke(final_prompt)
    return response.content if isinstance(response.content, str) else str(response.content)

def invoke_PlanModel(ctx: PlanModel) -> str:
    model = ChatOpenAI(model=MODEL_NAME)
    final_prompt = (
        "You are an assistant providing onboarding tasks for new hires.\n"
        "Context:\n"
        f"Role: {ctx.role}\n"
        f"Department: {ctx.department}\n"
        "Generate a practical 30-60-90 day onboarding plan with clear action items."
    )
    response = model.invoke(final_prompt)
    return response.content if isinstance(response.content, str) else str(response.content)


def invoke_PlanModel_structured(ctx: PlanModel) -> PlanStructuredOutput:
    model = ChatOpenAI(model=MODEL_NAME)
    structured_llm = model.with_structured_output(PlanStructuredOutput)
    final_prompt = (
        "You are an assistant providing onboarding tasks for new hires.\n"
        "Context:\n"
        f"Role: {ctx.role}\n"
        f"Department: {ctx.department}\n"
        "Return a 30-60-90 day onboarding plan with specific action items and measurable outcomes."
    )
    return structured_llm.invoke(final_prompt)



