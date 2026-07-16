import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Agendar from './pages/Agendar'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'
import AdminRoute from './components/AdminRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/agendar" element={<Agendar />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={
        <AdminRoute>
          <Admin />
        </AdminRoute>
      } />
    </Routes>
  )
}
