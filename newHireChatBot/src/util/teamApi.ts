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
}

type ApiUser = Omit<TeamUser, 'hasOpenFlag'>

type Flag = {
  userId: string
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