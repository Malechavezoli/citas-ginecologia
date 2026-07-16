const Exception = require('../models/Exception');
const { parseISO, isValid } = require('date-fns');

const getExceptions = async (req, res) => {
  try {
    const exceptions = await Exception.find().sort({ fechaInicio: 1 });
    res.json(exceptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createException = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tipo, motivo, horaInicio, horaFin } =
      req.body;

    const inicio = parseISO(fechaInicio);
    const fin = fechaFin ? parseISO(fechaFin) : inicio;

    if (!isValid(inicio) || !isValid(fin)) {
      return res.status(400).json({ message: 'Fechas inválidas' });
    }

    const exception = await Exception.create({
      fechaInicio: inicio,
      fechaFin: fin,
      tipo,
      motivo,
      horaInicio,
      horaFin,
    });

    res.status(201).json(exception);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteException = async (req, res) => {
  try {
    const exception = await Exception.findByIdAndDelete(req.params.id);
    if (!exception) {
      return res.status(404).json({ message: 'Excepción no encontrada' });
    }
    res.json({ message: 'Excepción eliminada' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getExceptions, createException, deleteException };
