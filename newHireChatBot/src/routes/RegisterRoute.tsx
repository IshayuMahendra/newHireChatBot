import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './Register.css'

type RegisterResult = {
  ok: boolean
  message: string
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function mockRegister(
  username: string,
  password: string,
  role: string,
  department: string,
): Promise<RegisterResult> {
  await wait(700)

  if (!username.trim() || !password.trim() || !role.trim() || !department.trim()) {
    return { ok: false, message: 'Please complete all fields before registering.' }
  }

  if (username.toLowerCase() === 'taken') {
    return { ok: false, message: 'That username is already taken. Try another one.' }
  }

  return { ok: true, message: 'Temporary registration successful. Redirecting to plan...' }
}

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

    const result = await mockRegister(username, password, role, department)

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
          Create your new hire account. This is temporary until backend APIs are connected.
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
