import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import HomeRoute from './routes/HomeRoute.tsx'
import LoginRoute from './routes/LoginRoute.tsx'
import RegisterRoute from './routes/RegisterRoute.tsx'
import PlanRoute from './routes/PlanRoute.tsx'

function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [userId, setUserId] = useState<number | undefined>(undefined)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <HomeRoute
              loggedIn={loggedIn}
              onSignOut={() => {
                setLoggedIn(false)
                setUsername('')
                setUserId(undefined)
              }}
            />
          }
        />
        <Route
          path="/login"
          element={
            loggedIn ? (
              <Navigate to="/plan" replace />
            ) : (
              <LoginRoute
                onLoginSuccess={(nextUsername, nextUserId) => {
                  setLoggedIn(true)
                  setUsername(nextUsername)
                  setUserId(nextUserId)
                }}
              />
            )
          }
        />
        <Route
          path="/register"
          element={
            loggedIn ? (
              <Navigate to="/plan" replace />
            ) : (
              <RegisterRoute
                onRegisterSuccess={(nextUsername, nextUserId) => {
                  setLoggedIn(true)
                  setUsername(nextUsername)
                  setUserId(nextUserId)
                }}
              />
            )
          }
        />
        <Route
          path="/plan"
          element={
            loggedIn ? (
              <PlanRoute username={username} userId={userId} />
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
