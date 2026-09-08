type TeamUser = {
  _id: string
  id: number
  username: string
  role: string
  department: string
  userType: string
  plan30Day?: string
  plan60Day?: string
  plan90Day?: string
  hasOpenFlag: boolean
  flags: Flag[]
}

type ApiUser = Omit<TeamUser, 'hasOpenFlag'>

type Flag = {
  id: number
  userId: string
  reason: string
  resolved: boolean
}

type TeamUsersResult = {
  ok: boolean
  message: string
  users: TeamUser[]
}

const API_BASE_URL = 'http://localhost:3001'

export async function getTeamUsers(token: string): Promise<TeamUsersResult> {
  if (!token) {
    return {
      ok: false,
      message: 'Your session is missing an authentication token.',
      users: [],
    }
  }

  try {
    const headers = { Authorization: `Bearer ${token}` }
    const [usersResponse, flagsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/users`, { headers }),
      fetch(`${API_BASE_URL}/flags`, { headers }),
    ])

    if (!usersResponse.ok || !flagsResponse.ok) {
      return {
        ok: false,
        message: 'Could not load new hires and flags from the server.',
        users: [],
      }
    }

    const [users, flags] = await Promise.all([
      usersResponse.json() as Promise<ApiUser[]>,
      flagsResponse.json() as Promise<Flag[]>,
    ])
    const userIdsWithOpenFlags = new Set(
      flags
        .filter((flag) => !flag.resolved)
        .map((flag) => String(flag.userId)),
    )

    return {
      ok: true,
      message: '',
      users: users
        .filter((user) => user.userType === 'new_hire')
        .map((user) => ({
          ...user,
          hasOpenFlag: userIdsWithOpenFlags.has(String(user._id)),
          flags: flags.filter((flag) => String(flag.userId) === String(user._id)),
        })),
    }
  } catch {
    return {
      ok: false,
      message: 'Could not reach the server. Make sure the API is running on port 3001.',
      users: [],
    }
  }
}

export async function updateFlagResolution(
  token: string,
  flagId: number,
  resolved: boolean,
): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/flags/${flagId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resolved }),
    })

    if (!response.ok) {
      const body = (await response.json()) as { error?: string }

      return {
        ok: false,
        message: body.error ?? 'Could not update the flag status.',
      }
    }

    return { ok: true, message: '' }
  } catch {
    return {
      ok: false,
      message: 'Could not reach the server. Make sure the API is running on port 3001.',
    }
  }
}