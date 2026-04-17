const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { verifyJWT } = require('../middleware/authMiddleware');

// Get all tasks
router.get('/', verifyJWT, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create task
router.post('/', verifyJWT, async (req, res) => {
  try {
    const task = new Task(req.body);
    const created = await task.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update task
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

// Delete task
router.delete('/:id', verifyJWT, async (req, res) => {
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
