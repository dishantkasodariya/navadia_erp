const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'smileflow_secret', {
    expiresIn: '30d'
  });
};

// Constant lists based on requirements
const ALLOWED_STAFF = [
  "Naynaben", "Daxaben", "Gheshiben", "Sapna", "Sangitaben", 
  "Archanaben", "Urmila", "Unnati", "Shruti", "Chetna", 
  "Nikita", "Samir", "Shiwani", "Rekha", 
  "Dr. Jatin", "Dr. Dimpal"
];

const ALLOWED_DENTISTS = [
  "Dr. Jatin", "Dr. Dimpal", "Dr. Eva", "Dr. Archita", 
  "Dr. Sejal", "Dr. Shruti", "Dr. Pooja", "Dr. Mosam"
];

const ADMIN_NAMES = ["Dr. Jatin", "Dr. Dimpal"];

// @desc    Register a new user
router.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const trimmedName = name.trim();
    let finalRole = role ? role.toUpperCase() : 'STAFF';

    // Validation Logic
    const isStaffName = ALLOWED_STAFF.some(n => n.toLowerCase() === trimmedName.toLowerCase());
    const isDentistName = ALLOWED_DENTISTS.some(n => n.toLowerCase() === trimmedName.toLowerCase());
    const isAdminName = ADMIN_NAMES.some(n => n.toLowerCase() === trimmedName.toLowerCase());

    // Prevent anyone else from becoming Admin
    if (finalRole === 'ADMIN' && !isAdminName) {
      return res.status(403).json({ message: 'Only authorized administrators can sign up as Admin.' });
    }

    // Assign ADMIN if it's Jatin or Dimpal
    if (isAdminName) {
      finalRole = 'ADMIN';
    } else {
      // General restrictions
      if (finalRole === 'STAFF' || finalRole === 'RECEPTIONIST') {
        if (!isStaffName) return res.status(403).json({ message: 'Name not authorized for Staff signup.' });
      } else if (finalRole === 'DENTIST') {
        if (!isDentistName) return res.status(403).json({ message: 'Name not authorized for Dentist signup.' });
      }
    }

    const user = await User.create({
      name: trimmedName,
      email,
      password,
      role: finalRole,
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

// @desc    Auth user & get token
router.post('/login', async (req, res) => {
  const { email, password, portalRole } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      const userRole = user.role.toUpperCase();
      const portalType = portalRole ? portalRole.toUpperCase() : 'STAFF';

      // Restriction: Only Staff members are allowed to log in? 
      // User said: "Only Staff members are allowed to log in." 
      // But also: "Dentists should not be able to log in through the staff login system."
      // And: "For the Dentist section, only the following names are allowed..."
      
      // I'll interpret "Only staff allowed to login" as portal-specific enforcement
      if (portalType === 'STAFF' && userRole === 'DENTIST') {
        return res.status(403).json({ message: 'Dentists cannot log in via the Staff portal.' });
      }

      if (portalType === 'DENTIST' && userRole !== 'DENTIST' && userRole !== 'ADMIN') {
         return res.status(403).json({ message: 'Only Dentists can log in via this portal.' });
      }

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

module.exports = router;

