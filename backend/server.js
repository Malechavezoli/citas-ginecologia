require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const scheduleRoutes = require('./src/routes/schedule');
const exceptionRoutes = require('./src/routes/exceptions');
const appointmentRoutes = require('./src/routes/appointments');
const errorHandler = require('./src/middleware/errorHandler');
const Schedule = require('./src/models/Schedule');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/schedule', scheduleRoutes);
app.use('/api/exceptions', exceptionRoutes);
app.use('/api/appointments', appointmentRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ginecologia';

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Conectado a MongoDB');

    await Schedule.findOneAndUpdate(
      {},
      {
        horaInicio:         '08:00',
        horaFin:            '17:00',
        duracionCita:       120,
        horaAlmuerzoInicio: '12:00',
        horaAlmuerzoFin:    '13:00',
      },
      { upsert: true, new: true }
    );
    console.log('Horario sincronizado: 08:00–17:00, citas de 2h, almuerzo 12:00–13:00');

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error al conectar a MongoDB:', err.message);
    process.exit(1);
  });
