const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');

// Helper to emit socket event
const emitSocketEvent = (req, eventName, data, receiverId) => {
  const io = req.io;
  const onlineUsers = req.onlineUsers;
  
  if (!io || !onlineUsers) return;

  if (receiverId === 'admin') {
    // Broadcast to all sockets, frontend will check if the user is Admin
    io.emit(eventName, data);
  } else {
    // Send to specific user sockets
    const receiverSockets = onlineUsers.get(receiverId) || [];
    receiverSockets.forEach(socketId => {
      io.to(socketId).emit(eventName, data);
    });
  }
};

// Get all leave requests
router.get('/', verifyJWT, async (req, res) => {
  try {
    const requests = await LeaveRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create leave request
router.post('/', verifyJWT, async (req, res) => {
  try {
    const request = new LeaveRequest({
      ...req.body,
      userId: req.user._id,
      userName: req.user.name
    });
    await request.save();

    // Emit live leave_applied event
    emitSocketEvent(req, 'leave_applied', request, 'admin');

    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update status (Admin only)
router.patch('/:id/status', verifyJWT, checkRole('Admin'), async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    if (request) {
      request.status = req.body.status;
      await request.save();

      // Emit live leave_updated event
      emitSocketEvent(req, 'leave_updated', request, request.userId.toString());

      res.json(request);
    } else {
      res.status(404).json({ message: 'Request not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
