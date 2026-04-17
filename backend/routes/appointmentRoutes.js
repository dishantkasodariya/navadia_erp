const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { verifyJWT } = require('../middleware/authMiddleware');

// Get appointments for a specific date
router.get('/', verifyJWT, async (req, res) => {
  const { date } = req.query;
  try {
    const query = date ? { date } : {};
    const appointments = await Appointment.find(query);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create appointment
router.post('/', verifyJWT, async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    const created = await appointment.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update status
router.patch('/:id/status', verifyJWT, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (appointment) {
      appointment.status = req.body.status;
      await appointment.save();
      res.json(appointment);
    } else {
      res.status(404).json({ message: 'Appointment not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete appointment
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (appointment) {
      await appointment.deleteOne();
      res.json({ message: 'Appointment removed' });
    } else {
      res.status(404).json({ message: 'Appointment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
