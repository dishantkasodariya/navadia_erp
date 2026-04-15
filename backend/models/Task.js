const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Todo', 'InProgress', 'Completed'], default: 'Todo' },
  assignedTo: { type: String, required: true },
  assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);
