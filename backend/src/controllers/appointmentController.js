const {
  parseISO,
  isValid,
  format,
  setHours,
  setMinutes,
  addMinutes,
  isWithinInterval,
  startOfDay,
  endOfDay,
  getDay,
} = require('date-fns');

const Appointment = require('../models/Appointment');
const Schedule = require('../models/Schedule');
const Exception = require('../models/Exception');

const DAY_NAMES = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

function parseTime(timeStr, baseDate) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  let d = setHours(new Date(baseDate), hours);
  d = setMinutes(d, minutes);
  d.setSeconds(0, 0);
  return d;
}

function generateSlots(start, end, duration) {
  const slots = [];
  let current = new Date(start);
  while (addMinutes(current, duration) <= end) {
    slots.push(new Date(current));
    current = addMinutes(current, duration);
  }
  return slots;
}

const getAvailableSlots = async (req, res) => {
  try {
    const { fecha, tipo } = req.query;

    if (!fecha) {
      return res.status(400).json({ message: 'El parámetro fecha es requerido (YYYY-MM-DD)' });
    }

    const day = parseISO(fecha);
    if (!isValid(day)) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }

    const schedule = await Schedule.findOne();
    if (!schedule) {
      return res.status(404).json({ message: 'Configuración de horario no encontrada' });
    }

    const dayName = DAY_NAMES[getDay(day)];
    if (!schedule.diasLaborales.includes(dayName)) {
      return res.json([]);
    }

    const exception = await Exception.findOne({
      fechaInicio: { $lte: endOfDay(day) },
      fechaFin: { $gte: startOfDay(day) },
    });

    if (exception && exception.tipo !== 'horario_especial') {
      return res.json([]);
    }

    const workStart = exception?.tipo === 'horario_especial'
      ? parseTime(exception.horaInicio, day)
      : parseTime(schedule.horaInicio, day);

    const workEnd = exception?.tipo === 'horario_especial'
      ? parseTime(exception.horaFin, day)
      : parseTime(schedule.horaFin, day);

    const lunchStart = parseTime(schedule.horaAlmuerzoInicio, day);
    const lunchEnd = parseTime(schedule.horaAlmuerzoFin, day);

    const allSlots = generateSlots(workStart, workEnd, schedule.duracionCita);

    const bookedAppointments = await Appointment.find({
      fecha: { $gte: startOfDay(day), $lte: endOfDay(day) },
      estado: { $in: ['pendiente', 'aceptada'] },
    });

    console.log('Citas reservadas:', bookedAppointments.map(a => ({ fecha: a.fecha, hora: a.hora })));

    const bookedHoras = new Set(
      bookedAppointments.map((a) => a.hora)
    );

    console.log('Horas ocupadas:', bookedHoras);

    const available = allSlots.filter((slot) => {
      const slotHora = format(slot, 'HH:mm');
      const slotEnd = addMinutes(slot, schedule.duracionCita);
      const overlapsLunch = slot < lunchEnd && slotEnd > lunchStart;
      return !overlapsLunch && !bookedHoras.has(slotHora);
    });

    const result = available.map((slot) => ({
      hora: format(slot, 'HH:mm'),
      fechaHora: slot.toISOString(),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAppointment = async (req, res) => {
  try {
    console.log('Datos recibidos:', req.body);

    const { fecha, hora, nombrePaciente, correoPaciente, telefonoPaciente, notas } = req.body;
    const tipo = req.body.tipo || 'presencial';

    if (!fecha || !nombrePaciente || !correoPaciente) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: fecha, nombrePaciente, correoPaciente' });
    }

    // -05:00 fijo: Colombia no observa horario de verano.
    const parsedDate = new Date(fecha + 'T' + (hora || '08:00') + ':00.000-05:00');

    const appointment = new Appointment({
      fecha: parsedDate,
      hora: hora || '08:00',
      tipo,
      nombrePaciente,
      correoPaciente,
      telefonoPaciente,
      notas,
      estado: 'pendiente',
    });

    await appointment.save();
    res.status(201).json(appointment);

  } catch (error) {
    console.error('Error completo al crear cita:', error);
    res.status(400).json({ message: error.message, details: error.errors });
  }
};

const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ fecha: 1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { estado: 'rechazada' },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const ESTADOS_VALIDOS = ['pendiente', 'aceptada', 'rechazada'];

const updateEstado = async (req, res) => {
  try {
    const { estado } = req.body;

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({
        message: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`,
      });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAvailableSlots,
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  updateEstado,
};
