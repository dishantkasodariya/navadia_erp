const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');
const { validateObjectIdParam, EMAIL_RE, isAdmin } = require('../middleware/security');

router.param('id', validateObjectIdParam);

// Fields that only Admins (or the user themself) may see
const SENSITIVE_FIELDS = '-password -aadhaarNo -panNo -address -pincode -dateOfBirth -bloodGroup -emergencyContact -emergencyPhone -alternatePhone';
const projectionFor = (req, targetId) =>
  (isAdmin(req.user) || (targetId && targetId === req.user._id.toString())) ? '-password' : SENSITIVE_FIELDS;

const validateStaffInput = (body, isCreate) => {
  const { name, email, password, phone, aadhaarNo } = body;
  if (isCreate && (!name || !email || !password)) return 'Name, email and password are required';
  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length < 2 || name.length > 100)) {
    return 'Full Name must be between 2 and 100 characters';
  }
  if (email !== undefined && (typeof email !== 'string' || !EMAIL_RE.test(email.trim()))) {
    return 'A valid email address is required (e.g., staff@example.com)';
  }
  if (password !== undefined && (typeof password !== 'string' || password.length < 1 || password.length > 128)) {
    return 'Password must be between 1 and 128 characters';
  }
  if (phone) {
    const cleanPhone = String(phone).replace(/[\s-+()]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return 'Please enter a valid 10-digit mobile number';
    }
  }
  if (aadhaarNo) {
    const cleanAadhaar = String(aadhaarNo).replace(/\s+/g, '');
    if (!/^\d{12}$/.test(cleanAadhaar)) {
      return 'Aadhaar card must be exactly 12 digits';
    }
  }
  return null;
};

// Get all staff (Admins, Dentists, and Staff for directory & management)
router.get('/', verifyJWT, checkRole('Admin', 'Dentist', 'Staff'), async (req, res) => {
  try {
    const staff = await User.find().select('-password').sort({ name: 1 });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single staff member by ID
router.get('/:id', verifyJWT, checkRole('Admin', 'Dentist', 'Staff'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Staff member not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new staff or dentist member (Admin only)
router.post('/', verifyJWT, checkRole('Admin'), async (req, res) => {
  const {
    name, email, password, role, phone, specialization, licenseNo,
    alternatePhone, dateOfBirth, gender, bloodGroup,
    aadhaarNo, panNo, address, city, state, country, pincode,
    emergencyContact, emergencyPhone, joiningDate
  } = req.body;

  try {
    const validationError = validateStaffInput(req.body, true);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanAadhaar = aadhaarNo ? String(aadhaarNo).replace(/\s+/g, '') : undefined;
    const cleanPhone = phone ? String(phone).trim() : undefined;

    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    if (cleanPhone) {
      const phoneExists = await User.findOne({ phone: cleanPhone });
      if (phoneExists) {
        return res.status(400).json({ message: 'User with this phone number already exists' });
      }
    }

    if (cleanAadhaar) {
      const aadhaarExists = await User.findOne({ aadhaarNo: cleanAadhaar });
      if (aadhaarExists) {
        return res.status(400).json({ message: 'User with this Aadhaar card already exists' });
      }
    }

    // Capitalize role to match Mongoose enum ('Admin', 'Dentist', 'Staff')
    let finalRole = 'Staff';
    if (role) {
      const lower = role.toLowerCase();
      if (lower === 'admin') finalRole = 'Admin';
      else if (lower === 'dentist') finalRole = 'Dentist';
    }

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      plainPassword: password,
      role: finalRole,
      phone: cleanPhone || '',
      alternatePhone,
      dateOfBirth,
      gender: gender || '',
      bloodGroup,
      aadhaarNo: cleanAadhaar || '',
      panNo,
      address,
      city,
      state,
      country: country || 'India',
      pincode,
      emergencyContact,
      emergencyPhone,
      specialization: finalRole === 'Dentist' ? specialization : undefined,
      licenseNo: finalRole === 'Dentist' ? licenseNo : undefined,
      joiningDate: joiningDate || Date.now()
    });

    // Return all fields (exclude password)
    const created = await User.findById(user._id).select('-password');
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update staff member (Admin only)
router.put('/:id', verifyJWT, checkRole('Admin'), async (req, res) => {
  try {
    const validationError = validateStaffInput(req.body, false);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const cleanEmail = req.body.email ? req.body.email.trim().toLowerCase() : undefined;
    const cleanAadhaar = req.body.aadhaarNo ? String(req.body.aadhaarNo).replace(/\s+/g, '') : undefined;
    const cleanPhone = req.body.phone ? String(req.body.phone).trim() : undefined;

    // Check duplicates
    if (cleanEmail && cleanEmail !== user.email) {
      const emailExists = await User.findOne({ email: cleanEmail });
      if (emailExists) return res.status(400).json({ message: 'User with this email already exists' });
    }
    if (cleanPhone && cleanPhone !== user.phone) {
      const phoneExists = await User.findOne({ phone: cleanPhone, _id: { $ne: user._id } });
      if (phoneExists) return res.status(400).json({ message: 'User with this phone number already exists' });
    }
    if (cleanAadhaar && cleanAadhaar !== user.aadhaarNo) {
      const aadhaarExists = await User.findOne({ aadhaarNo: cleanAadhaar, _id: { $ne: user._id } });
      if (aadhaarExists) return res.status(400).json({ message: 'User with this Aadhaar card already exists' });
    }

    // Basic fields
    if (req.body.name) user.name = req.body.name.trim();
    if (cleanEmail) user.email = cleanEmail;
    if (req.body.role) {
      const lower = req.body.role.toLowerCase();
      if (lower === 'admin') user.role = 'Admin';
      else if (lower === 'dentist') user.role = 'Dentist';
      else user.role = 'Staff';
    }

    // Password update if provided
    if (req.body.password && typeof req.body.password === 'string' && req.body.password.trim()) {
      user.password = req.body.password.trim();
      user.plainPassword = req.body.password.trim();
    }

    // Contact
    if (req.body.phone !== undefined) user.phone = cleanPhone || '';
    if (req.body.alternatePhone !== undefined) user.alternatePhone = req.body.alternatePhone;

    // Personal
    if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth;
    if (req.body.gender !== undefined) user.gender = req.body.gender;
    if (req.body.bloodGroup !== undefined) user.bloodGroup = req.body.bloodGroup;

    // Documents
    if (req.body.aadhaarNo !== undefined) user.aadhaarNo = cleanAadhaar || '';
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
    if (req.body.joiningDate !== undefined) user.joiningDate = req.body.joiningDate;

    const updatedUser = await user.save();
    const result = await User.findById(updatedUser._id).select('-password');
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete staff member (Admin only)
router.delete('/:id', verifyJWT, checkRole('Admin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
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
