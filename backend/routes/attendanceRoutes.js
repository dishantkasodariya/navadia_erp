const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const ClinicSetting = require('../models/ClinicSetting');
const { verifyJWT } = require('../middleware/authMiddleware');

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

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
  const { userId, userName, date, checkIn, status, latitude, longitude, deviceInfo, browserInfo } = req.body;
  console.log('📥 Check-in request:', { userId, userName, date, checkIn, status, latitude, longitude });
  try {
    // 1. Fetch clinic settings to check geofencing
    const settings = await ClinicSetting.findOne();
    let locationVerified = true;

    if (settings && settings.geofencingEnabled) {
      if (latitude === undefined || longitude === undefined) {
        if (settings.gpsVerificationEnabled) {
          return res.status(400).json({ message: "GPS coordinates are required to verify location." });
        } else {
          locationVerified = false;
        }
      } else {
        const distance = getDistanceInMeters(latitude, longitude, settings.latitude, settings.longitude);
        if (distance > settings.allowedRadius) {
          if (settings.gpsVerificationEnabled) {
            return res.status(400).json({ message: "You are outside the clinic location. Please go to the clinic to mark attendance." });
          } else {
            locationVerified = false;
          }
        }
      }
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "";

    let attendance = await Attendance.findOne({ userId, date });
    if (attendance) {
      console.log('✏️  Updating existing check-in record');
      attendance.checkIn = checkIn;
      attendance.status = status || 'Present';
      attendance.checkInLatitude = latitude;
      attendance.checkInLongitude = longitude;
      attendance.deviceInfo = deviceInfo || attendance.deviceInfo;
      attendance.browserInfo = browserInfo || attendance.browserInfo;
      attendance.ipAddress = ipAddress;
      attendance.locationVerified = locationVerified;
      await attendance.save();
      console.log('✅ Updated attendance saved to MongoDB:', attendance);
      return res.json(attendance);
    }
    
    console.log('🆕 Creating new attendance record');
    attendance = new Attendance({ 
      userId, 
      userName, 
      date, 
      checkIn, 
      status: status || 'Present',
      checkInLatitude: latitude,
      checkInLongitude: longitude,
      deviceInfo,
      browserInfo,
      ipAddress,
      locationVerified
    });
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
  const { userId, date, checkOut, status, breakTime, latitude, longitude, workingHours, overtime, breakCount, breaks } = req.body;
  console.log('📤 Check-out request:', { userId, date, checkOut, status, breakTime, latitude, longitude });
  try {
    // 1. Fetch clinic settings to check geofencing
    const settings = await ClinicSetting.findOne();
    let locationVerified = true;

    if (settings && settings.geofencingEnabled) {
      if (latitude === undefined || longitude === undefined) {
        if (settings.gpsVerificationEnabled) {
          return res.status(400).json({ message: "GPS coordinates are required to verify location." });
        } else {
          locationVerified = false;
        }
      } else {
        const distance = getDistanceInMeters(latitude, longitude, settings.latitude, settings.longitude);
        if (distance > settings.allowedRadius) {
          if (settings.gpsVerificationEnabled) {
            return res.status(400).json({ message: "You are outside the clinic location. Please return to the clinic before checking out." });
          } else {
            locationVerified = false;
          }
        }
      }
    }

    let attendance = await Attendance.findOne({ userId, date });
    if (!attendance) {
      console.log('🆕 Card not found, creating new record');
      attendance = new Attendance({ 
        userId, 
        date, 
        checkOut, 
        status: status || 'Present', 
        breakTime: breakTime || 0,
        checkOutLatitude: latitude,
        checkOutLongitude: longitude,
        workingHours: workingHours || 0,
        overtime: overtime || 0,
        breakCount: breakCount || 0,
        breaks: breaks || [],
        locationVerified
      });
      const User = require('../models/User');
      const u = await User.findById(userId);
      attendance.userName = u ? u.name : 'Staff';
      await attendance.save();
      console.log('✅ New record saved on checkout:', attendance);
      return res.json(attendance);
    }
    
    console.log('✏️  Updating existing checkout record');
    attendance.checkOut = checkOut;
    if (status) attendance.status = status;
    if (breakTime !== undefined) attendance.breakTime = breakTime;
    attendance.checkOutLatitude = latitude;
    attendance.checkOutLongitude = longitude;
    if (workingHours !== undefined) attendance.workingHours = workingHours;
    if (overtime !== undefined) attendance.overtime = overtime;
    if (breakCount !== undefined) attendance.breakCount = breakCount;
    if (breaks !== undefined) attendance.breaks = breaks;
    attendance.locationVerified = locationVerified && attendance.locationVerified;
    
    await attendance.save();
    console.log('✅ Checkout saved to MongoDB:', attendance);
    res.json(attendance);
  } catch (error) {
    console.error('❌ Check-out error:', error.message);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
