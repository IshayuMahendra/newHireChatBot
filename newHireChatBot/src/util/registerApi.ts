import { jwtDecode } from 'jwt-decode'

export type RegisterResult = {
  ok: boolean
  message: string
  userId?: number
  role?: string
  department?: string
  token?: string
  userType?: string
}

type RegisterPayload = {
  username: string
  password: string
  role: string
  department: string
}

type SessionClaims = {
  id: number
  username: string
  userType?: string
  role: string
  department: string
  exp?: number
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

    const body = (await response.json()) as {
      token?: string
      jwt?: string
    }

    const token = body.token ?? body.jwt

    if (!token) {
      return {
        ok: false,
        message: 'The server did not return an authentication token.',
      }
    }

    try {
      const claims = jwtDecode<SessionClaims>(token)

      if (
        !Number.isInteger(claims.id) ||
        !claims.username ||
        !claims.role ||
        !claims.department ||
        (claims.exp !== undefined && claims.exp * 1000 <= Date.now())
      ) {
        return {
          ok: false,
          message: 'The server returned an invalid or expired authentication token.',
        }
      }

      return {
        ok: true,
        message: 'Registration successful. Redirecting to your plan...',
        userId: claims.id,
        role: claims.role,
        department: claims.department,
        token,
        userType: claims.userType ?? 'new_hire',
      }
    } catch {
      return {
        ok: false,
        message: 'The server returned an invalid authentication token.',
      }
    }
  } catch {
    return {
      ok: false,
      message: 'Could not reach the server. Make sure the API is running on port 3001.',
    }
  }
}