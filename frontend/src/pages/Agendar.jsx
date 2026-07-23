import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Agendar.css'

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const MONTHS_SHORT = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const TIPOS = [
  { id: 'todos',      label: 'Todos',      icon: '⊞' },
  { id: 'virtual',    label: 'Virtual',    icon: '🖥' },
  { id: 'telefonico', label: 'Telefónico', icon: '📞' },
  { id: 'presencial', label: 'Presencial', icon: '🩺' },
]

function pad(n) { return String(n).padStart(2, '0') }

function to12h(hora) {
  const [h, m] = hora.split(':').map(Number)
  const period = h < 12 ? 'a.m.' : 'p.m.'
  const h12 = h % 12 || 12
  return `${h12}:${pad(m)} ${period}`
}

function calcEndTime(hora, duracion) {
  const mins = parseInt(duracion) || 45
  const [h, m] = hora.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`
}

function toDateString(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstWeekday(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function isWeekend(year, month, day) {
  const d = new Date(year, month, day).getDay()
  return d === 0 || d === 6
}

function isToday(year, month, day) {
  const t = new Date()
  return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day
}

function isPast(year, month, day) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(year, month, day) < today
}

function normalizeSlot(item) {
  if (typeof item === 'string') return { hora: item, duracion: '45 min', tipo: null, recomendada: false }
  return {
    hora:        item.hora        ?? item.time        ?? item.hour     ?? '??:??',
    duracion:    item.duracion    ?? item.duration    ?? '45 min',
    tipo:        item.tipo        ?? item.type        ?? item.modalidad ?? null,
    recomendada: item.recomendada ?? item.recommended ?? false,
  }
}

const EMPTY_FORM = { nombre: '', email: '', telefono: '', notas: '' }

function getAvailClass(count) {
  if (count === 0) return 'day-no-slots'
  if (count === 1) return 'day-few'
  if (count <= 3) return 'day-some'
  return 'day-many'
}

export default function Agendar() {
  const navigate = useNavigate()
  const now = new Date()

  // Calendario
  const [year, setYear]                 = useState(now.getFullYear())
  const [month, setMonth]               = useState(now.getMonth())
  const [tipo, setTipo]                 = useState('todos')
  const [selectedDay, setSelectedDay]   = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [slots, setSlots]               = useState([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep]           = useState(1)
  const [slideDir, setSlideDir]   = useState(null)

  // Formulario paso 2
  const [form, setForm]             = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})

  // Paso 3 - pago
  const [payLoading, setPayLoading]   = useState(false)
  const [payError, setPayError]       = useState(null)
  const [payRejected, setPayRejected] = useState(false)

  // Pantalla de confirmación
  const [confirmed, setConfirmed]           = useState(false)
  const [confirmationData, setConfirmationData] = useState(null)

  // Disponibilidad por día del mes (day -> count)
  const [monthAvailability, setMonthAvailability] = useState({})

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalOpen])

  // Escape
  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modalOpen])

  // Precarga disponibilidad de todos los días del mes
  useEffect(() => {
    let cancelled = false
    setMonthAvailability({})
    const total = getDaysInMonth(year, month)
    const weekdays = []
    for (let d = 1; d <= total; d++) {
      if (!isWeekend(year, month, d) && !isPast(year, month, d)) weekdays.push(d)
    }
    if (weekdays.length === 0) return
    Promise.all(
      weekdays.map(async (day) => {
        try {
          const res = await fetch(
            `${API_URL}/api/appointments/available?fecha=${toDateString(year, month, day)}`
          )
          if (!res.ok) return [day, 0]
          const data = await res.json()
          return [day, data.length]
        } catch { return [day, 0] }
      })
    ).then((results) => {
      if (cancelled) return
      const map = {}
      results.forEach(([day, count]) => { map[day] = count })
      setMonthAvailability(map)
    })
    return () => { cancelled = true }
  }, [year, month])

  // Fetch horarios
  useEffect(() => {
    if (selectedDay === null) return
    const controller = new AbortController()
    const fecha = toDateString(year, month, selectedDay)
    setLoading(true); setError(null); setSlots([]); setSelectedSlot(null)
    fetch(`${API_URL}/api/appointments/available?fecha=${fecha}`, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then((data) => setSlots(data.map(normalizeSlot)))
      .catch((err) => { if (err.name !== 'AbortError') setError('Error al cargar horarios') })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [selectedDay, year, month])

  const resetModal = () => {
    setStep(1); setSlideDir(null)
    setForm(EMPTY_FORM); setFormErrors({})
    setPayLoading(false); setPayError(null); setPayRejected(false)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedSlot(null)
    resetModal()
  }

  const goToStep2 = () => { setSlideDir('forward'); setStep(2) }
  const goToStep1 = () => { setSlideDir('backward'); setStep(1) }
  const goToStep3 = () => { setSlideDir('forward'); setStep(3) }
  const goBackToStep2 = () => {
    setPayRejected(false); setPayError(null)
    setSlideDir('backward'); setStep(2)
  }

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: false }))
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    const errors = {}
    if (!form.nombre.trim()) errors.nombre = true
    if (!form.email.trim())  errors.email  = true
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    goToStep3()
  }

  const handlePayApproved = async () => {
    setPayLoading(true); setPayError(null)
    try {
      const datosACitar = {
        fecha:            toDateString(year, month, selectedDay),
        hora:             selectedSlot.hora,
        duracion:         selectedSlot.duracion,
        tipo:             selectedSlot.tipo,
        nombrePaciente:   form.nombre,
        correoPaciente:   form.email,
        telefonoPaciente: form.telefono,
        notas:            form.notas,
      }
      console.log('Enviando al backend:', datosACitar)
      const res = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosACitar),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const dayName = DAYS_OF_WEEK[new Date(year, month, selectedDay).getDay()]
      setConfirmationData({
        nombre:    form.nombre,
        fecha:     `${dayName}, ${selectedDay} De ${MONTHS[month]} De ${year}`,
        horario:   `${selectedSlot.hora} – ${calcEndTime(selectedSlot.hora, selectedSlot.duracion)}`,
        reservaId: data._id,
      })
      setModalOpen(false)
      setSelectedSlot(null)
      resetModal()
      setConfirmed(true)
    } catch {
      setPayError('Error al registrar la cita. Por favor intenta de nuevo.')
    } finally {
      setPayLoading(false)
    }
  }

  const handlePayRejected = () => {
    setPayRejected(true)
  }

  const prevMonth = () => {
    setSelectedDay(null); setSlots([]); setSelectedSlot(null); setModalOpen(false)
    if (month === 0) { setYear((y) => y - 1); setMonth(11) } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    setSelectedDay(null); setSlots([]); setSelectedSlot(null); setModalOpen(false)
    if (month === 11) { setYear((y) => y + 1); setMonth(0) } else setMonth((m) => m + 1)
  }

  const handleDayClick = (day) => {
    if (isWeekend(year, month, day) || isPast(year, month, day)) return
    if (monthAvailability[day] === 0) return
    setSelectedDay(day); setSelectedSlot(null); setModalOpen(true)
  }

  const displayedSlots = tipo === 'todos'
    ? slots
    : slots.filter((s) => !s.tipo || s.tipo.toLowerCase() === tipo)

  const daysInMonth  = getDaysInMonth(year, month)
  const firstWeekday = getFirstWeekday(year, month)
  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedDayOfWeek = selectedDay
    ? DAYS_OF_WEEK[new Date(year, month, selectedDay).getDay()]
    : ''
  const selectedDayShort = selectedDay
    ? DAYS_OF_WEEK[new Date(year, month, selectedDay).getDay()].substring(0, 3).toUpperCase()
    : ''

  // ── Pantalla de confirmación ────────────────────────────────────────────────
  if (confirmed && confirmationData) {
    return (
      <main className="agendar-page agendar-page--confirmed">
        <div className="confirm-success-card">
          <div className="confirm-check-wrap">
            <span className="confirm-check-icon">✓</span>
          </div>
          <h2 className="confirm-card-title">¡Reserva confirmada!</h2>
          <p className="confirm-card-sub">
            Tu pago fue procesado exitosamente. Te enviamos un correo con los detalles.
          </p>
          <div className="confirm-table">
            <div className="confirm-table-row">
              <span className="confirm-table-label">Nombre</span>
              <span className="confirm-table-value">{confirmationData.nombre}</span>
            </div>
            <hr className="confirm-table-hr" />
            <div className="confirm-table-row">
              <span className="confirm-table-label">Fecha</span>
              <span className="confirm-table-value">{confirmationData.fecha}</span>
            </div>
            <hr className="confirm-table-hr" />
            <div className="confirm-table-row">
              <span className="confirm-table-label">Horario</span>
              <span className="confirm-table-value">{confirmationData.horario}</span>
            </div>
            <hr className="confirm-table-hr" />
            <div className="confirm-table-row">
              <span className="confirm-table-label">ID reserva</span>
              <span className="confirm-table-id">{confirmationData.reservaId}</span>
            </div>
          </div>
          <button className="confirm-back-btn" onClick={() => navigate('/')}>
            ← Volver al inicio
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="agendar-page">

      <button className="back-btn" onClick={() => navigate('/')}>← Inicio</button>

      <div className="agendar-header">
        <h1 className="agendar-title">
          Toca un día disponible<br />para ver los horarios
        </h1>
      </div>

      <div className="filter-card">
        <div className="filter-buttons">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              className={`filter-btn${tipo === t.id ? ' filter-btn--active' : ''}`}
              onClick={() => { setTipo(t.id); setSelectedSlot(null) }}
            >
              <span className="filter-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendario */}
      <div className="calendar-card">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={prevMonth} aria-label="Mes anterior">‹</button>
          <span className="calendar-month">{MONTHS[month]} {year}</span>
          <button className="nav-btn" onClick={nextMonth} aria-label="Mes siguiente">›</button>
        </div>
        <div className="calendar-grid" role="grid" aria-label="Calendario de citas">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="weekday-label" role="columnheader">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} className="day-cell day-empty" role="gridcell" />
            const isBaseDisabled = isWeekend(year, month, day) || isPast(year, month, day)
            const hasNoSlots     = monthAvailability[day] === 0
            const disabled       = isBaseDisabled || hasNoSlots
            const selected       = day === selectedDay
            const today          = isToday(year, month, day)
            let cls = 'day-cell day-btn'
            if (isBaseDisabled) {
              cls += ' day-disabled'
            } else if (hasNoSlots) {
              cls += ' day-no-slots'
            } else if (monthAvailability[day] !== undefined) {
              cls += ` ${getAvailClass(monthAvailability[day])}`
            }
            if (selected)           cls += ' day-selected'
            if (today && !selected) cls += ' day-today'
            return (
              <button
                key={day} className={cls}
                onClick={() => handleDayClick(day)}
                disabled={disabled} aria-pressed={selected}
                aria-label={`${day} de ${MONTHS[month]}${today ? ', hoy' : ''}`}
                role="gridcell"
              >
                {day}
              </button>
            )
          })}
        </div>
        <div className="calendar-legend">
          <span className="legend-item"><span className="legend-dot legend-dot--few" />Pocos</span>
          <span className="legend-item"><span className="legend-dot legend-dot--some" />Varios</span>
          <span className="legend-item"><span className="legend-dot legend-dot--many" />Muchos</span>
          <span className="legend-item"><span className="legend-dot legend-dot--no-slots" />Sin cupos</span>
          <span className="legend-item"><span className="legend-dot legend-dot--selected" />Seleccionado</span>
        </div>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>

            {/* ── Paso 1: lista de horarios ── */}
            {step === 1 && (
              <div className={`modal-step${slideDir === 'backward' ? ' step-slide-from-left' : ''}`}>

                <div className="modal-header">
                  <div>
                    <p className="modal-label">Horarios disponibles</p>
                    <h2 className="modal-title">
                      {selectedDay && `${selectedDayOfWeek}, ${selectedDay} de ${MONTHS[month]}`}
                    </h2>
                  </div>
                  <button className="modal-close-btn" onClick={closeModal} aria-label="Cerrar">✕</button>
                </div>

                {loading && (
                  <div className="slots-loading">
                    <span className="spinner" aria-hidden="true" />Buscando horarios…
                  </div>
                )}
                {!loading && error && <p className="slots-error" role="alert">⚠ {error}</p>}
                {!loading && !error && displayedSlots.length === 0 && (
                  <p className="slots-empty">No hay horarios disponibles para este día.</p>
                )}

                {!loading && displayedSlots.length > 0 && (
                  <>
                    <p className="slots-count-label">Disponibles ({displayedSlots.length})</p>
                    <div className="slots-list" role="group">
                      {displayedSlots.map((slot, idx) => {
                        const active = selectedSlot?.hora === slot.hora && selectedSlot?.idx === idx
                        return (
                          <button
                            key={`${slot.hora}-${idx}`}
                            className={`slot-card${slot.recomendada ? ' slot-card--recomendada' : ''}${active ? ' slot-card--active' : ''}`}
                            onClick={() => setSelectedSlot(active ? null : { ...slot, idx })}
                            aria-pressed={active}
                          >
                            <div className="slot-card-left">
                              <span className="slot-hora">{slot.hora}</span>
                              {slot.recomendada && <span className="badge-recomendada">★ Recomendada</span>}
                              <span className="slot-sub">{to12h(slot.hora)} · {slot.duracion}</span>
                            </div>
                            {slot.tipo && (
                              <span className="tipo-badge">{slot.tipo}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {selectedSlot && (
                  <div className="confirm-section">
                    <button className="btn-confirm" onClick={goToStep2}>
                      Confirmar cita →
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* ── Paso 2: formulario ── */}
            {step === 2 && (
              <div className={`modal-step${slideDir === 'forward' ? ' step-slide-from-right' : ' step-slide-from-left'}`}>

                <div className="step2-header">
                  <button className="btn-back-step" onClick={goToStep1}>← Cambiar horario</button>
                  <h2 className="step2-title">Completa tus datos</h2>
                </div>

                {selectedSlot && (
                  <div className="appt-summary-card">
                    <div className="appt-summary-top">
                      <span className="appt-summary-eyebrow">Tu reserva</span>
                      <button className="btn-cambiar-inline" onClick={goToStep1}>↩ cambiar</button>
                    </div>
                    <div className="appt-chips">
                      <div className="appt-chip">
                        <span className="appt-chip-label">Fecha</span>
                        <span className="appt-chip-value">
                          {selectedDayShort} {selectedDay} {MONTHS_SHORT[month]}
                        </span>
                      </div>
                      <div className="appt-chip">
                        <span className="appt-chip-label">Hora</span>
                        <span className="appt-chip-value">
                          {selectedSlot.hora} – {calcEndTime(selectedSlot.hora, selectedSlot.duracion)}
                        </span>
                      </div>
                      <div className="appt-chip">
                        <span className="appt-chip-label">Sesión</span>
                        <span className="appt-chip-value">{selectedSlot.duracion}</span>
                      </div>
                    </div>
                  </div>
                )}

                <form className="appt-form" onSubmit={handleFormSubmit} noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="f-nombre">Nombre completo *</label>
                    <input
                      id="f-nombre" type="text"
                      className={`form-input${formErrors.nombre ? ' form-input--error' : ''}`}
                      placeholder="María Torres"
                      value={form.nombre}
                      onChange={(e) => handleFormChange('nombre', e.target.value)}
                    />
                    {formErrors.nombre && <span className="form-error-msg">Este campo es obligatorio</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="f-email">Correo electrónico *</label>
                    <input
                      id="f-email" type="email"
                      className={`form-input${formErrors.email ? ' form-input--error' : ''}`}
                      placeholder="maria@ejemplo.com"
                      value={form.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                    />
                    {formErrors.email && <span className="form-error-msg">Este campo es obligatorio</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="f-tel">Teléfono</label>
                    <input
                      id="f-tel" type="tel"
                      className="form-input"
                      placeholder="+573001234567"
                      value={form.telefono}
                      onChange={(e) => handleFormChange('telefono', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="f-notas">Notas adicionales</label>
                    <textarea
                      id="f-notas"
                      className="form-input form-textarea"
                      placeholder="Cuéntame brevemente tu situación o el motivo de la consulta..."
                      value={form.notas}
                      onChange={(e) => handleFormChange('notas', e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn-pay">Continuar al pago →</button>
                </form>

              </div>
            )}

            {/* ── Paso 3: simulación de pago ── */}
            {step === 3 && (
              <div className="modal-step step-slide-from-right">

                <div className="step3-header">
                  <h2 className="step3-title">Simular resultado del pago</h2>
                  <p className="step3-subtitle">
                    Modo desarrollo — elige el resultado para probar el flujo completo.
                  </p>
                </div>

                {!payRejected && (
                  <div className="pay-sim-buttons">
                    <button
                      className="btn-pay-approved"
                      onClick={handlePayApproved}
                      disabled={payLoading}
                    >
                      {payLoading
                        ? <><span className="spinner spinner--white" aria-hidden="true" /> Procesando…</>
                        : '✅ Pago aprobado'}
                    </button>
                    <button
                      className="btn-pay-rejected-sim"
                      onClick={handlePayRejected}
                      disabled={payLoading}
                    >
                      ❌ Pago rechazado
                    </button>
                  </div>
                )}

                {payError && (
                  <div className="pay-error-msg" role="alert">⚠ {payError}</div>
                )}

                {payRejected && (
                  <div className="pay-rejected-block">
                    <div className="pay-rejected-msg">
                      ❌ El pago no pudo procesarse. Intenta de nuevo.
                    </div>
                    <button className="btn-retry-pay" onClick={goBackToStep2}>
                      ← Volver al formulario
                    </button>
                  </div>
                )}

                {!payRejected && (
                  <button className="btn-cancel-pay" onClick={closeModal}>
                    ← Cancelar y volver a horarios
                  </button>
                )}

              </div>
            )}

          </div>
        </div>
      )}

    </main>
  )
}
