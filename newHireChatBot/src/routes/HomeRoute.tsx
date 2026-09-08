import { useNavigate } from 'react-router-dom'
import './Home.css'

type HomeRouteProps = {
  loggedIn: boolean
  isManager: boolean
  onSignOut: () => void
}

function HomeRoute({
  loggedIn,
  isManager,
  onSignOut,
}: HomeRouteProps) {
  const navigate = useNavigate()

  function handleSignOut() {
    onSignOut()
    navigate('/')
  }

  return (
    <section className="landing-shell">
      {loggedIn ? (
        <button type="button" className="theme-toggle" onClick={handleSignOut}>
          Sign Out
        </button>
      ) : null}
      <h1 className="landing-kicker">ADP Onboarding Assistant</h1>
      <main className="landing-card">
        <h2>Welcome to New Hire ChatBot</h2>
        <p className="landing-subtext">
          Start your onboarding journey with role-specific guidance, a first-week checklist,
          and a personalized plan.
        </p>

        <div className="landing-actions" aria-label="Landing actions">
          {loggedIn ? (
            <>
              {isManager ? (
                <button type="button" onClick={() => navigate('/team')}>
                  Team
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => navigate('/plan')}>
                    Plan
                  </button>
                  <button type="button" onClick={() => navigate('/dashboard')}>
                    Dashboard
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={() => navigate('/login')}>
                Login
              </button>
              <button type="button" onClick={() => navigate('/register')}>
                Register
              </button>
            </>
          )}
        </div>
      </main>
    </section>
  )
}

export default HomeRoute
