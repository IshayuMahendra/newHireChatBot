import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomeRoute from './routes/HomeRoute.tsx'
import LoginRoute from './routes/LoginRoute.tsx'
import RegisterRoute from './routes/RegisterRoute.tsx'
import PlanRoute from './routes/PlanRoute.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route path="/plan" element={<PlanRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
