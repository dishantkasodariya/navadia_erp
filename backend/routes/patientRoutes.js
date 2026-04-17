const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');

// Get all patients
router.get('/', verifyJWT, async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a patient
router.post('/', verifyJWT, checkRole('ADMIN', 'RECEPTIONIST'), async (req, res) => {
  const { name, phone, email, dob, gender, bloodGroup, status } = req.body;
  try {
    const mrnNum = await Patient.countDocuments() + 1;
    const mrn = `PT-2025-${String(mrnNum).padStart(4, "0")}`;
    
    const patient = new Patient({
      mrn, name, phone, email, dob, gender, bloodGroup, status
    });
    const createdPatient = await patient.save();
    res.status(201).json(createdPatient);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update patient
router.put('/:id', verifyJWT, checkRole('ADMIN', 'RECEPTIONIST'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (patient) {
      Object.assign(patient, req.body);
      const updatedPatient = await patient.save();
      res.json(updatedPatient);
    } else {
      res.status(404).json({ message: 'Patient not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete patient
router.delete('/:id', verifyJWT, checkRole('ADMIN'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (patient) {
      await patient.deleteOne();
      res.json({ message: 'Patient removed' });
    } else {
      res.status(404).json({ message: 'Patient not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
