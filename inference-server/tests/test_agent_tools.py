from unittest.mock import patch

from app.services.workflows import AGENT_TOOLS, _execute_tool_node, flag_for_manager_review, manage_tasks, negotiate_plan


def test_agent_tools_are_registered():
    names = {tool.name for tool in AGENT_TOOLS}
    assert names == {"manage_tasks", "negotiate_plan", "flag_for_manager_review"}


def test_tool_functions_exist_and_have_expected_signatures():
    assert callable(manage_tasks)
    assert callable(negotiate_plan)
    assert callable(flag_for_manager_review)

    assert "action" in str(manage_tasks.args)
    assert "window" in str(negotiate_plan.args)
    assert "reason" in str(flag_for_manager_review.args)


def test_execute_tool_node_passes_auth_context_to_tool_calls():
    state = {
        "tool_calls": [{"name": "manage_tasks", "args": {"action": "add", "task_text": "Set up laptop"}, "id": "call-123"}],
        "user_id": 42,
        "token": "Bearer test-token",
    }

    with patch("app.services.workflows.TOOL_LOOKUP") as lookup_mock:
        lookup_mock.get.return_value = manage_tasks
        with patch.object(manage_tasks, "invoke", return_value="I added a task: Set up laptop") as invoke_mock:
            result = _execute_tool_node(state)

    args = invoke_mock.call_args.args[0]
    assert args["action"] == "add"
    assert args["task_text"] == "Set up laptop"
    assert args["user_id"] == 42
    assert args["token"] == "Bearer test-token"
    assert result["response"] == "I added a task: Set up laptop"


def test_execute_tool_node_resolves_edit_targets_from_prompt_and_task_context():
    state = {
        "tool_calls": [{
            "name": "manage_tasks",
            "args": {"action": "edit", "task_text": "Meet Bronny James"},
            "id": "call-edit",
        }],
        "user_id": 42,
        "token": "Bearer test-token",
        "user_prompt": 'Edit the ask "Meet Lebron James" to "Meet Bronny James"',
        "current_tasks": [
            "id=7; status=pending; phase=Task; text=Meet Lebron James; createdAt=2024-01-01T00:00:00Z",
        ],
    }

    with patch("app.services.workflows.TOOL_LOOKUP") as lookup_mock:
        lookup_mock.get.return_value = manage_tasks
        with patch.object(manage_tasks, "invoke", return_value="I updated task 7 to: Meet Bronny James") as invoke_mock:
            result = _execute_tool_node(state)

    args = invoke_mock.call_args.args[0]
    assert args["task_id"] == 7
    assert args["task_text"] == "Meet Bronny James"
    assert result["response"] == "I updated task 7 to: Meet Bronny James"
