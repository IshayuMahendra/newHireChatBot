from models import PlanStructuredOutput


def build_task_payloads(plan_output: PlanStructuredOutput) -> list[str]:
    phase_buckets = [
        ("Week 1", plan_output.week_1_tasks),
        ("Week 2-4", plan_output.week_2_4_tasks),
        ("30 Days", plan_output.day_30_tasks),
        ("60 Days", plan_output.day_60_tasks),
        ("90 Days", plan_output.day_90_tasks),
    ]
    parsed_tasks: list[str] = []
    for phase_label, items in phase_buckets:
        for item in items:
            cleaned_item = item.strip()
            if cleaned_item:
                parsed_tasks.append(f"[{phase_label}] {cleaned_item}")
    return parsed_tasks
