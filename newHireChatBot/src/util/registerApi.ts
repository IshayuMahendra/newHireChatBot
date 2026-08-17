export type RegisterResult = {
  ok: boolean
  message: string
  userId?: number
  role?: string
  department?: string
}

type RegisterPayload = {
  username: string
  password: string
  role: string
  department: string
}

const API_BASE_URL = 'http://localhost:3001'

export async function registerUser(
  username: string,
  password: string,
  role: string,
  department: string,
): Promise<RegisterResult> {
  const payload: RegisterPayload = {
    username: username.trim(),
    password: password.trim(),
    role: role.trim(),
    department: department.trim(),
  }

  if (!payload.username || !payload.password || !payload.role || !payload.department) {
    return { ok: false, message: 'Please complete all fields before registering.' }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let serverMessage = 'Registration failed. Please try again.'

      try {
        const errorBody = (await response.json()) as { error?: string; message?: string }
        serverMessage = errorBody.error ?? errorBody.message ?? serverMessage
      } catch {
        // Keep fallback message when no JSON body is available.
      }

      return { ok: false, message: serverMessage }
    }

    const body = (await response.json()) as { id?: number }

    return {
      ok: true,
      message: 'Registration successful. Redirecting to your plan...',
      userId: body.id,
      role: payload.role,
      department: payload.department,
    }
  } catch {
    return {
      ok: false,
      message: 'Could not reach the server. Make sure the API is running on port 3001.',
    }
  }
}