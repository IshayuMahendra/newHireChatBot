import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../util/registerApi.ts'
import './Register.css'

function RegisterRoute() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setStatusMessage('')

    const result = await registerUser(username, password, role, department)

    setIsSubmitting(false)
    setStatusMessage(result.message)
    setIsError(!result.ok)

    if (result.ok) {
      sessionStorage.setItem('nhcb-authenticated', 'true')
      sessionStorage.setItem(
        'nhcb-profile',
        JSON.stringify({ username, role, department }),
      )

      setTimeout(() => {
        navigate('/plan')
      }, 700)
    }
  }

  return (
    <section className="register-page">
      <main className="register-panel">
        <h1>Register</h1>
        <p className="register-help">
          Create your new hire account.
        </p>

        <form className="register-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Choose a username"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
          />

          <label htmlFor="role">Role</label>
          <input
            id="role"
            type="text"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="Example: Software Engineer"
          />

          <label htmlFor="department">Department</label>
          <input
            id="department"
            type="text"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            placeholder="Example: Engineering"
          />

          <div className="register-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register'}
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

export default RegisterRoute
