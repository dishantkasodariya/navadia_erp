const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  employeeId: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  }, // 'Attendance Created', 'Attendance Updated', 'Manual Check-In', 'Manual Check-Out', 'Attendance Deleted', 'Attendance Approved'
  performedBy: {
    type: String,
    required: true
  }, // ID of user who performed action
  performedByName: {
    type: String,
    required: true
  }, // Name of user who performed action
  previousValue: {
    type: String,
    default: ""
  }, // JSON string of old fields
  newValue: {
    type: String,
    default: ""
  } // JSON string of new fields
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
