import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Admin.css'

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

function formatFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const ESTADO = {
  pendiente:  { label: 'Pendiente',  cls: 'badge--pending' },
  confirmada: { label: 'Confirmada', cls: 'badge--confirmed' },
  cancelada:  { label: 'Cancelada',  cls: 'badge--cancelled' },
}

export default function Admin() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAppointments = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/appointments`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setAppointments(await res.json())
    } catch {
      setError('No se pudo cargar la lista de citas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAppointments() }, [])

  const handleLogout = () => {
    localStorage.removeItem('adminAuth')
    navigate('/admin/login')
  }

  const total      = appointments.length
  const pendiente  = appointments.filter(a => a.estado === 'pendiente').length
  const confirmada = appointments.filter(a => a.estado === 'confirmada').length
  const cancelada  = appointments.filter(a => a.estado === 'cancelada').length

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-header-info">
          <div className="admin-header-avatar">GO</div>
          <div>
            <h1 className="admin-header-title">Panel Administrativo</h1>
            <p className="admin-header-sub">Dra. Giovanna Oliveros</p>
          </div>
        </div>
        <button className="admin-logout-btn" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </header>

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-number">{total}</span>
          <span className="stat-label">Total de citas</span>
        </div>
        <div className="stat-card">
          <span className="stat-dot stat-dot--pending" />
          <span className="stat-number stat-number--pending">{pendiente}</span>
          <span className="stat-label">Pendientes</span>
        </div>
        <div className="stat-card">
          <span className="stat-dot stat-dot--confirmed" />
          <span className="stat-number stat-number--confirmed">{confirmada}</span>
          <span className="stat-label">Confirmadas</span>
        </div>
        <div className="stat-card">
          <span className="stat-dot stat-dot--cancelled" />
          <span className="stat-number stat-number--cancelled">{cancelada}</span>
          <span className="stat-label">Canceladas</span>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-header">
          <h2 className="admin-table-title">Citas agendadas</h2>
          <button
            className="admin-refresh-btn"
            onClick={fetchAppointments}
            disabled={loading}
          >
            {loading ? '…' : '↻ Actualizar'}
          </button>
        </div>

        {loading && (
          <div className="admin-loading">
            <span className="admin-spinner" />
            Cargando citas…
          </div>
        )}

        {!loading && error && (
          <div className="admin-error">{error}</div>
        )}

        {!loading && !error && appointments.length === 0 && (
          <div className="admin-empty">No hay citas agendadas aún</div>
        )}

        {!loading && !error && appointments.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Correo</th>
                  <th>Teléfono</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => {
                  const est = ESTADO[a.estado] ?? { label: a.estado, cls: '' }
                  return (
                    <tr key={a._id}>
                      <td className="td-fecha">{formatFecha(a.fecha)}</td>
                      <td className="td-hora">{a.hora ?? '—'}</td>
                      <td className="td-nombre">{a.nombrePaciente}</td>
                      <td className="td-email">{a.correoPaciente}</td>
                      <td>{a.telefonoPaciente ?? '—'}</td>
                      <td className="td-tipo">{a.tipo ?? '—'}</td>
                      <td>
                        <span className={`badge ${est.cls}`}>{est.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
