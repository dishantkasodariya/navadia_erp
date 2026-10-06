const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyJWT } = require('../middleware/authMiddleware');
const { getJwtSecret, rateLimit, EMAIL_RE, escapeRegex } = require('../middleware/security');

const generateToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT || 20),
  message: 'Too many login attempts. Please try again in 15 minutes.'
});

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

// @desc    Register a new Admin user
// Security: previously ANY visitor could become Admin by typing an admin's name.
// Now signup is only allowed to bootstrap the very first admin, or when
// ALLOW_ADMIN_SIGNUP=true is set explicitly. All other accounts are created by
// an admin via POST /api/staff.
router.post('/signup', authLimiter, async (req, res) => {
  const { name, email, password } = req.body || {};

  try {
    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (!EMAIL_RE.test(email) || name.length > 100 || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Invalid email, name (max 100 chars) or password (8-128 chars)' });
    }

    const adminCount = await User.countDocuments({ role: 'Admin' });
    if (adminCount > 0 && process.env.ALLOW_ADMIN_SIGNUP !== 'true') {
      return res.status(403).json({ message: 'Public signup is disabled. Ask an administrator to create your account.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'Admin',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Signup failed' });
  }
});

// @desc    Auth user & get token (unified login)
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email.trim())}$`, 'i') });

    if (user && user.isActive !== false && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        alternatePhone: user.alternatePhone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        aadhaarNo: user.aadhaarNo,
        panNo: user.panNo,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        pincode: user.pincode,
        emergencyContact: user.emergencyContact,
        emergencyPhone: user.emergencyPhone,
        specialization: user.specialization,
        licenseNo: user.licenseNo,
        joiningDate: user.joiningDate,
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
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Basic
    if (req.body.name) user.name = req.body.name;
    if (req.body.password) {
      if (typeof req.body.password !== 'string' || req.body.password.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters' });
      }
      if (!req.body.currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password' });
      }
      const isMatch = await user.comparePassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect current password' });
      }
      user.password = req.body.password;
    }

    // Contact
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.alternatePhone !== undefined) user.alternatePhone = req.body.alternatePhone;

    // Personal
    if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth;
    if (req.body.gender !== undefined) user.gender = req.body.gender;
    if (req.body.bloodGroup !== undefined) user.bloodGroup = req.body.bloodGroup;

    // Documents
    if (req.body.aadhaarNo !== undefined) user.aadhaarNo = req.body.aadhaarNo;
    if (req.body.panNo !== undefined) user.panNo = req.body.panNo;

    // Address
    if (req.body.address !== undefined) user.address = req.body.address;
    if (req.body.city !== undefined) user.city = req.body.city;
    if (req.body.state !== undefined) user.state = req.body.state;
    if (req.body.country !== undefined) user.country = req.body.country;
    if (req.body.pincode !== undefined) user.pincode = req.body.pincode;

    // Emergency
    if (req.body.emergencyContact !== undefined) user.emergencyContact = req.body.emergencyContact;
    if (req.body.emergencyPhone !== undefined) user.emergencyPhone = req.body.emergencyPhone;

    // Professional
    if (req.body.specialization !== undefined) user.specialization = req.body.specialization;
    if (req.body.licenseNo !== undefined) user.licenseNo = req.body.licenseNo;

    const updatedUser = await user.save();
    const result = await User.findById(updatedUser._id).select('-password');
    res.json({
      ...result.toObject(),
      token: generateToken(updatedUser._id)
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
