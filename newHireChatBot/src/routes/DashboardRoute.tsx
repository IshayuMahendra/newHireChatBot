import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import './Dashboard.css'

type DashboardRouteProps = {
  username: string
  userId?: number
  role: string
  department: string
  token: string
  canManageDashboard: boolean
}

type ActivityEvent = {
  id: number
  type: string
  detail: string
  timestamp: string
}

type ApiTask = { text: string; completed?: boolean }
type SelectedUser = { id: number; username: string; role: string; department: string }

type Milestone = {
  label: string
  description: string
  status: 'complete' | 'active' | 'upcoming'
}

const API_BASE_URL = 'http://localhost:3001'

function formatEventType(type: string): string {
  return type
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString()
}

function getTaskPhase(taskText: string): string {
  const match = taskText.match(/^\[(.+?)\]/)
  return match?.[1]?.trim() ?? 'Task'
}

function DashboardRoute({
  username,
  userId,
  role,
  department,
  token,
  canManageDashboard,
}: DashboardRouteProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const selectedUser = (location.state as { selectedUser?: SelectedUser } | null)
    ?.selectedUser
  const selectedUserId = Number(searchParams.get('userId'))
  const targetUserId = canManageDashboard
    && Number.isInteger(selectedUserId)
    && selectedUserId > 0
    ? selectedUserId
    : userId
  const [tasks, setTasks] = useState<ApiTask[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!targetUserId) {
      setError('No user loaded. Please log in again.')
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function loadDashboard() {
      setIsLoading(true)
      setError('')
      const headers = { Authorization: `Bearer ${token}` }

      try {
        const [tasksResponse, activityResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/users/${targetUserId}/tasks`, { headers }),
          fetch(`${API_BASE_URL}/users/${targetUserId}/activity`, { headers }),
        ])

        if (!tasksResponse.ok || !activityResponse.ok) {
          throw new Error('Could not load dashboard data from the server.')
        }

        const [nextTasks, nextActivity] = await Promise.all([
          tasksResponse.json() as Promise<ApiTask[]>,
          activityResponse.json() as Promise<ActivityEvent[]>,
        ])

        if (!cancelled) {
          setTasks(nextTasks)
          setActivity(nextActivity)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load dashboard data.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [targetUserId, token])

  const completedTasks = tasks.filter((task) => task.completed).length
  const totalTasks = tasks.length
  const completionPercent = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0
  const displayUser = selectedUser ?? {
    username,
    role,
    department,
  }
  const planPath = targetUserId && canManageDashboard
    ? `/plan?userId=${targetUserId}`
    : '/plan'
  const milestoneDefinitions = [
    { label: 'Week 1', phases: ['Week 1'] },
    { label: 'Weeks 2-4', phases: ['Weeks 2-4', 'Week 2-4'] },
    { label: 'First 30 Days', phases: ['Day 30', '30 Days'] },
    { label: 'Days 31-60', phases: ['Day 60', '60 Days'] },
    { label: 'Days 61-90', phases: ['Day 90', '90 Days'] },
  ]
  let hasActiveMilestone = false
  const milestones: Milestone[] = milestoneDefinitions.map((milestone) => {
    const phaseTasks = tasks.filter((task) => milestone.phases.includes(getTaskPhase(task.text)))
    const completedPhaseTasks = phaseTasks.filter((task) => task.completed).length
    const isComplete = phaseTasks.length > 0 && completedPhaseTasks === phaseTasks.length
    const status = isComplete
      ? 'complete'
      : !hasActiveMilestone && phaseTasks.length > 0
        ? 'active'
        : 'upcoming'

    if (status === 'active') {
      hasActiveMilestone = true
    }

    return {
      label: milestone.label,
      description: phaseTasks.length
        ? `${completedPhaseTasks} of ${phaseTasks.length} tasks complete`
        : 'No tasks assigned yet',
      status,
    }
  })

  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Progress Dashboard</p>
          <h1>{displayUser.username || 'New Hire'} Onboarding</h1>
          <p>{displayUser.role} · {displayUser.department}</p>
        </div>
        <button type="button" onClick={() => navigate('/')}>
          Home
        </button>
      </header>

      <main className="dashboard-content">
        <section className="dashboard-summary" aria-label="Task completion summary">
          <div>
            <p className="dashboard-label">Task Completion</p>
            <strong>{completedTasks} of {totalTasks}</strong>
            <span>tasks complete</span>
          </div>
          <div className="completion-ring" style={{ '--completion': `${completionPercent}%` } as React.CSSProperties}>
            <span>{completionPercent}%</span>
          </div>
        </section>

        <section className="dashboard-section" aria-label="Onboarding milestones">
          <div className="dashboard-section-heading">
            <h2>Milestones</h2>
            <button type="button" onClick={() => navigate(planPath)}>View Plan</button>
          </div>
          <div className="milestone-list">
            {milestones.map((milestone, index) => (
              <article key={milestone.label} className={`milestone ${milestone.status}`}>
                <span>{index + 1}</span>
                <div>
                  <strong>{milestone.label}</strong>
                  <p>{milestone.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-section" aria-label="Activity timeline">
          <h2>Activity</h2>
          <ol className="activity-list">
            {activity.map((event) => (
              <li key={event.id}>
                <span className="activity-dot" aria-hidden="true" />
                <div>
                  <strong>{formatEventType(event.type)}</strong>
                  <p>{event.detail}</p>
                  <time>{formatTimestamp(event.timestamp)}</time>
                </div>
              </li>
            ))}
            {isLoading ? <li>Loading activity...</li> : null}
            {!isLoading && !error && activity.length === 0 ? (
              <li>No activity recorded yet.</li>
            ) : null}
            {error ? <li>{error}</li> : null}
          </ol>
        </section>
      </main>
    </section>
  )
}

export default DashboardRoute