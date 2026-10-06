const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');
const { validateObjectIdParam, pick, escapeRegex } = require('../middleware/security');

router.param('id', validateObjectIdParam);

// Fields clients are allowed to set. mrn/_id/createdAt are server-controlled.
const PATIENT_FIELDS = ['name', 'phone', 'email', 'dob', 'gender', 'bloodGroup', 'status', 'lastVisit', 'balance'];

// Generate the next MRN from the highest existing one for this year.
// (countDocuments()+1 produced duplicates after any deletion -> E11000 errors.)
const nextMrn = async () => {
  const year = new Date().getFullYear();
  const prefix = `PT-${year}-`;
  const last = await Patient.findOne({ mrn: new RegExp(`^${escapeRegex(prefix)}\\d+$`) })
    .sort({ mrn: -1 }).select('mrn').lean();
  const lastNum = last ? parseInt(last.mrn.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
};

// Get all patients
router.get('/', verifyJWT, async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a patient (README: Admin, Dentist and Staff have write access)
router.post('/', verifyJWT, checkRole('Admin', 'Dentist', 'Staff'), async (req, res) => {
  const data = pick(req.body, PATIENT_FIELDS);
  if (typeof data.name === 'string' && data.name.length > 200) {
    return res.status(400).json({ message: 'Name must be at most 200 characters' });
  }
  try {
    // Retry on the rare race where two requests compute the same MRN
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const patient = new Patient({ ...data, mrn: await nextMrn() });
        const createdPatient = await patient.save();
        return res.status(201).json(createdPatient);
      } catch (err) {
        if (err.code === 11000 && err.keyPattern && err.keyPattern.mrn) continue;
        throw err;
      }
    }
    res.status(409).json({ message: 'Could not allocate a unique MRN, please retry' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update patient
router.put('/:id', verifyJWT, checkRole('Admin', 'Dentist', 'Staff'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (patient) {
      Object.assign(patient, pick(req.body, PATIENT_FIELDS));
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
router.delete('/:id', verifyJWT, checkRole('Admin'), async (req, res) => {
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
