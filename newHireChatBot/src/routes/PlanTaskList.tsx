import './Plan.css'
import type { CompletedTask, PendingTask } from './PlanRoute'

type PlanTaskListProps = {
  pendingTasks: PendingTask[]
  completedTasks: CompletedTask[]
  loadingTasks: boolean
  taskError: string
  planStatus: string
  onToggleTask: (taskId: number, completed: boolean) => Promise<void> | void
}

function PlanTaskList({
  pendingTasks,
  completedTasks,
  loadingTasks,
  taskError,
  planStatus,
  onToggleTask,
}: PlanTaskListProps) {
  return (
    <section
      className="plan-tasks"
      aria-label="Onboarding tasks"
    >
      <h2>Task List</h2>

      <p className="plan-subtext">
        Loaded from your saved task list.
      </p>

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

export default PlanTaskList
