from pydantic import BaseModel, Field, field_validator


class AskModel(BaseModel):
	role: str = Field(min_length=1, description="The primary job title or role of the user.")
	department: str = Field(min_length=1, description="The name of the department where the user works.")
	user_prompt: str = Field(min_length=1)

	@field_validator("role", "department", "user_prompt")
	@classmethod
	def validate_non_empty_trimmed(cls, value: str) -> str:
		cleaned = value.strip()
		if not cleaned:
			raise ValueError("Field cannot be empty")
		return cleaned


class PlanModel(BaseModel):
	role: str = Field(min_length=1, description="The primary job title or role of the user.")
	department: str = Field(min_length=1, description="The name of the department where the user works.")

	@field_validator("role", "department")
	@classmethod
	def validate_non_empty_trimmed(cls, value: str) -> str:
		cleaned = value.strip()
		if not cleaned:
			raise ValueError("Field cannot be empty")
		return cleaned


class PlanForUserModel(BaseModel):
	user_id: int = Field(ge=1, description="The onboarding website user ID that should receive generated tasks.")
	role: str = Field(min_length=1, description="The primary job title or role of the user.")
	department: str = Field(min_length=1, description="The name of the department where the user works.")

	@field_validator("role", "department")
	@classmethod
	def validate_non_empty_trimmed(cls, value: str) -> str:
		cleaned = value.strip()
		if not cleaned:
			raise ValueError("Field cannot be empty")
		return cleaned


class PlanStructuredOutput(BaseModel):
	first_week_tasks: list[str] = Field(default_factory=list, description="Short, actionable tasks for the first week")
	weeks_2_4_tasks: list[str] = Field(default_factory=list, description="Continuous tasks for weeks 2 through 4")
	day_30_outcomes: list[str] = Field(default_factory=list, description="Milestone outcomes expected by day 30")
	day_60_outcomes: list[str] = Field(default_factory=list, description="Milestone outcomes expected by day 60")
	day_90_outcomes: list[str] = Field(default_factory=list, description="Milestone outcomes expected by day 90")
