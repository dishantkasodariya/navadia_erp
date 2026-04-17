const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');

// Get all staff (Admin only)
router.get('/', verifyJWT, checkRole('ADMIN'), async (req, res) => {
  try {
    const staff = await User.find().select('-password').sort({ name: 1 });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update staff member
router.put('/:id', verifyJWT, checkRole('ADMIN'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.phone = req.body.phone || user.phone;
      user.specialization = req.body.specialization || user.specialization;
      user.licenseNo = req.body.licenseNo || user.licenseNo;
      
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      });
    } else {
      res.status(404).json({ message: 'Staff member not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete staff member
router.delete('/:id', verifyJWT, checkRole('ADMIN'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      await user.deleteOne();
      res.json({ message: 'Staff member removed' });
    } else {
      res.status(404).json({ message: 'Staff member not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
