const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');
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
    if (aadhaarNo && !/^\d{12}$/.test(aadhaarNo)) {
      return res.status(400).json({ message: 'Aadhaar card must be exactly 12 digits' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ message: 'User with this phone number already exists' });
      }
    }

    if (aadhaarNo) {
      const aadhaarExists = await User.findOne({ aadhaarNo });
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
      name,
      email,
      password,
      role: finalRole,
      phone,
      alternatePhone,
      dateOfBirth,
      gender: gender || '',
      bloodGroup,
      aadhaarNo,
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
    if (req.body.aadhaarNo && !/^\d{12}$/.test(req.body.aadhaarNo)) {
      return res.status(400).json({ message: 'Aadhaar card must be exactly 12 digits' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Check duplicates
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) return res.status(400).json({ message: 'User with this email already exists' });
    }
    if (req.body.phone && req.body.phone !== user.phone) {
      const phoneExists = await User.findOne({ phone: req.body.phone });
      if (phoneExists) return res.status(400).json({ message: 'User with this phone number already exists' });
    }
    if (req.body.aadhaarNo && req.body.aadhaarNo !== user.aadhaarNo) {
      const aadhaarExists = await User.findOne({ aadhaarNo: req.body.aadhaarNo });
      if (aadhaarExists) return res.status(400).json({ message: 'User with this Aadhaar card already exists' });
    }

    // Basic fields
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.role) {
      const lower = req.body.role.toLowerCase();
      if (lower === 'admin') user.role = 'Admin';
      else if (lower === 'dentist') user.role = 'Dentist';
      else user.role = 'Staff';
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
