import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Plan.css'

type PendingTask = {
  id: number
  title: string
  text: string
  due: string
}

type CompletedTask = {
  id: number
  title: string
  text: string
  due: string
  completedOn: string
}

type PlanRouteProps = {
  username: string
}

const initialPendingTasks: PendingTask[] = [
  {
    id: 1,
    title: 'Meet Your Manager',
    text: 'Set up a 30-minute introduction with your manager and discuss first-week priorities.',
    due: 'Day 1',
  },
  {
    id: 2,
    title: 'Complete Payroll Setup',
    text: 'Submit your direct deposit and tax forms through the onboarding portal.',
    due: 'Day 2',
  },
  {
    id: 3,
    title: 'Environment Access',
    text: 'Request all required tools, system access, and team communication channels.',
    due: 'Day 3',
  },
  {
    id: 4,
    title: 'First Team Intro',
    text: 'Attend your team standup and introduce your role, background, and onboarding goals.',
    due: 'Week 1',
  },
  {
    id: 5,
    title: 'Team Lunch',
    text: 'Join the team for a welcome lunch and informal introductions.',
    due: 'Week 1',
  },
]

const initialCompletedTasks: CompletedTask[] = [
  {
    id: 101,
    title: 'Company Handbook Review',
    text: 'Read and acknowledge onboarding handbook and workplace policies.',
    due: 'Day 1',
    completedOn: 'Today',
  },
  {
    id: 102,
    title: 'Benefits Enrollment',
    text: 'Finished health, dental, and vision enrollment setup.',
    due: 'Day 2',
    completedOn: 'Yesterday',
  },
]

function PlanRoute({ username }: PlanRouteProps) {
  const navigate = useNavigate()
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>(initialPendingTasks)
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>(initialCompletedTasks)

  function moveToCompleted(taskId: number) {
    setPendingTasks((currentPending) => {
      const taskToMove = currentPending.find((task) => task.id === taskId)
      if (!taskToMove) {
        return currentPending
      }

      setCompletedTasks((currentCompleted) => [
        {
          ...taskToMove,
          completedOn: 'Today',
        },
        ...currentCompleted,
      ])

      return currentPending.filter((task) => task.id !== taskId)
    })
  }

  function moveToPending(taskId: number) {
    setCompletedTasks((currentCompleted) => {
      const taskToMove = currentCompleted.find((task) => task.id === taskId)
      if (!taskToMove) {
        return currentCompleted
      }

      setPendingTasks((currentPending) => [
        {
          id: taskToMove.id,
          title: taskToMove.title,
          text: taskToMove.text,
          due: taskToMove.due,
        },
        ...currentPending,
      ])

      return currentCompleted.filter((task) => task.id !== taskId)
    })
  }

  return (
    <section className="plan-shell">
      <header className="plan-header">
        <h1>{`${username || 'New Hire'} Onboarding Plan`}</h1>
        <button type="button" className="plan-back" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </header>

      <main className="plan-layout">
        <section className="plan-tasks" aria-label="Onboarding tasks">
          <h2>Task List</h2>
          <p className="plan-subtext">Demo cards for layout only. Functionality comes next.</p>

          <div className="task-columns">
            <section className="pending-section" aria-label="Pending tasks">
              <h3>Pending Tasks</h3>
              <div className="task-scroll-list">
                {pendingTasks.map((task) => (
                  <article key={task.id} className="task-card">
                    <label className="task-check-row">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => moveToCompleted(task.id)}
                        aria-label={`Mark ${task.title} complete`}
                      />
                      <span>{task.title}</span>
                    </label>
                    <p>{task.text}</p>
                    <span className="task-due">Due: {task.due}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="completed-section" aria-label="Completed tasks">
              <h3>Completed Tasks</h3>
              <div className="completed-list">
                {completedTasks.map((task) => (
                  <article key={task.id} className="task-card completed-card">
                    <div className="completed-title-row">
                      <span className="completed-check" aria-hidden="true">
                        ✓
                      </span>
                      <span>{task.title}</span>
                    </div>
                    <p>{task.text}</p>
                    <span className="task-due">Completed: {task.completedOn}</span>
                    <button
                      type="button"
                      className="completed-action-button"
                      onClick={() => moveToPending(task.id)}
                    >
                      Mark as Pending
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="plan-chat" aria-label="AI chat panel">
          <h2>Assistant Chat</h2>
          <div className="chat-window" role="log" aria-live="polite">
            <div className="chat-message assistant">
              Hi! I can help you build your first 30-day onboarding path.
            </div>
            <div className="chat-message user">What should I focus on this week?</div>
            <div className="chat-message assistant">
              Start with your manager meeting, tool setup, and team intro. Then we can generate
              your role-specific milestones.
            </div>
          </div>

          <form className="chat-input-row" onSubmit={(event) => event.preventDefault()}>
            <input type="text" placeholder="Ask a question..." aria-label="Ask the assistant" />
            <button type="submit">Send</button>
          </form>
        </section>
      </main>
    </section>
  )
}

export default PlanRoute
