const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const { protect, authorize } = require('../middleware/authMiddleware');

// Get all leave requests
router.get('/', protect, async (req, res) => {
  try {
    const requests = await LeaveRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create leave request
router.post('/', protect, async (req, res) => {
  try {
    const request = new LeaveRequest({
      ...req.body,
      userId: req.user._id,
      userName: req.user.name
    });
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update status (Admin only)
router.patch('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    if (request) {
      request.status = req.body.status;
      await request.save();
      res.json(request);
    } else {
      res.status(404).json({ message: 'Request not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
