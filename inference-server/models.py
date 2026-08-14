from pydantic import BaseModel, Field


class AskModel(BaseModel):
	role: str = Field(min_length=1, description="The primary job title or role of the user.")
	department: str = Field(min_length=1, description="The name of the department where the user works.")
	user_prompt: str = Field(min_length=1)


class PlanModel(BaseModel):
	role: str = Field(min_length=1, description="The primary job title or role of the user.")
	department: str = Field(min_length=1, description="The name of the department where the user works.")


class PlanStructuredOutput(BaseModel):
	days_30: list[str] = Field(default_factory=list, description="Onboarding actions for first 30 days")
	days_60: list[str] = Field(default_factory=list, description="Onboarding actions for days 31-60")
	days_90: list[str] = Field(default_factory=list, description="Onboarding actions for days 61-90")
	success_metrics: list[str] = Field(default_factory=list, description="How progress should be measured")
