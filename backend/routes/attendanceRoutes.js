const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/authMiddleware');

// Get attendance for all or specific user
router.get('/', protect, async (req, res) => {
  const { userId, date } = req.query;
  let query = {};
  if (userId) query.userId = userId;
  if (date) query.date = date;

  try {
    const attendance = await Attendance.find(query).sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark attendance (Check-in)
router.post('/check-in', protect, async (req, res) => {
  const { userId, userName, date, checkIn } = req.body;
  try {
    let attendance = await Attendance.findOne({ userId, date });
    if (attendance) {
      return res.status(400).json({ message: 'Already checked in for today' });
    }
    attendance = new Attendance({ userId, userName, date, checkIn, status: 'Present' });
    await attendance.save();
    res.status(201).json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Check-out
router.post('/check-out', protect, async (req, res) => {
  const { userId, date, checkOut } = req.body;
  try {
    const attendance = await Attendance.findOne({ userId, date });
    if (attendance) {
      attendance.checkOut = checkOut;
      await attendance.save();
      res.json(attendance);
    } else {
      res.status(404).json({ message: 'Attendance record not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
