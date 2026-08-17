import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { askAssistant } from '../util/askApi.ts'
import { generatePlan } from '../util/planApi'
import './Plan.css'

type PendingTask = {
  id: number
  phase: string
  text: string
  due: string
}

type CompletedTask = {
  id: number
  phase: string
  text: string
  due: string
  completedOn: string
}

type PlanRouteProps = {
  username: string
  userId?: number
  role: string
  department: string
}

type ApiTask = {
  id: number
  text: string
  completed?: boolean
  createdAt?: string
}

const PHASE_ORDER: Record<string, number> = {
  'Week 1': 1,
  'Weeks 2-4': 2,
  'Day 30': 3,
  'Day 60': 4,
  'Day 90': 5,
}

const API_BASE_URL = 'http://localhost:3001'

function formatCompletedDate(timestamp?: string): string {
  if (!timestamp) {
    return new Date().toLocaleString()
  }

  const parsed = new Date(timestamp)

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toLocaleString()
  }

  return parsed.toLocaleString()
}

function parseTaskText(rawText: string): {
  phase: string
  text: string
} {
  const match = rawText.match(/^\[(.+?)\]\s*(.*)$/)

  if (!match) {
    return {
      phase: 'Task',
      text: rawText,
    }
  }

  const [, phase, text] = match

  return {
    phase: phase.trim(),
    text: text.trim() || rawText,
  }
}

function compareTaskPhase(
  a: { phase: string; id: number },
  b: { phase: string; id: number },
) {
  const phaseRankA =
    PHASE_ORDER[a.phase] ?? Number.MAX_SAFE_INTEGER

  const phaseRankB =
    PHASE_ORDER[b.phase] ?? Number.MAX_SAFE_INTEGER

  if (phaseRankA !== phaseRankB) {
    return phaseRankA - phaseRankB
  }

  return a.id - b.id
}

function PlanRoute({
  username,
  userId,
  role,
  department,
}: PlanRouteProps) {
  const navigate = useNavigate()

  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [taskError, setTaskError] = useState('')

  const [chatInput, setChatInput] = useState('')
  const [
    chatMessages,
    setChatMessages,
  ] = useState<
    Array<{
      sender: 'user' | 'assistant'
      text: string
    }>
  >([])

  const [isAsking, setIsAsking] = useState(false)
  const [chatError, setChatError] = useState('')

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [planStatus, setPlanStatus] = useState('')
  const [planResponse, setPlanResponse] = useState('')

  const loadTasks = useCallback(
    async (targetUserId: number) => {
      setLoadingTasks(true)
      setTaskError('')

      try {
        const response = await fetch(
          `${API_BASE_URL}/users/${targetUserId}/tasks`,
        )

        if (!response.ok) {
          setPendingTasks([])
          setCompletedTasks([])
          setTaskError(
            'Could not load tasks from the server.',
          )
          return
        }

        const tasks = (await response.json()) as ApiTask[]

        const nextPending: PendingTask[] = tasks
          .filter((task) => !task.completed)
          .map((task) => ({
            id: task.id,
            ...parseTaskText(task.text),
            due: 'Pending',
          }))
          .sort(compareTaskPhase)

        const nextCompleted: CompletedTask[] = tasks
          .filter((task) => Boolean(task.completed))
          .map((task) => ({
            id: task.id,
            ...parseTaskText(task.text),
            due: 'Completed',
            completedOn: formatCompletedDate(task.createdAt),
          }))
          .sort(compareTaskPhase)

        setPendingTasks(nextPending)
        setCompletedTasks(nextCompleted)
      } catch {
        setPendingTasks([])
        setCompletedTasks([])
        setTaskError(
          'Could not load tasks from the server.',
        )
      } finally {
        setLoadingTasks(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!userId) {
      setPendingTasks([])
      setCompletedTasks([])
      setLoadingTasks(false)
      setTaskError(
        'No user loaded. Please log in again.',
      )
      return
    }

    void loadTasks(userId)
  }, [userId, loadTasks])

  async function handleGeneratePlan() {
    if (!userId) {
      setTaskError(
        'No user loaded. Please log in again.',
      )
      return
    }

    const trimmedRole = role.trim()
    const trimmedDepartment = department.trim()

    if (!trimmedRole || !trimmedDepartment) {
      setTaskError(
        'Missing role or department context. Please log in again.',
      )
      return
    }

    setPlanStatus('')
    setTaskError('')
    setIsGeneratingPlan(true)

    const result = await generatePlan(
      userId,
      trimmedRole,
      trimmedDepartment,
    )

    if (!result.ok) {
      setTaskError(result.message)
      setIsGeneratingPlan(false)
      return
    }

    setPlanResponse(result.response ?? '')

    await loadTasks(userId)

    setPlanStatus(result.message)
    setIsGeneratingPlan(false)
  }

  async function completeTask(taskId: number) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/tasks/${taskId}/complete`,
        {
          method: 'PATCH',
        },
      )

      if (!response.ok) {
        setTaskError(
          'Could not update task status in the server.',
        )
        return
      }

      setTaskError('')
      moveToCompleted(
        taskId,
        new Date().toISOString(),
      )
    } catch {
      setTaskError(
        'Could not update task status in the server.',
      )
    }
  }

  function moveToCompleted(
    taskId: number,
    completedAtIso: string,
  ) {
    setPendingTasks((currentPending) => {
      const taskToMove = currentPending.find(
        (task) => task.id === taskId,
      )

      if (!taskToMove) {
        return currentPending
      }

      setCompletedTasks((currentCompleted) => [
        {
          ...taskToMove,
          completedOn:
            formatCompletedDate(completedAtIso),
        },
        ...currentCompleted,
      ])

      return currentPending.filter(
        (task) => task.id !== taskId,
      )
    })
  }

  function moveToPending(taskId: number) {
    setCompletedTasks((currentCompleted) => {
      const taskToMove = currentCompleted.find(
        (task) => task.id === taskId,
      )

      if (!taskToMove) {
        return currentCompleted
      }

      setPendingTasks((currentPending) =>
        [
          {
            id: taskToMove.id,
            phase: taskToMove.phase,
            text: taskToMove.text,
            due: taskToMove.due,
          },
          ...currentPending,
        ].sort(compareTaskPhase),
      )

      return currentCompleted.filter(
        (task) => task.id !== taskId,
      )
    })
  }

  async function handleAsk(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const trimmedPrompt = chatInput.trim()

    if (!trimmedPrompt) {
      setChatError(
        'Please enter a question before asking.',
      )
      return
    }

    setChatError('')
    setIsAsking(true)
    setChatInput('')

    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        sender: 'user',
        text: trimmedPrompt,
      },
    ])

    const result = await askAssistant(
      role,
      department,
      trimmedPrompt,
    )

    setIsAsking(false)

    if (!result.ok || !result.response) {
      setChatError(result.message)
      return
    }

    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        sender: 'assistant',
        text: result.response ?? '',
      },
    ])
  }

  return (
    <section className="plan-shell">
      <header className="plan-header">
        <h1>
          {`${username || 'New Hire'} Onboarding Plan`}
        </h1>

        <button
          type="button"
          className="plan-back"
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
      </header>

      <main className="plan-layout">

        {/* ================================
            ONBOARDING PLAN
            ================================ */}
        <section
          className="plan-overview"
          aria-label="Onboarding plan"
        >
          <h2>Onboarding Plan</h2>

          <div className="plan-overview-scroll">
            {planResponse ? (
              <p className="plan-response">
                {planResponse}
              </p>
            ) : (
              <p className="plan-subtext">
                Generate a plan to see your
                onboarding roadmap.
              </p>
            )}
          </div>
        </section>


        {/* ================================
            TASK LIST
            ================================ */}
        <section
          className="plan-tasks"
          aria-label="Onboarding tasks"
        >
          <h2>Task List</h2>

          <p className="plan-subtext">
            Loaded from your saved task list.
          </p>

          {planStatus ? (
            <p className="plan-subtext">
              {planStatus}
            </p>
          ) : null}

          {taskError ? (
            <p className="plan-subtext">
              {taskError}
            </p>
          ) : null}

          {loadingTasks ? (
            <p className="plan-subtext">
              Loading tasks...
            </p>
          ) : null}

          <div className="task-columns">

            {/* Pending Tasks */}
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
                        onChange={() =>
                          void completeTask(task.id)
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

                {!loadingTasks &&
                pendingTasks.length === 0 ? (
                  <p className="plan-subtext">
                    No pending tasks yet.
                  </p>
                ) : null}
              </div>
            </section>


            {/* Completed Tasks */}
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
                      Completed:{' '}
                      {task.completedOn}
                    </span>

                    <button
                      type="button"
                      className="completed-action-button"
                      onClick={() =>
                        moveToPending(task.id)
                      }
                    >
                      Mark as Pending
                    </button>
                  </article>
                ))}

                {!loadingTasks &&
                completedTasks.length === 0 ? (
                  <p className="plan-subtext">
                    No completed tasks yet.
                  </p>
                ) : null}
              </div>
            </section>

          </div>
        </section>


        {/* ================================
            ASSISTANT CHAT
            ================================ */}
        <section
          className="plan-chat"
          aria-label="AI chat panel"
        >
          <h2>Assistant Chat</h2>

          <div
            className="chat-window"
            role="log"
            aria-live="polite"
          >
            {chatMessages.length === 0 ? (
              <p className="chat-empty-state">
                Chat messages will appear here.
              </p>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={`${message.sender}-${index}`}
                  className={`chat-message ${message.sender}`}
                >
                  {message.text}
                </div>
              ))
            )}
          </div>

          {chatError ? (
            <p className="plan-subtext chat-error">
              {chatError}
            </p>
          ) : null}

          <form
            className="chat-input-row"
            onSubmit={handleAsk}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(event) =>
                setChatInput(event.target.value)
              }
              placeholder="Ask a question..."
              aria-label="Ask the assistant"
              disabled={isAsking}
            />

            <div className="chat-button-row">
              <button
                type="button"
                disabled={
                  isGeneratingPlan || isAsking
                }
                onClick={() =>
                  void handleGeneratePlan()
                }
              >
                {isGeneratingPlan
                  ? 'Planning...'
                  : 'Plan'}
              </button>

              <button
                type="submit"
                disabled={isAsking}
              >
                {isAsking ? 'Asking...' : 'Ask'}
              </button>
            </div>
          </form>
        </section>

      </main>
    </section>
  )
}

export default PlanRoute