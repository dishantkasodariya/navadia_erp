const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');
// Get all tasks (filtered by role and daily recurrence)
router.get('/', verifyJWT, async (req, res) => {
  try {
    const todayStr = req.query.todayDate || new Date().toISOString().split('T')[0];
    let query = {};
    if (req.user.role.toLowerCase() !== 'admin') {
      query = {
        $or: [
          { assignedTo: req.user._id.toString() },
          { createdBy: req.user._id.toString() },
          { 
            isRecurring: true, 
            role: { $regex: new RegExp(`^${req.user.role}$`, 'i') },
            $or: [
              { assignedTo: { $exists: false } },
              { assignedTo: "" },
              { assignedTo: null }
            ]
          }
        ]
      };
    } else {
      // Admins see all tasks (non-recurring and recurring) to allow full CRUD
      query = {};
    }
    const tasks = await Task.find(query).sort({ createdAt: -1 });
    
    const mappedTasks = tasks.map(t => {
      const taskObj = t.toObject();
      if (taskObj.isRecurring) {
        const isCompletedToday = taskObj.completions && taskObj.completions.some(
          c => c.userId === req.user._id.toString() && c.date === todayStr
        );
        taskObj.status = isCompletedToday ? 'completed' : 'pending';
      }
      return taskObj;
    });
    
    res.json(mappedTasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create task (Admin, Dentist, Staff)
router.post('/', verifyJWT, async (req, res) => {
  const { title, description, assignedTo, role, priority, dueDate, isRecurring } = req.body;
  try {
    if (isRecurring && req.user.role.toLowerCase() === 'admin') {
      // Admin creates exactly one repeating task assigned to a role group or a specific user
      const task = new Task({
        title,
        description,
        assignedTo: assignedTo || '',
        role: role || 'Staff',
        priority,
        dueDate: '',
        isRecurring: true,
        createdBy: req.user._id,
        createdByName: req.user.name
      });
      const created = await task.save();

      if (req.io) {
        req.io.emit('task_assigned', created);
      }
      
      return res.status(201).json(created);
    }

    // Normal task creation (non-recurring, or private task)
    const task = new Task({
      title,
      description,
      assignedTo: assignedTo || req.user._id.toString(),
      role: role,
      priority,
      dueDate,
      isRecurring: !!isRecurring,
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
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isCreator = task.createdBy === req.user._id.toString();
    const isAssignee = task.assignedTo === req.user._id.toString();
    const isAdmin = req.user.role.toLowerCase() === 'admin';
    const isRoleMatch = task.isRecurring && task.role && task.role.toLowerCase() === req.user.role.toLowerCase();

    if (!isAdmin && !isCreator && !isAssignee && !isRoleMatch) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    if (isAdmin || isCreator) {
      // Admin or Creator can edit everything
      Object.assign(task, req.body);
    } else if (isAssignee || isRoleMatch) {
      // Only allow updating status
      if (req.body.status) {
        task.status = req.body.status;
      } else {
        return res.status(403).json({ message: 'You can only update the status of this task' });
      }
    }

    // If it's a recurring task, manage its completions per-user history
    if (task.isRecurring && req.body.status) {
      const todayStr = req.body.completedDate || new Date().toISOString().split('T')[0];
      const userIdStr = req.user._id.toString();
      
      if (req.body.status === 'completed') {
        const exists = task.completions.some(c => c.userId === userIdStr && c.date === todayStr);
        if (!exists) {
          task.completions.push({ userId: userIdStr, date: todayStr });
        }
      } else if (req.body.status === 'pending') {
        task.completions = task.completions.filter(c => !(c.userId === userIdStr && c.date === todayStr));
      }
      task.markModified('completions');
      task.status = 'pending'; // Keep base recurring task open in DB
    }

    await task.save();

    const responseObj = task.toObject();
    if (responseObj.isRecurring) {
      const todayStr = req.body.completedDate || new Date().toISOString().split('T')[0];
      const isCompletedToday = responseObj.completions && responseObj.completions.some(
        c => c.userId === req.user._id.toString() && c.date === todayStr
      );
      responseObj.status = isCompletedToday ? 'completed' : 'pending';
    }
    
    res.json(responseObj);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete task (Admin or Creator)
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isCreator = task.createdBy === req.user._id.toString();
    const isAdmin = req.user.role.toLowerCase() === 'admin';

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await task.deleteOne();
    res.json({ message: 'Task removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
