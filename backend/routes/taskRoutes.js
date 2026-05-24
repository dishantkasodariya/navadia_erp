const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');

// Get all tasks (filtered by user if not Admin)
router.get('/', verifyJWT, async (req, res) => {
  try {
    let query = {};
    if (req.user.role.toLowerCase() !== 'admin') {
      query = { assignedTo: req.user._id.toString() };
    }
    const tasks = await Task.find(query).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create task (Admin, Dentist, Staff)
router.post('/', verifyJWT, async (req, res) => {
  const { title, description, assignedTo, role, priority, dueDate } = req.body;
  try {
    const task = new Task({
      title,
      description,
      assignedTo,
      role,
      priority,
      dueDate,
      createdBy: req.user._id,
      createdByName: req.user.name
    });
    const created = await task.save();

    // Emit event for real-time notification
    if (req.io) {
      req.io.emit('task_assigned', created);
    }

    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update task status or details
router.put('/:id', verifyJWT, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task) {
      Object.assign(task, req.body);
      await task.save();
      res.json(task);
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete task (Admin only)
router.delete('/:id', verifyJWT, checkRole('Admin'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task) {
      await task.deleteOne();
      res.json({ message: 'Task removed' });
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
