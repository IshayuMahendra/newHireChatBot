import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import HomeRoute from './routes/HomeRoute.tsx'
import LoginRoute from './routes/LoginRoute.tsx'
import RegisterRoute from './routes/RegisterRoute.tsx'
import PlanRoute from './routes/PlanRoute.tsx'
import TeamRoute from './routes/TeamRoute.tsx'
import DashboardRoute from './routes/DashboardRoute.tsx'

type AuthSession = {
  username: string
  userId?: number
  role: string
  department: string
  token?: string
  userType?: string
}

const SESSION_STORAGE_KEY = 'newHireChatBot.session'

const EMPTY_SESSION: AuthSession = {
  username: '',
  userId: undefined,
  role: '',
  department: '',
  token: '',
  userType: '',
}

function hasValidSessionToken(token?: string): boolean {
  if (!token) {
    return false
  }

  try {
    const { exp } = jwtDecode<{ exp?: number }>(token)
    return typeof exp === 'number' && exp * 1000 > Date.now()
  } catch {
    return false
  }
}

function App() {
  const [session, setSession] = useState<AuthSession>(() => {
    try {
      const storedValue = localStorage.getItem(SESSION_STORAGE_KEY)

      if (!storedValue) {
        return EMPTY_SESSION
      }

      const parsed = JSON.parse(storedValue) as Partial<AuthSession>

      return {
        username: parsed.username ?? '',
        userId: parsed.userId,
        role: parsed.role ?? '',
        department: parsed.department ?? '',
        token: parsed.token ?? '',
        userType: parsed.userType ?? '',
      }
    } catch {
      return EMPTY_SESSION
    }
  })

  const isAuthenticated = hasValidSessionToken(session.token)

  const isManager = session.userType === 'manager'

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
      return
    }

    localStorage.removeItem(SESSION_STORAGE_KEY)
  }, [isAuthenticated, session])

  function clearSession() {
    setSession(EMPTY_SESSION)
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <HomeRoute
              loggedIn={isAuthenticated}
              isManager={isManager}
              onSignOut={() => {
                clearSession()
              }}
            />
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/plan" replace />
            ) : (
              <LoginRoute
                onLoginSuccess={(
                  nextUsername,
                  nextUserId,
                  nextRole,
                  nextDepartment,
                  nextToken,
                  nextUserType,
                ) => {
                  setSession({
                    username: nextUsername,
                    userId: nextUserId,
                    role: nextRole,
                    department: nextDepartment,
                    token: nextToken ?? '',
                    userType: nextUserType ?? nextRole,
                  })
                }}
              />
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/plan" replace />
            ) : (
              <RegisterRoute
                onRegisterSuccess={(
                  nextUsername,
                  nextUserId,
                  nextRole,
                  nextDepartment,
                  nextToken,
                  nextUserType,
                ) => {
                  setSession({
                    username: nextUsername,
                    userId: nextUserId,
                    role: nextRole,
                    department: nextDepartment,
                    token: nextToken ?? '',
                    userType: nextUserType ?? nextRole,
                  })
                }}
              />
            )
          }
        />
        <Route
          path="/team"
          element={
            isAuthenticated && isManager ? (
              <TeamRoute
                currentUser={session.username || 'Manager'}
                userRole={session.role}
                token={session.token ?? ''}
              />
            ) : isAuthenticated ? (
              <Navigate to="/plan" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <DashboardRoute
                username={session.username}
                userId={session.userId}
                role={session.role}
                department={session.department}
                token={session.token ?? ''}
                canManageDashboard={isManager}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/plan"
          element={
            isAuthenticated ? (
              <PlanRoute
                username={session.username}
                userId={session.userId}
                role={session.role}
                department={session.department}
                token={session.token ?? ''}
                canManageTasks={isManager}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
