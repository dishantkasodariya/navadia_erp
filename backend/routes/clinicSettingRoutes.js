const express = require('express');
const router = express.Router();
const ClinicSetting = require('../models/ClinicSetting');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');

// Get clinic settings
router.get('/', verifyJWT, async (req, res) => {
  try {
    let settings = await ClinicSetting.findOne();
    if (!settings) {
      settings = await ClinicSetting.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update clinic settings (Admin only)
router.put('/', verifyJWT, checkRole('Admin'), async (req, res) => {
  try {
    let settings = await ClinicSetting.findOne();
    if (!settings) {
      settings = new ClinicSetting({});
    }
    
    settings.clinicName = req.body.clinicName !== undefined ? req.body.clinicName : settings.clinicName;
    settings.email = req.body.email !== undefined ? req.body.email : settings.email;
    settings.phone = req.body.phone !== undefined ? req.body.phone : settings.phone;
    settings.address = req.body.address !== undefined ? req.body.address : settings.address;
    settings.workingHours = req.body.workingHours !== undefined ? req.body.workingHours : settings.workingHours;
    settings.latitude = req.body.latitude !== undefined ? req.body.latitude : settings.latitude;
    settings.longitude = req.body.longitude !== undefined ? req.body.longitude : settings.longitude;
    settings.allowedRadius = req.body.allowedRadius !== undefined ? req.body.allowedRadius : settings.allowedRadius;
    settings.geofencingEnabled = req.body.geofencingEnabled !== undefined ? req.body.geofencingEnabled : settings.geofencingEnabled;
    settings.gpsVerificationEnabled = req.body.gpsVerificationEnabled !== undefined ? req.body.gpsVerificationEnabled : settings.gpsVerificationEnabled;
    settings.weekendDays = req.body.weekendDays !== undefined ? req.body.weekendDays : settings.weekendDays;
    settings.holidays = req.body.holidays !== undefined ? req.body.holidays : settings.holidays;
    settings.updatedAt = Date.now();

    const saved = await settings.save();
    res.json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
