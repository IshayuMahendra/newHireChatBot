import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTeamUsers } from '../util/teamApi'
import './Team.css'

type TeamUser = {
  _id: string
  id: number
  username: string
  role: string
  department: string
  userType: string
  plan30Day?: string
  plan60Day?: string
  plan90Day?: string
  hasOpenFlag: boolean
}

type TeamRouteProps = {
  currentUser: string
  userRole: string
  token: string
}

function TeamRoute({ currentUser, userRole, token }: TeamRouteProps) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<TeamUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true)
      setError('')

      const result = await getTeamUsers(token)

      if (!result.ok) {
        setError(result.message)
        setUsers([])
      } else {
        setUsers(result.users)
      }

      setIsLoading(false)
    }

    void loadUsers()
  }, [token])

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
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className={`team-card ${user.hasOpenFlag ? 'flagged' : ''}`}
              onClick={() => navigate('/plan', { state: { selectedUser: user } })}
            >
              <div className="team-card-top">
                <span className="team-user-name">{user.username}</span>
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

          {isLoading ? (
            <p className="team-message">Loading new hires...</p>
          ) : null}

          {error ? <p className="team-message">{error}</p> : null}

          {!isLoading && !error && users.length === 0 ? (
            <p className="team-message">No new hires found.</p>
          ) : null}
        </div>
      </main>
    </section>
  )
}

export default TeamRoute
