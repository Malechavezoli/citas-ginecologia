const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const {
  getAvailableSlots,
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  updateEstado,
} = require('../controllers/appointmentController');

router.get('/available', getAvailableSlots);
router.get('/', getAppointments);
router.post('/', createAppointment);
router.patch('/:id/estado', requireAuth, updateEstado);
router.put('/:id', requireAuth, updateAppointment);
router.delete('/:id', requireAuth, deleteAppointment);

module.exports = router;
