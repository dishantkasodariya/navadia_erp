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

const validateDentistInput = (body, isCreate) => {
  const { name, email, password, aadhaarNo, phone } = body;
  if (isCreate && (!name || !email || !password)) return 'Name, email and password are required';
  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length < 2 || name.length > 100)) {
    return 'Full Name must be between 2 and 100 characters';
  }
  if (email !== undefined && (typeof email !== 'string' || !EMAIL_RE.test(email.trim()))) {
    return 'A valid email address is required (e.g., doctor@example.com)';
  }
  if (password !== undefined && (typeof password !== 'string' || password.length < 8 || password.length > 128)) {
    return 'Password must be between 8 and 128 characters';
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

// Get all dentists (Admins, Dentists, and Staff)
router.get('/', verifyJWT, checkRole('Admin', 'Dentist', 'Staff'), async (req, res) => {
  try {
    if (isAdmin(req.user)) {
      const dentists = await User.find({ role: 'Dentist' }).select('-password').sort({ name: 1 });
      return res.json(dentists);
    }
    const dentists = await User.find({ role: 'Dentist' }).select(SENSITIVE_FIELDS).sort({ name: 1 }).lean();
    const me = await User.findById(req.user._id).select('-password').lean();
    res.json(dentists.map(u => (u._id.toString() === req.user._id.toString() ? me : u)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single dentist by ID
router.get('/:id', verifyJWT, checkRole('Admin', 'Dentist', 'Staff'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Dentist not found' });
    }
    const user = await User.findOne({ _id: req.params.id, role: 'Dentist' }).select(projectionFor(req, req.params.id));
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Dentist not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new Dentist (Admin only)
router.post('/', verifyJWT, checkRole('Admin'), async (req, res) => {
  const {
    name, email, password, phone, specialization, licenseNo,
    alternatePhone, dateOfBirth, gender, bloodGroup,
    aadhaarNo, panNo, address, city, state, country, pincode,
    emergencyContact, emergencyPhone, joiningDate
  } = req.body;

  try {
    const validationError = validateDentistInput(req.body, true);
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

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: 'Dentist',
      phone: cleanPhone,
      alternatePhone,
      dateOfBirth,
      gender: gender || '',
      bloodGroup,
      aadhaarNo: cleanAadhaar,
      panNo,
      address,
      city: city || 'Surat',
      state: state || 'Gujarat',
      country: country || 'India',
      pincode,
      emergencyContact,
      emergencyPhone,
      specialization: specialization ? specialization.trim() : 'General Dentistry',
      licenseNo: licenseNo ? licenseNo.trim() : undefined,
      joiningDate: joiningDate || Date.now()
    });

    const created = await User.findById(user._id).select('-password');
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update dentist (Admin only)
router.put('/:id', verifyJWT, checkRole('Admin'), async (req, res) => {
  try {
    const validationError = validateDentistInput(req.body, false);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Dentist not found' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Dentist not found' });
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
      const phoneExists = await User.findOne({ phone: cleanPhone });
      if (phoneExists) return res.status(400).json({ message: 'User with this phone number already exists' });
    }
    if (cleanAadhaar && cleanAadhaar !== user.aadhaarNo) {
      const aadhaarExists = await User.findOne({ aadhaarNo: cleanAadhaar });
      if (aadhaarExists) return res.status(400).json({ message: 'User with this Aadhaar card already exists' });
    }

    // Basic fields
    if (req.body.name) user.name = req.body.name.trim();
    if (cleanEmail) user.email = cleanEmail;
    user.role = 'Dentist'; // Guaranteed Dentist

    // Contact
    if (cleanPhone !== undefined) user.phone = cleanPhone;
    if (req.body.alternatePhone !== undefined) user.alternatePhone = req.body.alternatePhone;

    // Personal
    if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth;
    if (req.body.gender !== undefined) user.gender = req.body.gender;
    if (req.body.bloodGroup !== undefined) user.bloodGroup = req.body.bloodGroup;

    // Documents
    if (cleanAadhaar !== undefined) user.aadhaarNo = cleanAadhaar;
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

    // Professional Dentist fields
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

// Delete dentist (Admin only)
router.delete('/:id', verifyJWT, checkRole('Admin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Dentist not found' });
    }
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const user = await User.findById(req.params.id);
    if (user) {
      await user.deleteOne();
      res.json({ message: 'Dentist removed successfully' });
    } else {
      res.status(404).json({ message: 'Dentist not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
