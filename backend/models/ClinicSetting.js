const mongoose = require('mongoose');

const ClinicSettingSchema = new mongoose.Schema({
  clinicName: { 
    type: String, 
    required: true,
    default: 'Navadia Dental Clinic'
  },
  email: { 
    type: String, 
    default: 'contact@navadia.com' 
  },
  phone: { 
    type: String, 
    default: '+91 98765 43210' 
  },
  address: { 
    type: String, 
    default: '101, Medical Plaza, Surat, Gujarat' 
  },
  workingHours: { 
    type: String, 
    default: '09:00 AM - 08:00 PM' 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('ClinicSetting', ClinicSettingSchema);
