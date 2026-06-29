const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkIn: String,
  checkOut: String,
  breakTime: { type: Number, default: 0 }, // Break time in minutes
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'On Leave', 'Tour', 'Holiday', 'Weekend', 'On Break'], default: 'Present' },
  checkInLatitude: Number,
  checkInLongitude: Number,
  checkOutLatitude: Number,
  checkOutLongitude: Number,
  deviceInfo: String,
  browserInfo: String,
  ipAddress: String,
  locationVerified: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  overtime: { type: Number, default: 0 }, // Overtime in minutes
  workingHours: { type: Number, default: 0 }, // Active working hours in minutes
  breakCount: { type: Number, default: 0 },
  breaks: [
    {
      start: String,
      end: String,
      duration: Number, // in minutes
      reason: { type: String, default: "Lunch Break" }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
