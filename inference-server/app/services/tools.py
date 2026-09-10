import json
import re
from typing import Any

import httpx
from langchain_core.tools import tool


TASKS_API_BASE_URL = "http://localhost:3001"


def _normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _extract_task_text_from_context_line(line: str) -> str:
    match = re.search(r"text=(.*?)(?:; createdAt=|$)", line)
    if match:
        return match.group(1).strip()
    return line.strip()


def _resolve_task_id_from_context(current_tasks: list[str] | None, target_text: str | None) -> int | None:
    if not current_tasks or not target_text:
        return None

    target_norm = _normalize_text(target_text)
    for line in current_tasks:
        task_text = _extract_task_text_from_context_line(str(line))
        if _normalize_text(task_text) == target_norm:
            match = re.search(r"id=(\d+)", line)
            if match:
                return int(match.group(1))

    for line in current_tasks:
        task_text = _extract_task_text_from_context_line(str(line))
        if target_norm in _normalize_text(task_text):
            match = re.search(r"id=(\d+)", line)
            if match:
                return int(match.group(1))

    return None


def _extract_old_and_new_task_text(user_prompt: str | None, task_text: str | None) -> tuple[str | None, str | None]:
    if not user_prompt:
        return None, task_text

    patterns = [
        r"(?:edit|update|rename)\s+(?:the\s+)?(?:task\s+)?['\"]?(?P<old>[^'\"\n]+?)['\"]?\s*(?:to|->|=>)\s*['\"]?(?P<new>[^'\"\n]+?)['\"]?",
        r"['\"](?P<old>[^'\"]+?)['\"]\s*(?:to|->|=>)\s*['\"](?P<new>[^'\"]+?)['\"]",
    ]

    for pattern in patterns:
        match = re.search(pattern, user_prompt, re.IGNORECASE)
        if match:
            old_value = (match.group("old") or "").strip()
            new_value = (match.group("new") or "").strip()
            if old_value:
                return old_value, new_value or task_text

    if task_text:
        return None, task_text
    return None, None


@tool
def manage_tasks(
    action: str,
    task_text: str | None = None,
    task_id: int | None = None,
    user_id: int | None = None,
    token: str | None = None,
    existing_task_text: str | None = None,
    current_tasks: list[str] | None = None,
    user_prompt: str | None = None,
) -> str:
    """Manage a new hire's task list. Only act on the authenticated user and only for routine bookkeeping. When editing a task, prefer passing the matching existing task text or its task_id so the right item is updated."""
    if not user_id or not token:
        return "Missing user context or auth token; task action was not executed."

    headers = {"Authorization": token}
    try:
        if action == "add":
            if not task_text or not task_text.strip():
                return "No task text was supplied for the add action."
            response = httpx.post(
                f"{TASKS_API_BASE_URL}/users/{user_id}/tasks",
                headers=headers,
                json={"text": task_text.strip()},
                timeout=10.0,
            )
            if response.status_code == 201:
                return f"I added a task: {task_text.strip()}"
            return f"Task add failed: {response.text}"

        if action == "complete":
            if task_id is None:
                return "No task id was supplied for the complete action."
            response = httpx.patch(
                f"{TASKS_API_BASE_URL}/tasks/{task_id}/complete",
                headers=headers,
                json={"completed": True},
                timeout=10.0,
            )
            if response.status_code == 200:
                return f"I marked task {task_id} complete."
            return f"Task complete failed: {response.text}"

        if action == "edit":
            resolved_task_id = task_id
            if resolved_task_id is None:
                if task_text and existing_task_text:
                    resolved_task_id = _resolve_task_id_from_context(current_tasks, existing_task_text)
                elif user_prompt:
                    old_text, new_text = _extract_old_and_new_task_text(user_prompt, task_text)
                    if old_text:
                        resolved_task_id = _resolve_task_id_from_context(current_tasks, old_text)
                        if new_text is not None and task_text is None:
                            task_text = new_text

            if resolved_task_id is None or not task_text or not task_text.strip():
                return "Both a valid task id and task text are required for the edit action."

            response = httpx.patch(
                f"{TASKS_API_BASE_URL}/tasks/{resolved_task_id}",
                headers=headers,
                json={"text": task_text.strip()},
                timeout=10.0,
            )
            if response.status_code == 200:
                return f"I updated task {resolved_task_id} to: {task_text.strip()}"
            return f"Task edit failed: {response.text}"

        if action == "delete":
            if task_id is None:
                return "No task id was supplied for the delete action."
            response = httpx.delete(
                f"{TASKS_API_BASE_URL}/tasks/{task_id}",
                headers=headers,
                timeout=10.0,
            )
            if response.status_code == 200:
                return f"I removed task {task_id}."
            return f"Task delete failed: {response.text}"

        return "Unsupported task action. Use add, edit, complete, or delete."
    except httpx.HTTPError as exc:
        return f"Task API call failed: {exc}"


@tool
def negotiate_plan(
    window: str,
    text: str | None = None,
    user_id: int | None = None,
    token: str | None = None,
) -> str:
    """Update one plan window for the authenticated new hire only. Accepts plan30Day, plan60Day, or plan90Day."""
    if not user_id or not token:
        return "Missing user context or auth token; plan update was not executed."

    allowed = {"plan30Day", "plan60Day", "plan90Day"}
    if window not in allowed:
        return f"Unsupported plan window '{window}'. Use one of: {sorted(allowed)}"
    if not text or not text.strip():
        return "No updated plan text was supplied."

    headers = {"Authorization": token}
    try:
        response = httpx.patch(
            f"{TASKS_API_BASE_URL}/users/{user_id}/{window}",
            headers=headers,
            json={window: text.strip()},
            timeout=10.0,
        )
        if response.status_code == 200:
            return f"I updated your {window} plan to: {text.strip()}"
        return f"Plan update failed: {response.text}"
    except httpx.HTTPError as exc:
        return f"Plan API call failed: {exc}"


@tool
def flag_for_manager_review(
    reason: str,
    user_id: int | None = None,
    token: str | None = None,
) -> str:
    """Escalate a new hire for manager review if the conversation suggests they are stuck or blocked."""
    if not user_id or not token:
        return "Missing user context or auth token; manager flag was not created."
    if not reason or not reason.strip():
        return "A reason is required before raising a manager flag."

    headers = {"Authorization": token}
    try:
        response = httpx.post(
            f"{TASKS_API_BASE_URL}/flags",
            headers=headers,
            json={"userId": user_id, "reason": reason.strip()},
            timeout=10.0,
        )
        if response.status_code == 201:
            return f"I raised a manager flag because: {reason.strip()}"
        return f"Flag creation failed: {response.text}"
    except httpx.HTTPError as exc:
        return f"Flag API call failed: {exc}"


AGENT_TOOLS = [manage_tasks, negotiate_plan, flag_for_manager_review]
TOOL_LOOKUP = {tool.name: tool for tool in AGENT_TOOLS}
