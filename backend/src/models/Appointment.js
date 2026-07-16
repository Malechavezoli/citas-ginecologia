const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    fecha: {
      type: Date,
      required: true,
    },
    hora: {
      type: String,
    },
    tipo: {
      type: String,
      enum: ['presencial', 'virtual', 'telefonico', null],
      default: 'presencial',
    },
    estado: {
      type: String,
      enum: ['pendiente', 'confirmada', 'cancelada'],
      default: 'pendiente',
    },
    nombrePaciente: {
      type: String,
      required: true,
    },
    correoPaciente: {
      type: String,
      required: true,
    },
    telefonoPaciente: {
      type: String,
    },
    notas: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
