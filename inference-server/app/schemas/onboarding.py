from typing import Any, TypedDict

from langchain_core.messages import ToolMessage
from pydantic import AliasChoices, BaseModel, Field, field_validator


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


def normalize_plan_keys(value: dict[str, str]) -> dict[str, str]:
    cleaned_plan: dict[str, str] = {}
    for key, text in value.items():
        normalized_key = PLAN_KEY_ALIASES.get(str(key).strip(), str(key).strip())
        cleaned_text = str(text).strip()
        if normalized_key and cleaned_text:
            cleaned_plan[normalized_key] = cleaned_text
    return cleaned_plan


class AskModel(BaseModel):
    role: str = Field(min_length=1, description="The primary job title or role of the user.")
    department: str = Field(min_length=1, description="The name of the department where the user works.")
    user_prompt: str = Field(min_length=1)
    onboarding_day: int = Field(default=1, ge=1, description="Current day in onboarding progression.")
    current_tasks: list[str] = Field(default_factory=list, description="Current task texts already assigned to the user.")
    current_plan: dict[str, str] = Field(
        default_factory=dict,
        description="Current narrative plan keyed by section labels: planWeek1, planWeek2_4, plan30Day, plan60Day, plan90Day. Legacy aliases week_1, week_2_4, day_30, day_60, day_90 are also accepted."
    )
    chat_history: list[str] = Field(
        default_factory=list,
        description="Prior chat turns for this conversation in display order. Each entry should include speaker and message text.",
    )

    @field_validator("role", "department", "user_prompt")
    @classmethod
    def validate_non_empty_trimmed(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("current_tasks")
    @classmethod
    def validate_current_tasks(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item and item.strip()]

    @field_validator("current_plan")
    @classmethod
    def validate_current_plan(cls, value: dict[str, str]) -> dict[str, str]:
        return normalize_plan_keys(value)

    @field_validator("chat_history")
    @classmethod
    def validate_chat_history(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item and item.strip()]


class PlanModel(BaseModel):
    role: str = Field(min_length=1, description="The primary job title or role of the user.")
    department: str = Field(min_length=1, description="The name of the department where the user works.")
    onboarding_day: int = Field(default=1, ge=1, description="Current day in onboarding progression.")
    current_tasks: list[str] = Field(default_factory=list, description="Current task texts already assigned to the user.")
    current_plan: dict[str, str] = Field(
        default_factory=dict,
        description="Current narrative plan keyed by section labels: planWeek1, planWeek2_4, plan30Day, plan60Day, plan90Day. Legacy aliases week_1, week_2_4, day_30, day_60, day_90 are also accepted."
    )

    @field_validator("role", "department")
    @classmethod
    def validate_non_empty_trimmed(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("current_tasks")
    @classmethod
    def validate_current_tasks(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item and item.strip()]

    @field_validator("current_plan")
    @classmethod
    def validate_current_plan(cls, value: dict[str, str]) -> dict[str, str]:
        return normalize_plan_keys(value)


class PlanForUserModel(BaseModel):
    user_id: int = Field(ge=1, description="The onboarding website user ID that should receive generated tasks.")
    role: str = Field(min_length=1, description="The primary job title or role of the user.")
    department: str = Field(min_length=1, description="The name of the department where the user works.")
    onboarding_day: int = Field(default=1, ge=1, description="Current day in onboarding progression.")
    current_tasks: list[str] = Field(default_factory=list, description="Current task texts already assigned to the user.")
    current_plan: dict[str, str] = Field(
        default_factory=dict,
        description="Current narrative plan keyed by section labels: planWeek1, planWeek2_4, plan30Day, plan60Day, plan90Day. Legacy aliases week_1, week_2_4, day_30, day_60, day_90 are also accepted."
    )

    @field_validator("role", "department")
    @classmethod
    def validate_non_empty_trimmed(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("current_tasks")
    @classmethod
    def validate_current_tasks(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item and item.strip()]

    @field_validator("current_plan")
    @classmethod
    def validate_current_plan(cls, value: dict[str, str]) -> dict[str, str]:
        return normalize_plan_keys(value)


class PlanNarrativeOutput(BaseModel):
    week_1: str = Field(min_length=1, description="Outcome sentence and bullet actions for Week 1.")
    week_2_4: str = Field(min_length=1, description="Outcome sentence and bullet actions for Weeks 2-4.")
    day_30: str = Field(min_length=1, description="Outcome sentence and bullet actions for Day 30.")
    day_60: str = Field(min_length=1, description="Outcome sentence and bullet actions for Day 60.")
    day_90: str = Field(min_length=1, description="Outcome sentence and bullet actions for Day 90.")

    @field_validator("week_1", "week_2_4", "day_30", "day_60", "day_90")
    @classmethod
    def validate_paragraph_non_empty_trimmed(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Narrative paragraph cannot be empty")
        return cleaned


class PlanStructuredOutput(BaseModel):
    week_1_tasks: list[str] = Field(
        default_factory=list,
        description="Short, actionable tasks for Week 1.",
        validation_alias=AliasChoices("week_1_tasks", "first_week_tasks"),
    )
    week_2_4_tasks: list[str] = Field(
        default_factory=list,
        description="Continuous tasks for Week 2-4.",
        validation_alias=AliasChoices("week_2_4_tasks", "weeks_2_4_tasks"),
    )
    day_30_tasks: list[str] = Field(
        default_factory=list,
        description="Milestone tasks for Day 30.",
        validation_alias=AliasChoices("day_30_tasks", "day_30_outcomes"),
    )
    day_60_tasks: list[str] = Field(
        default_factory=list,
        description="Milestone tasks for Day 60.",
        validation_alias=AliasChoices("day_60_tasks", "day_60_outcomes"),
    )
    day_90_tasks: list[str] = Field(
        default_factory=list,
        description="Milestone tasks for Day 90.",
        validation_alias=AliasChoices("day_90_tasks", "day_90_outcomes"),
    )

    @field_validator("week_1_tasks", "week_2_4_tasks", "day_30_tasks", "day_60_tasks", "day_90_tasks")
    @classmethod
    def validate_task_buckets(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item and item.strip()]


class GraphState(TypedDict, total=False):
    workflow: str
    role: str
    department: str
    user_prompt: str
    onboarding_day: int
    current_tasks: list[str]
    current_plan: dict[str, str]
    chat_history: list[str]
    user_id: int
    token: str
    rag_status: str
    rag_confidence: float
    rag_sources: list[str]
    rag_chunks: list[dict[str, Any]]
    response: str
    tool_calls: list[dict[str, Any]]
    tool_results: list[str]
    messages: list[ToolMessage]
    narrative_plan: PlanNarrativeOutput
    structured_plan: PlanStructuredOutput
