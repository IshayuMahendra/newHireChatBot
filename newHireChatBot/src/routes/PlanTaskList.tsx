import { useState } from 'react'
import type { FormEvent } from 'react'
import './Plan.css'
import type { CompletedTask, PendingTask } from './PlanRoute'

type PlanTaskListProps = {
  pendingTasks: PendingTask[]
  completedTasks: CompletedTask[]
  loadingTasks: boolean
  taskError: string
  planStatus: string
  onToggleTask: (taskId: number, completed: boolean) => Promise<void> | void
  canManageTasks: boolean
  onAddTask: (text: string) => void
  onEditTask: (taskId: number, text: string) => void
  onDeleteTask: (taskId: number) => void
}

function PlanTaskList({
  pendingTasks,
  completedTasks,
  loadingTasks,
  taskError,
  planStatus,
  onToggleTask,
  canManageTasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: PlanTaskListProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [draftTaskText, setDraftTaskText] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editingTaskText, setEditingTaskText] = useState('')

  function submitNewTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draftTaskText.trim()

    if (!text) {
      return
    }

    onAddTask(text)
    setDraftTaskText('')
    setIsAddingTask(false)
  }

  function submitTaskEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = editingTaskText.trim()

    if (editingTaskId === null || !text) {
      return
    }

    onEditTask(editingTaskId, text)
    setEditingTaskId(null)
    setEditingTaskText('')
  }

  function beginTaskEdit(taskId: number, text: string) {
    setEditingTaskId(taskId)
    setEditingTaskText(text)
  }

  return (
    <section
      className="plan-tasks"
      aria-label="Onboarding tasks"
    >
      <h2>Task List</h2>

      <p className="plan-subtext">
        Loaded from your saved task list.
      </p>

      {canManageTasks ? (
        <div className="task-manager-tools">
          <button
            type="button"
            className="task-manager-button"
            onClick={() => setIsAddingTask(true)}
          >
            Add Task
          </button>

          {isAddingTask ? (
            <form className="task-editor" onSubmit={submitNewTask}>
              <input
                value={draftTaskText}
                onChange={(event) => setDraftTaskText(event.target.value)}
                placeholder="Describe the task"
                aria-label="New task description"
                autoFocus
              />
              <button type="submit">Save</button>
              <button type="button" onClick={() => setIsAddingTask(false)}>
                Cancel
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {planStatus ? (
        <p className="plan-subtext">{planStatus}</p>
      ) : null}

      {taskError ? (
        <p className="plan-subtext">{taskError}</p>
      ) : null}

      {loadingTasks ? (
        <p className="plan-subtext">Loading tasks...</p>
      ) : null}

      <div className="task-columns">
        <section
          className="pending-section"
          aria-label="Pending tasks"
        >
          <h3>Pending Tasks</h3>

          <div className="task-scroll-list">
            {pendingTasks.map((task) => (
              <article
                key={task.id}
                className="task-card"
              >
                <label className="task-check-row">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={(event) =>
                      void onToggleTask(
                        task.id,
                        event.target.checked,
                      )
                    }
                    aria-label={`Mark ${task.text} complete`}
                  />

                  <span>
                    <strong>{task.phase}</strong>
                  </span>
                </label>

                <p>{task.text}</p>

                {canManageTasks ? (
                  <TaskManagerActions
                    task={task}
                    editingTaskId={editingTaskId}
                    editingTaskText={editingTaskText}
                    onEditingTaskTextChange={setEditingTaskText}
                    onStartEdit={beginTaskEdit}
                    onSaveEdit={submitTaskEdit}
                    onCancelEdit={() => setEditingTaskId(null)}
                    onDelete={onDeleteTask}
                  />
                ) : null}

                <span className="task-due">
                  Due: {task.due}
                </span>
              </article>
            ))}

            {!loadingTasks && pendingTasks.length === 0 ? (
              <p className="plan-subtext">
                No pending tasks yet.
              </p>
            ) : null}
          </div>
        </section>

        <section
          className="completed-section"
          aria-label="Completed tasks"
        >
          <h3>Completed Tasks</h3>

          <div className="completed-list">
            {completedTasks.map((task) => (
              <article
                key={task.id}
                className="task-card completed-card"
              >
                <div className="completed-title-row">
                  <span
                    className="completed-check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>

                  <span>
                    <strong>{task.phase}</strong>
                  </span>
                </div>

                <p>{task.text}</p>

                {canManageTasks ? (
                  <TaskManagerActions
                    task={task}
                    editingTaskId={editingTaskId}
                    editingTaskText={editingTaskText}
                    onEditingTaskTextChange={setEditingTaskText}
                    onStartEdit={beginTaskEdit}
                    onSaveEdit={submitTaskEdit}
                    onCancelEdit={() => setEditingTaskId(null)}
                    onDelete={onDeleteTask}
                  />
                ) : null}

                <span className="task-due">
                  Completed: {task.completedOn}
                </span>

                <button
                  type="button"
                  className="completed-action-button"
                  onClick={() => void onToggleTask(task.id, false)}
                >
                  Mark as Pending
                </button>
              </article>
            ))}

            {!loadingTasks && completedTasks.length === 0 ? (
              <p className="plan-subtext">
                No completed tasks yet.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  )
}

type EditableTask = PendingTask | CompletedTask

type TaskManagerActionsProps = {
  task: EditableTask
  editingTaskId: number | null
  editingTaskText: string
  onEditingTaskTextChange: (text: string) => void
  onStartEdit: (taskId: number, text: string) => void
  onSaveEdit: (event: FormEvent<HTMLFormElement>) => void
  onCancelEdit: () => void
  onDelete: (taskId: number) => void
}

function TaskManagerActions({
  task,
  editingTaskId,
  editingTaskText,
  onEditingTaskTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: TaskManagerActionsProps) {
  if (editingTaskId === task.id) {
    return (
      <form className="task-editor" onSubmit={onSaveEdit}>
        <input
          value={editingTaskText}
          onChange={(event) => onEditingTaskTextChange(event.target.value)}
          aria-label={`Edit ${task.text}`}
          autoFocus
        />
        <button type="submit">Save</button>
        <button type="button" onClick={onCancelEdit}>
          Cancel
        </button>
      </form>
    )
  }

  return (
    <div className="task-manager-actions">
      <button type="button" onClick={() => onStartEdit(task.id, task.text)}>
        Edit
      </button>
      <button type="button" onClick={() => onDelete(task.id)}>
        Delete
      </button>
    </div>
  )
}

export default PlanTaskList
