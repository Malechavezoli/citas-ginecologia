import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminLogin.css'

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

export default function AdminLogin() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      })
      if (!res.ok) throw new Error('Credenciales inválidas')
      const data = await res.json()
      localStorage.setItem('adminToken', data.token)
      navigate('/admin')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
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
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  )
}
