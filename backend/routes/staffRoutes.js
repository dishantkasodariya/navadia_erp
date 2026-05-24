const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');

// Get all staff (Admins, Dentists, and Staff for chat directory)
router.get('/', verifyJWT, checkRole('Admin', 'Dentist', 'Staff'), async (req, res) => {
  try {
    const staff = await User.find().select('-password').sort({ name: 1 });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new staff or dentist member (Admin only)
router.post('/', verifyJWT, checkRole('Admin'), async (req, res) => {
  const { name, email, password, role, phone, specialization, licenseNo } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Capitalize role to match Mongoose enum ('Admin', 'Dentist', 'Staff')
    let finalRole = 'Staff';
    if (role) {
      const lower = role.toLowerCase();
      if (lower === 'admin') finalRole = 'Admin';
      else if (lower === 'dentist') finalRole = 'Dentist';
    }

    const user = await User.create({
      name,
      email,
      password,
      role: finalRole,
      phone,
      specialization: finalRole === 'Dentist' ? specialization : undefined,
      licenseNo: finalRole === 'Dentist' ? licenseNo : undefined
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update staff member (Admin only)
router.put('/:id', verifyJWT, checkRole('Admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.role) {
        const lower = req.body.role.toLowerCase();
        if (lower === 'admin') user.role = 'Admin';
        else if (lower === 'dentist') user.role = 'Dentist';
        else user.role = 'Staff';
      }
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

// Delete staff member (Admin only)
router.delete('/:id', verifyJWT, checkRole('Admin'), async (req, res) => {
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
