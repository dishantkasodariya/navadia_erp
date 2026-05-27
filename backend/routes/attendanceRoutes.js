const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { verifyJWT } = require('../middleware/authMiddleware');

// Get attendance for all or specific user
router.get('/', verifyJWT, async (req, res) => {
  const { userId, date } = req.query;
  let query = {};
  if (userId) query.userId = userId;
  if (date) query.date = date;

  try {
    console.log('Fetching attendance with query:', query);
    const attendance = await Attendance.find(query).sort({ date: -1 });
    console.log('Found records:', attendance.length);
    res.json(attendance);
  } catch (error) {
    console.error('Attendance fetch error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Mark attendance (Check-in)
router.post('/check-in', verifyJWT, async (req, res) => {
  const { userId, userName, date, checkIn, status } = req.body;
  console.log('📥 Check-in request:', { userId, userName, date, checkIn, status });
  try {
    let attendance = await Attendance.findOne({ userId, date });
    if (attendance) {
      // Update existing record instead of rejecting
      console.log('✏️  Updating existing check-in record');
      attendance.checkIn = checkIn;
      attendance.status = status || 'Present';
      await attendance.save();
      console.log('✅ Updated attendance saved to MongoDB:', attendance);
      return res.json(attendance);
    }
    console.log('🆕 Creating new attendance record');
    attendance = new Attendance({ userId, userName, date, checkIn, status: status || 'Present' });
    await attendance.save();
    console.log('✅ New attendance saved to MongoDB:', attendance);
    res.status(201).json(attendance);
  } catch (error) {
    console.error('❌ Check-in error:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// Check-out
router.post('/check-out', verifyJWT, async (req, res) => {
  const { userId, date, checkOut, status } = req.body;
  console.log('📤 Check-out request:', { userId, date, checkOut, status });
  try {
    let attendance = await Attendance.findOne({ userId, date });
    if (!attendance) {
      // Create new record if doesn't exist (fallback)
      console.log('🆕 Card not found, creating new record');
      attendance = new Attendance({ userId, date, checkOut, status: status || 'Present' });
      await attendance.save();
      console.log('✅ New record saved on checkout:', attendance);
      return res.json(attendance);
    }
    // Update existing record
    console.log('✏️  Updating existing checkout record');
    attendance.checkOut = checkOut;
    if (status) attendance.status = status;
    await attendance.save();
    console.log('✅ Checkout saved to MongoDB:', attendance);
    res.json(attendance);
  } catch (error) {
    console.error('❌ Check-out error:', error.message);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
