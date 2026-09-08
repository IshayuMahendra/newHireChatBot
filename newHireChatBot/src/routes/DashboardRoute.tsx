import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

type DashboardRouteProps = {
  username: string
  role: string
  department: string
}

type ActivityEvent = {
  id: number
  type: 'Task completed' | 'Plan updated' | 'Task added'
  detail: string
  timestamp: string
}

const mockActivity: ActivityEvent[] = [
  {
    id: 1,
    type: 'Task completed',
    detail: 'Completed your account and equipment setup.',
    timestamp: 'Today, 9:42 AM',
  },
  {
    id: 2,
    type: 'Plan updated',
    detail: 'Your first-30-days onboarding plan was created.',
    timestamp: 'Yesterday, 2:15 PM',
  },
  {
    id: 3,
    type: 'Task added',
    detail: 'Added your team introduction task.',
    timestamp: 'Yesterday, 2:14 PM',
  },
]

function DashboardRoute({
  username,
  role,
  department,
}: DashboardRouteProps) {
  const navigate = useNavigate()
  const completedTasks = 3
  const totalTasks = 8
  const completionPercent = Math.round((completedTasks / totalTasks) * 100)

  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Progress Dashboard</p>
          <h1>{username || 'New Hire'} Onboarding</h1>
          <p>{role} · {department}</p>
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
            <button type="button" onClick={() => navigate('/plan')}>View Plan</button>
          </div>
          <div className="milestone-list">
            <article className="milestone complete">
              <span>1</span>
              <div><strong>Get set up</strong><p>Accounts and equipment are ready.</p></div>
            </article>
            <article className="milestone active">
              <span>2</span>
              <div><strong>Build team context</strong><p>Meet your manager and key partners.</p></div>
            </article>
            <article className="milestone">
              <span>3</span>
              <div><strong>First 30 days</strong><p>Grow into your role and core responsibilities.</p></div>
            </article>
          </div>
        </section>

        <section className="dashboard-section" aria-label="Activity timeline">
          <h2>Activity</h2>
          <ol className="activity-list">
            {mockActivity.map((event) => (
              <li key={event.id}>
                <span className="activity-dot" aria-hidden="true" />
                <div><strong>{event.type}</strong><p>{event.detail}</p><time>{event.timestamp}</time></div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </section>
  )
}

export default DashboardRoute