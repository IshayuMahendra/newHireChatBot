import { jwtDecode } from 'jwt-decode'

export type LoginResult = {
  ok: boolean
  message: string
  userId?: number
  role?: string
  department?: string
  token?: string
  userType?: string
}

type LoginPayload = {
  username: string
  password: string
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

export async function loginUser(
  username: string,
  password: string,
): Promise<LoginResult> {
  const payload: LoginPayload = {
    username: username.trim(),
    password: password.trim(),
  }

  if (!payload.username || !payload.password) {
    return { ok: false, message: 'Please enter both username and password.' }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const body = (await response.json()) as {
      authenticated?: boolean
      message?: string
      error?: string
      token?: string
      jwt?: string
    }

    if (!response.ok || !body.authenticated) {
      return {
        ok: false,
        message: body.error ?? body.message ?? 'Login failed. Please try again.',
      }
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
        message: body.message ?? 'Login successful. Redirecting to plan...',
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