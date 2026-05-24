const mongoose = require('mongoose');

const VoicemailSchema = new mongoose.Schema({
  audioFile: { 
    type: String, 
    required: true 
  }, // Base64 audio string or URL
  assignedTo: { 
    type: String, 
    required: true 
  }, // User ID or Name of target staff/dentist
  message: { 
    type: String 
  }, // Transcribed text or message details
  createdBy: { 
    type: String 
  }, // Admin name or ID
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Voicemail', VoicemailSchema);
