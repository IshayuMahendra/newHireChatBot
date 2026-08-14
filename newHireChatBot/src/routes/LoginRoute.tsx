import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../util/loginApi.ts'
import './Login.css'

function LoginRoute() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setStatusMessage('')

    const result = await loginUser(username, password)

    setIsSubmitting(false)
    setStatusMessage(result.message)
    setIsError(!result.ok)

    if (result.ok) {
      sessionStorage.setItem('nhcb-authenticated', 'true')
      sessionStorage.setItem(
        'nhcb-profile',
        JSON.stringify({ username: username.trim(), id: result.userId ?? null }),
      )

      setTimeout(() => {
        navigate('/plan')
      }, 700)
    }
  }

  return (
    <section className="login-page">
      <main className="login-panel">
        <h1>Login</h1>
        <p className="login-help">Sign in with your registered username and password.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter username"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
          />

          <div className="login-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Login'}
            </button>
            <button type="button" className="secondary" onClick={() => navigate('/')}>
              Back to Home
            </button>
          </div>

          {statusMessage ? (
            <p className={isError ? 'status error' : 'status success'}>{statusMessage}</p>
          ) : null}
        </form>
      </main>
    </section>
  )
}

export default LoginRoute
