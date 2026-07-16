const mongoose = require('mongoose');

const exceptionSchema = new mongoose.Schema(
  {
    fechaInicio: {
      type: Date,
      required: true,
    },
    fechaFin: {
      type: Date,
      required: true,
    },
    tipo: {
      type: String,
      enum: ['dia_libre', 'vacaciones', 'horario_especial'],
      required: true,
    },
    motivo: {
      type: String,
      required: true,
    },
    horaInicio: {
      type: String,
    },
    horaFin: {
      type: String,
    },
  },
  { timestamps: true }
);

exceptionSchema.pre('validate', function (next) {
  if (this.tipo === 'horario_especial') {
    if (!this.horaInicio || !this.horaFin) {
      return next(
        new Error('horaInicio y horaFin son requeridos para horario_especial')
      );
    }
  }
  next();
});

module.exports = mongoose.model('Exception', exceptionSchema);
