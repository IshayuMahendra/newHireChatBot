import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../util/registerApi.ts'
import './Register.css'

type RegisterRouteProps = {
  onRegisterSuccess: (
    username: string,
    userId: number | undefined,
    role: string,
    department: string,
  ) => void
}

function RegisterRoute({ onRegisterSuccess }: RegisterRouteProps) {
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
      onRegisterSuccess(
        username.trim(),
        result.userId,
        result.role?.trim() ?? role.trim(),
        result.department?.trim() ?? department.trim(),
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
            autoComplete="off"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
            autoComplete="off"
          />

          <label htmlFor="role">Role</label>
          <input
            id="role"
            type="text"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="Example: Software Engineer"
            autoComplete="off"
          />

          <label htmlFor="department">Department</label>
          <input
            id="department"
            type="text"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            placeholder="Example: Engineering"
            autoComplete="off"
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
