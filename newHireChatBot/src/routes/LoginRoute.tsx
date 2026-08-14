import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

type LoginResult = {
  ok: boolean
  message: string
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function mockLogin(username: string, password: string): Promise<LoginResult> {
  await wait(600)

  if (!username.trim() || !password.trim()) {
    return { ok: false, message: 'Please enter both username and password.' }
  }

  if (username.toLowerCase() === 'error' || password.toLowerCase() === 'wrong') {
    return { ok: false, message: 'Invalid credentials. Try a different value.' }
  }

  return { ok: true, message: 'Temporary login successful.' }
}

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

    const result = await mockLogin(username, password)

    setIsSubmitting(false)
    setStatusMessage(result.message)
    setIsError(!result.ok)

    if (result.ok) {
      setTimeout(() => {
        navigate('/')
      }, 700)
    }
  }

  return (
    <section className="login-page">
      <main className="login-panel">
        <h1>Login</h1>
        <p className="login-help">Use temporary values for now while backend endpoints are pending.</p>

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
