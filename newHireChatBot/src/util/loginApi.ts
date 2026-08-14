export type LoginResult = {
  ok: boolean
  message: string
  userId?: number
}

type LoginPayload = {
  username: string
  password: string
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
      id?: number
    }

    if (!response.ok || !body.authenticated) {
      return {
        ok: false,
        message: body.error ?? body.message ?? 'Login failed. Please try again.',
      }
    }

    return {
      ok: true,
      message: body.message ?? 'Login successful. Redirecting to plan...',
      userId: body.id,
    }
  } catch {
    return {
      ok: false,
      message: 'Could not reach the server. Make sure the API is running on port 3001.',
    }
  }
}