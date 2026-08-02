import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './Admin.css'

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es },
})

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
  pendiente: { label: 'Pendiente', cls: 'badge--pending' },
  aceptada:  { label: 'Aceptada',  cls: 'badge--confirmed' },
  rechazada: { label: 'Rechazada', cls: 'badge--cancelled' },
}

const EVENT_STYLES = {
  pendiente: { bg: '#fdf3e0', border: '#c68a2e', text: '#8a5f1f' },
  aceptada:  { bg: '#e3f6f0', border: '#2f9d86', text: '#1f7a67' },
  rechazada: { bg: '#fcebef', border: '#d9637e', text: '#b8375a' },
}

function CalendarEvent({ event }) {
  return (
    <div className="cal-event-content">
      <span className="cal-event-name">{event.resource.nombrePaciente}</span>
      <span className="cal-event-time">{event.resource.hora}</span>
    </div>
  )
}

// react-big-calendar solo usa la hora/minuto de estos Date; el día es arbitrario.
function timeStringToDate(hhmm, extraMinutes = 0) {
  const [hours, minutes] = hhmm.split(':').map(Number)
  return new Date(1972, 0, 1, hours, minutes + extraMinutes, 0)
}

const DEFAULT_SCHEDULE = { horaInicio: '08:00', horaFin: '17:00' }

export default function Admin() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('lista')
  const [actioningId, setActioningId] = useState(null)
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE)

  const authFetch = async (path, options = {}) => {
    const token = localStorage.getItem('adminToken')
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })
    if (res.status === 401) {
      localStorage.removeItem('adminToken')
      navigate('/admin/login')
      throw new Error('Sesión expirada')
    }
    return res
  }

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

  useEffect(() => {
    fetch(`${API_URL}/api/schedule`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.horaInicio && data?.horaFin) {
          setSchedule({ horaInicio: data.horaInicio, horaFin: data.horaFin })
        }
      })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    navigate('/admin/login')
  }

  const handleEstadoChange = async (id, estado) => {
    setActioningId(id)
    try {
      const res = await authFetch(`/api/appointments/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = await res.json()
      setAppointments((prev) => prev.map((a) => (a._id === updated._id ? updated : a)))
      setSelectedAppt((prev) => (prev && prev._id === updated._id ? updated : prev))
    } catch (err) {
      if (err.message !== 'Sesión expirada') {
        setError('No se pudo actualizar el estado de la cita.')
      }
    } finally {
      setActioningId(null)
    }
  }

  const total     = appointments.length
  const pendiente = appointments.filter(a => a.estado === 'pendiente').length
  const aceptada  = appointments.filter(a => a.estado === 'aceptada').length
  const rechazada = appointments.filter(a => a.estado === 'rechazada').length

  // Recorta el rango de horas visible en las vistas Semana/Día al horario
  // de atención de la clínica (+1h de margen al cierre), en vez de mostrar
  // las 24h del día.
  const calendarMin = useMemo(() => timeStringToDate(schedule.horaInicio), [schedule])
  const calendarMax = useMemo(() => timeStringToDate(schedule.horaFin, 60), [schedule])

  // Construye el horario a partir del string "hora" (siempre en hora Colombia)
  // y solo toma el día de "fecha" en UTC, para no depender de la zona horaria
  // del navegador ni de citas antiguas guardadas con el offset incorrecto.
  const buildEventStart = (appointment) => {
    const fechaDate = new Date(appointment.fecha)
    const [hours, minutes] = (appointment.hora ?? '08:00').split(':').map(Number)
    return new Date(
      fechaDate.getUTCFullYear(),
      fechaDate.getUTCMonth(),
      fechaDate.getUTCDate(),
      hours,
      minutes
    )
  }

  const events = useMemo(() => appointments.map((a) => {
    const start = buildEventStart(a)
    const end = new Date(start.getTime() + 60 * 60000)
    return { id: a._id, title: `${a.hora ?? ''} ${a.nombrePaciente}`, start, end, resource: a }
  }), [appointments])

  const eventPropGetter = (event) => {
    const s = EVENT_STYLES[event.resource.estado] ?? { bg: '#f1f1ef', border: '#9aabb8', text: '#5a6b63' }
    return {
      style: {
        backgroundColor: s.bg,
        borderLeft: `4px solid ${s.border}`,
        color: s.text,
      },
    }
  }

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
          <span className="stat-number stat-number--confirmed">{aceptada}</span>
          <span className="stat-label">Aceptadas</span>
        </div>
        <div className="stat-card">
          <span className="stat-dot stat-dot--cancelled" />
          <span className="stat-number stat-number--cancelled">{rechazada}</span>
          <span className="stat-label">Rechazadas</span>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-header">
          <h2 className="admin-table-title">Citas agendadas</h2>
          <div className="admin-header-actions">
            <div className="admin-view-toggle">
              <button
                className={`view-toggle-btn${view === 'lista' ? ' view-toggle-btn--active' : ''}`}
                onClick={() => setView('lista')}
              >
                Lista
              </button>
              <button
                className={`view-toggle-btn${view === 'calendario' ? ' view-toggle-btn--active' : ''}`}
                onClick={() => setView('calendario')}
              >
                Calendario
              </button>
            </div>
            <button
              className="admin-refresh-btn"
              onClick={fetchAppointments}
              disabled={loading}
            >
              {loading ? '…' : '↻ Actualizar'}
            </button>
          </div>
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

        {!loading && !error && appointments.length > 0 && view === 'lista' && (
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
                  <th>Acciones</th>
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
                      <td>
                        {a.estado === 'pendiente' && (
                          <div className="row-actions">
                            <button
                              className="btn-accept"
                              disabled={actioningId === a._id}
                              onClick={() => handleEstadoChange(a._id, 'aceptada')}
                            >
                              Aceptar
                            </button>
                            <button
                              className="btn-reject"
                              disabled={actioningId === a._id}
                              onClick={() => handleEstadoChange(a._id, 'rechazada')}
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && appointments.length > 0 && view === 'calendario' && (
          <div className="admin-calendar-wrap">
            <Calendar
              localizer={localizer}
              culture="es"
              events={events}
              startAccessor="start"
              endAccessor="end"
              defaultView="week"
              views={['month', 'week', 'day']}
              min={calendarMin}
              max={calendarMax}
              style={{ height: 600 }}
              eventPropGetter={eventPropGetter}
              components={{ event: CalendarEvent }}
              onSelectEvent={(event) => setSelectedAppt(event.resource)}
              messages={{
                next: 'Sig.', previous: 'Ant.', today: 'Hoy',
                month: 'Mes', week: 'Semana', day: 'Día', agenda: 'Agenda',
                noEventsInRange: 'No hay citas en este rango.',
              }}
            />
          </div>
        )}
      </div>

      {selectedAppt && (
        <div className="appt-detail-overlay" onClick={() => setSelectedAppt(null)}>
          <div className="appt-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="appt-detail-header">
              <h3>{selectedAppt.nombrePaciente}</h3>
              <button className="appt-detail-close-btn" onClick={() => setSelectedAppt(null)} aria-label="Cerrar">✕</button>
            </div>
            <div className="appt-detail-body">
              <p><strong>Fecha:</strong> {formatFecha(selectedAppt.fecha)}</p>
              <p><strong>Hora:</strong> {selectedAppt.hora ?? '—'}</p>
              <p><strong>Correo:</strong> {selectedAppt.correoPaciente}</p>
              <p><strong>Teléfono:</strong> {selectedAppt.telefonoPaciente ?? '—'}</p>
              <p><strong>Tipo:</strong> {selectedAppt.tipo ?? '—'}</p>
              {selectedAppt.notas && <p><strong>Notas:</strong> {selectedAppt.notas}</p>}
              <p>
                <strong>Estado:</strong>{' '}
                <span className={`badge ${ESTADO[selectedAppt.estado]?.cls ?? ''}`}>
                  {ESTADO[selectedAppt.estado]?.label ?? selectedAppt.estado}
                </span>
              </p>
            </div>
            <div className="row-actions">
              <button
                className="btn-accept"
                disabled={actioningId === selectedAppt._id}
                onClick={() => handleEstadoChange(selectedAppt._id, 'aceptada')}
              >
                Aceptar
              </button>
              <button
                className="btn-reject"
                disabled={actioningId === selectedAppt._id}
                onClick={() => handleEstadoChange(selectedAppt._id, 'rechazada')}
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
