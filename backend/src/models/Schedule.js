const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    diasLaborales: {
      type: [String],
      default: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
    },
    horaInicio: {
      type: String,
      default: '08:00',
    },
    horaFin: {
      type: String,
      default: '17:00',
    },
    duracionCita: {
      type: Number,
      default: 120,
    },
    horaAlmuerzoInicio: {
      type: String,
      default: '12:00',
    },
    horaAlmuerzoFin: {
      type: String,
      default: '13:00',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Schedule', scheduleSchema);
