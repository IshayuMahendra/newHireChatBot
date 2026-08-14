import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggleButton from '../components/ThemeToggleButton.tsx'
import './Home.css'

function HomeRoute() {
  const [mode, setMode] = useState<'dark' | 'light'>('dark')
  const navigate = useNavigate()

  function handleToggleTheme() {
    setMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'))
  }

  return (
    <section className={`landing-shell ${mode === 'light' ? 'landing-shell-light' : ''}`}>
      <ThemeToggleButton mode={mode} onToggle={handleToggleTheme} />
      <h1 className="landing-kicker">ADP Onboarding Assistant</h1>
      <main className="landing-card">
        <h2>Welcome to New Hire ChatBot</h2>
        <p className="landing-subtext">
          Start your onboarding journey with role-specific guidance, a first-week checklist,
          and a personalized plan.
        </p>

        <div className="landing-actions" aria-label="Landing actions">
          <button type="button" onClick={() => navigate('/plan')}>
            Plan
          </button>
          <button type="button" onClick={() => navigate('/login')}>
            Login
          </button>
          <button type="button" onClick={() => navigate('/register')}>
            Register
          </button>
        </div>
      </main>
    </section>
  )
}

export default HomeRoute
