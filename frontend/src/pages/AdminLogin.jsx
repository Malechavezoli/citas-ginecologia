import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminLogin.css'

const ADMIN_USER = 'admin'
const ADMIN_PASS = 'gioclinica2026'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (usuario === ADMIN_USER && password === ADMIN_PASS) {
      localStorage.setItem('adminAuth', 'true')
      navigate('/admin')
    } else {
      setError(true)
    }
  }

  const clearError = () => setError(false)

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-avatar">GO</div>
        <h1 className="login-title">Panel Administrativo</h1>
        <p className="login-sub">Dra. Giovanna Oliveros</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <input
            className={`login-input${error ? ' login-input--error' : ''}`}
            type="text"
            placeholder="Usuario"
            value={usuario}
            onChange={(e) => { setUsuario(e.target.value); clearError() }}
            autoComplete="username"
          />
          <input
            className={`login-input${error ? ' login-input--error' : ''}`}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError() }}
            autoComplete="current-password"
          />
          {error && (
            <p className="login-error">Usuario o contraseña incorrectos</p>
          )}
          <button type="submit" className="login-btn">Ingresar</button>
        </form>
      </div>
    </main>
  )
}
