import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { askAssistant } from '../util/askApi.ts'
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

function PlanRoute({ username, userId, role, department }: PlanRouteProps) {
  const navigate = useNavigate()
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [taskError, setTaskError] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>(
    [],
  )
  const [isAsking, setIsAsking] = useState(false)
  const [chatError, setChatError] = useState('')

  useEffect(() => {
    if (!userId) {
      setPendingTasks([])
      setCompletedTasks([])
      setLoadingTasks(false)
      setTaskError('No user loaded. Please log in again.')
      return
    }

    let isMounted = true

    async function loadTasks() {
      setLoadingTasks(true)
      setTaskError('')

      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/tasks`)
        if (!response.ok) {
          setPendingTasks([])
          setCompletedTasks([])
          setTaskError('Could not load tasks from the server.')
          setLoadingTasks(false)
          return
        }

        const tasks = (await response.json()) as ApiTask[]
        if (!isMounted) {
          return
        }

        const nextPending: PendingTask[] = tasks
          .filter((task) => !task.completed)
          .map((task) => ({
            id: task.id,
            title: `Task #${task.id}`,
            text: task.text,
            due: 'Pending',
          }))

        const nextCompleted: CompletedTask[] = tasks
          .filter((task) => Boolean(task.completed))
          .map((task) => ({
            id: task.id,
            title: `Task #${task.id}`,
            text: task.text,
            due: 'Completed',
            completedOn: formatCompletedDate(task.createdAt),
          }))

        setPendingTasks(nextPending)
        setCompletedTasks(nextCompleted)
      } catch {
        if (!isMounted) {
          return
        }

        setPendingTasks([])
        setCompletedTasks([])
        setTaskError('Could not load tasks from the server.')
      } finally {
        if (isMounted) {
          setLoadingTasks(false)
        }
      }
    }

    loadTasks()

    return () => {
      isMounted = false
    }
  }, [userId])

  async function completeTask(taskId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        setTaskError('Could not update task status in the server.')
        return
      }

      setTaskError('')
      moveToCompleted(taskId, new Date().toISOString())
    } catch {
      setTaskError('Could not update task status in the server.')
    }
  }

  function moveToCompleted(taskId: number, completedAtIso: string) {
    setPendingTasks((currentPending) => {
      const taskToMove = currentPending.find((task) => task.id === taskId)
      if (!taskToMove) {
        return currentPending
      }

      setCompletedTasks((currentCompleted) => [
        {
          ...taskToMove,
          completedOn: formatCompletedDate(completedAtIso),
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

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedPrompt = chatInput.trim()
    if (!trimmedPrompt) {
      setChatError('Please enter a question before asking.')
      return
    }

    setChatError('')
    setIsAsking(true)
    setChatInput('')

    setChatMessages((currentMessages) => [
      ...currentMessages,
      { sender: 'user', text: trimmedPrompt },
    ])

    const result = await askAssistant(role, department, trimmedPrompt)

    setIsAsking(false)

    if (!result.ok || !result.response) {
      setChatError(result.message)
      return
    }

    setChatMessages((currentMessages) => [
      ...currentMessages,
      { sender: 'assistant', text: result.response ?? '' },
    ])
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
          <p className="plan-subtext">Loaded from your saved task list.</p>
          {taskError ? <p className="plan-subtext">{taskError}</p> : null}
          {loadingTasks ? <p className="plan-subtext">Loading tasks...</p> : null}

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
                        onChange={() => void completeTask(task.id)}
                        aria-label={`Mark ${task.title} complete`}
                      />
                      <span>{task.title}</span>
                    </label>
                    <p>{task.text}</p>
                    <span className="task-due">Due: {task.due}</span>
                  </article>
                ))}
                {!loadingTasks && pendingTasks.length === 0 ? (
                  <p className="plan-subtext">No pending tasks yet.</p>
                ) : null}
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
                {!loadingTasks && completedTasks.length === 0 ? (
                  <p className="plan-subtext">No completed tasks yet.</p>
                ) : null}
              </div>
            </section>
          </div>
        </section>

        <section className="plan-chat" aria-label="AI chat panel">
          <h2>Assistant Chat</h2>
          <div className="chat-window" role="log" aria-live="polite">
            {chatMessages.length === 0 ? (
              <p className="chat-empty-state">Chat messages will appear here.</p>
            ) : (
              chatMessages.map((message, index) => (
                <div key={`${message.sender}-${index}`} className={`chat-message ${message.sender}`}>
                  {message.text}
                </div>
              ))
            )}
          </div>

          {chatError ? <p className="plan-subtext chat-error">{chatError}</p> : null}

          <form className="chat-input-row" onSubmit={handleAsk}>
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask a question..."
              aria-label="Ask the assistant"
              disabled={isAsking}
            />
            <div className="chat-button-row">
              <button type="button" disabled={isAsking}>
                Plan
              </button>
              <button type="submit" disabled={isAsking}>
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
