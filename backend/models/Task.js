const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  assignedTo: { 
    type: String, 
    required: false 
  }, // User ID of the assigned staff/dentist
  role: { 
    type: String 
  }, // Role, e.g. 'Staff', 'Dentist'
  status: { 
    type: String, 
    default: 'pending' 
  }, // 'pending', 'in-progress', 'completed', 'cancelled'
  priority: { 
    type: String, 
    default: 'medium' 
  }, // 'low', 'medium', 'high', 'urgent'
  dueDate: { 
    type: String 
  },
  createdBy: { 
    type: String 
  }, // Admin ID or Name
  createdByName: {
    type: String
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  completedDates: {
    type: [String],
    default: []
  },
  completions: {
    type: [{
      userId: String,
      date: String
    }],
    default: []
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Task', TaskSchema);
