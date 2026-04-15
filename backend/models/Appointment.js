const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  time: { type: String, required: true },
  duration: { type: Number, default: 1 },
  patient: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  procedure: { type: String, required: true },
  dentist: { type: String, required: true },
  dentistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['scheduled', 'confirmed', 'inChair', 'completed', 'cancelled'], 
    default: 'scheduled' 
  },
  chair: { type: Number, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
