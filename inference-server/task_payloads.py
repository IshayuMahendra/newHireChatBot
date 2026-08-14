from models import PlanStructuredOutput


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
