const mongoose = require('mongoose');

const ClinicSettingSchema = new mongoose.Schema({
  clinicName: { 
    type: String, 
    required: true,
    default: 'Dental Clinic'
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
    default: '29, Siddheshwar Society, Ved Rd, Opp. Swaminarayan Mandir, Dabholi Char Rasta, Gayatri Nagar, Katargam, Surat, Gujarat - 395004' 
  },
  workingHours: { 
    type: String, 
    default: '09:00 AM - 06:00 PM' 
  },
  latitude: {
    type: Number,
    default: 21.2301438
  },
  longitude: {
    type: Number,
    default: 72.8213966
  },
  allowedRadius: {
    type: Number,
    default: 100 // in meters
  },
  geofencingEnabled: {
    type: Boolean,
    default: true
  },
  gpsVerificationEnabled: {
    type: Boolean,
    default: true
  },
  weekendDays: {
    type: [Number],
    default: [0] // 0 is Sunday
  },
  holidays: [
    {
      name: String,
      date: String // YYYY-MM-DD
    }
  ],
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('ClinicSetting', ClinicSettingSchema);
