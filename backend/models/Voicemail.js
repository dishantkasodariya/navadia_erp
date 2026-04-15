const mongoose = require('mongoose');

const VoicemailSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  time: { type: String, required: true },
  duration: String,
  status: { type: String, enum: ['Unread', 'Read', 'Archived'], default: 'Unread' },
  transcript: String,
  audioUrl: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Voicemail', VoicemailSchema);
