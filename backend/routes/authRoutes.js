const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyJWT } = require('../middleware/authMiddleware');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'smileflow_secret', {
    expiresIn: '30d'
  });
};

const ADMIN_NAMES = ["Dr. Jatin", "Dr. Dimpal", "Super Admin"];

// @desc    Register a new Admin user
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const trimmedName = name.trim();
    const isAdminName = ADMIN_NAMES.some(n => n.toLowerCase() === trimmedName.toLowerCase());

    if (!isAdminName) {
      return res.status(403).json({ message: 'Only authorized administrators can sign up.' });
    }

    const user = await User.create({
      name: trimmedName,
      email,
      password,
      role: 'Admin',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Auth user & get token (unified login)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
router.put('/profile', verifyJWT, async (req, res) => {
  const { name, phone, password, specialization, licenseNo } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = name || user.name;
      if (phone !== undefined) user.phone = phone;
      if (specialization !== undefined) user.specialization = specialization;
      if (licenseNo !== undefined) user.licenseNo = licenseNo;

      if (password) {
        user.password = password;
      }

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        specialization: updatedUser.specialization,
        licenseNo: updatedUser.licenseNo,
        token: generateToken(updatedUser._id)
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
