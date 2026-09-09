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
  onAddTask: (text: string) => Promise<boolean>
  onEditTask: (taskId: number, phase: string, text: string) => Promise<boolean>
  onDeleteTask: (taskId: number) => Promise<void>
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
  const [editingTaskPhase, setEditingTaskPhase] = useState('')
  const [editingTaskText, setEditingTaskText] = useState('')
  const [isSavingTask, setIsSavingTask] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null)
  const [taskPendingDelete, setTaskPendingDelete] = useState<EditableTask | null>(null)
  const [togglingTaskId, setTogglingTaskId] = useState<number | null>(null)

  async function submitNewTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draftTaskText.trim()

    if (!text || isSavingTask) {
      return
    }

    setIsSavingTask(true)
    const added = await onAddTask(text)
    setIsSavingTask(false)

    if (added) {
      setDraftTaskText('')
      setIsAddingTask(false)
    }
  }

  async function submitTaskEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = editingTaskText.trim()

    if (editingTaskId === null || !text || isSavingTask) {
      return
    }

    setIsSavingTask(true)
    const updated = await onEditTask(editingTaskId, editingTaskPhase, text)
    setIsSavingTask(false)

    if (updated) {
      setEditingTaskId(null)
      setEditingTaskPhase('')
      setEditingTaskText('')
    }
  }

  function beginTaskEdit(taskId: number, phase: string, text: string) {
    setEditingTaskId(taskId)
    setEditingTaskPhase(phase)
    setEditingTaskText(text)
  }

  async function toggleTask(taskId: number, completed: boolean) {
    if (togglingTaskId !== null) {
      return
    }

    setTogglingTaskId(taskId)
    await onToggleTask(taskId, completed)
    setTogglingTaskId(null)
  }

  function requestDeleteTask(task: EditableTask) {
    if (deletingTaskId !== null) {
      return
    }

    setTaskPendingDelete(task)
  }

  async function confirmDeleteTask() {
    if (!taskPendingDelete || deletingTaskId !== null) {
      return
    }

    setDeletingTaskId(taskPendingDelete.id)
    await onDeleteTask(taskPendingDelete.id)
    setDeletingTaskId(null)
    setTaskPendingDelete(null)
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
            disabled={isAddingTask}
          >
            Add Task
          </button>

          {isAddingTask ? (
            <form className="task-editor" onSubmit={(event) => void submitNewTask(event)}>
              <input
                value={draftTaskText}
                onChange={(event) => setDraftTaskText(event.target.value)}
                placeholder="Describe the task"
                aria-label="New task description"
                autoFocus
                disabled={isSavingTask}
              />
              <button type="submit" disabled={isSavingTask}>
                {isSavingTask ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setIsAddingTask(false)} disabled={isSavingTask}>
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
                      void toggleTask(
                        task.id,
                        event.target.checked,
                      )
                    }
                    aria-label={`Mark ${task.text} complete`}
                    disabled={togglingTaskId === task.id}
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
                    onDelete={requestDeleteTask}
                    isSaving={isSavingTask}
                    isDeleting={deletingTaskId === task.id}
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
                    onDelete={requestDeleteTask}
                    isSaving={isSavingTask}
                    isDeleting={deletingTaskId === task.id}
                  />
                ) : null}

                <span className="task-due">
                  Completed: {task.completedOn}
                </span>

                <button
                  type="button"
                  className="completed-action-button"
                  onClick={() => void toggleTask(task.id, false)}
                  disabled={togglingTaskId === task.id}
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

      {taskPendingDelete ? (
        <div className="delete-modal-overlay">
          <section
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
          >
            <h3 id="delete-modal-title">Delete task?</h3>
            <p id="delete-modal-description">
              This will permanently remove &quot;{taskPendingDelete.text}&quot;.
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                onClick={() => setTaskPendingDelete(null)}
                disabled={deletingTaskId !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-modal-confirm"
                onClick={() => void confirmDeleteTask()}
                disabled={deletingTaskId !== null}
                autoFocus
              >
                {deletingTaskId !== null ? 'Deleting...' : 'Delete task'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

type EditableTask = PendingTask | CompletedTask

type TaskManagerActionsProps = {
  task: EditableTask
  editingTaskId: number | null
  editingTaskText: string
  onEditingTaskTextChange: (text: string) => void
  onStartEdit: (taskId: number, phase: string, text: string) => void
  onSaveEdit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onCancelEdit: () => void
  onDelete: (task: EditableTask) => void
  isSaving: boolean
  isDeleting: boolean
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
  isSaving,
  isDeleting,
}: TaskManagerActionsProps) {
  if (editingTaskId === task.id) {
    return (
      <form className="task-editor" onSubmit={(event) => void onSaveEdit(event)}>
        <input
          value={editingTaskText}
          onChange={(event) => onEditingTaskTextChange(event.target.value)}
          aria-label={`Edit ${task.text}`}
          autoFocus
          disabled={isSaving}
        />
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancelEdit} disabled={isSaving}>
          Cancel
        </button>
      </form>
    )
  }

  return (
    <div className="task-manager-actions">
      <button type="button" onClick={() => onStartEdit(task.id, task.phase, task.text)} disabled={isDeleting}>
        Edit
      </button>
      <button type="button" onClick={() => void onDelete(task)} disabled={isDeleting}>
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}

export default PlanTaskList
