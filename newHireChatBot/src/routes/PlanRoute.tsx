import { useNavigate } from 'react-router-dom'

function PlanRoute() {
  const navigate = useNavigate()
  const rawProfile = sessionStorage.getItem('nhcb-profile')

  let profileText = 'No profile loaded.'

  if (rawProfile) {
    try {
      const parsed = JSON.parse(rawProfile) as {
        username?: string
        role?: string
        department?: string
      }

      profileText = `${parsed.username ?? 'New hire'} | ${parsed.role ?? 'Role pending'} | ${parsed.department ?? 'Department pending'}`
    } catch {
      profileText = 'Profile data could not be read.'
    }
  }

  return (
    <section className="register-page">
      <main className="register-panel">
        <h1>Plan</h1>
        <p className="register-help">
          Temporary plan placeholder route. Registration currently routes you here as required.
        </p>
        <p className="register-help">{profileText}</p>

        <div className="register-actions" style={{ marginTop: '14px' }}>
          <button type="button" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </main>
    </section>
  )
}

export default PlanRoute
