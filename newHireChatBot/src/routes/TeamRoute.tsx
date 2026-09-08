import { useNavigate } from 'react-router-dom'
import './Team.css'

type TeamUser = {
  id: number
  name: string
  role: string
  department: string
  hasOpenFlag: boolean
}

type TeamRouteProps = {
  currentUser: string
  userRole: string
}

const mockUsers: TeamUser[] = [
  { id: 101, name: 'Ava Patel', role: 'Software Engineer', department: 'Engineering', hasOpenFlag: true },
  { id: 102, name: 'Marcus Lee', role: 'Payroll Specialist', department: 'Finance', hasOpenFlag: false },
  { id: 103, name: 'Nina Gomez', role: 'HR Associate', department: 'People Ops', hasOpenFlag: true },
  { id: 104, name: 'Daniel Brooks', role: 'Product Analyst', department: 'Product', hasOpenFlag: false },
  { id: 105, name: 'Chloe Nguyen', role: 'Operations Coordinator', department: 'Operations', hasOpenFlag: false },
  { id: 106, name: 'Ethan Wilson', role: 'Software Engineer', department: 'Engineering', hasOpenFlag: true },
  { id: 107, name: 'Priya Singh', role: 'Data Analyst', department: 'Analytics', hasOpenFlag: false },
  { id: 108, name: 'Omar Hassan', role: 'Customer Support Specialist', department: 'Support', hasOpenFlag: false },
  { id: 109, name: 'Lena Morris', role: 'Business Analyst', department: 'Business Ops', hasOpenFlag: true },
  { id: 110, name: 'Isaac Moore', role: 'QA Engineer', department: 'Engineering', hasOpenFlag: false },
]

function TeamRoute({ currentUser, userRole }: TeamRouteProps) {
  const navigate = useNavigate()

  return (
    <section className="team-shell">
      <header className="team-header">
        <div>
          <p className="team-eyebrow">Manager View</p>
          <h1>{currentUser} Team</h1>
        </div>

        <div className="team-header-actions">
          <button type="button" className="team-action" onClick={() => navigate('/plan')}>
            My Plan
          </button>
          <button type="button" className="team-action secondary" onClick={() => navigate('/')}>
            Home
          </button>
        </div>
      </header>

      <main className="team-panel">
        <div className="team-panel-header">
          <h2>New Hires</h2>
          <span className="team-role-badge">{userRole}</span>
        </div>

        <div className="team-grid" aria-label="New hire team list">
          {mockUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              className={`team-card ${user.hasOpenFlag ? 'flagged' : ''}`}
              onClick={() => navigate('/plan')}
            >
              <div className="team-card-top">
                <span className="team-user-name">{user.name}</span>
                <span className={`team-flag ${user.hasOpenFlag ? 'open' : 'clear'}`}>
                  {user.hasOpenFlag ? 'Open flag' : 'No flag'}
                </span>
              </div>

              <dl className="team-meta">
                <div>
                  <dt>ID</dt>
                  <dd>{user.id}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{user.role}</dd>
                </div>
                <div>
                  <dt>Department</dt>
                  <dd>{user.department}</dd>
                </div>
              </dl>
            </button>
          ))}
        </div>
      </main>
    </section>
  )
}

export default TeamRoute
