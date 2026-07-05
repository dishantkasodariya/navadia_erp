const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const ClinicSetting = require('../models/ClinicSetting');
const AuditLog = require('../models/AuditLog');
const { verifyJWT } = require('../middleware/authMiddleware');

const logAudit = async (employeeId, employeeName, action, req, previousValue = '', newValue = '') => {
  try {
    const performedBy = req.user ? req.user._id.toString() : 'system';
    const performedByName = req.user ? req.user.name : 'System';
    
    await AuditLog.create({
      employeeId,
      employeeName,
      action,
      performedBy,
      performedByName,
      previousValue: typeof previousValue === 'object' ? JSON.stringify(previousValue) : previousValue,
      newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : newValue
    });
    console.log(`[Audit Logged] ${action} for ${employeeName} by ${performedByName}`);
  } catch (err) {
    console.error('Audit Log creation failed:', err.message);
  }
};

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

    if (settings && settings.geofencingEnabled && req.user.role.toLowerCase() !== 'admin') {
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
            return res.status(400).json({ message: `You are outside the clinic location (approx. ${Math.round(distance)}m away). Please go to the clinic to mark attendance.` });
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
      const oldRecord = attendance.toObject();
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
      await logAudit(attendance.userId.toString(), attendance.userName, 'Manual Check-In', req, oldRecord, attendance.toObject());
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
    await logAudit(attendance.userId.toString(), attendance.userName, 'Attendance Created', req, '', attendance.toObject());
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

    if (settings && settings.geofencingEnabled && req.user.role.toLowerCase() !== 'admin') {
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
            return res.status(400).json({ message: `You are outside the clinic location (approx. ${Math.round(distance)}m away). Please return to the clinic before checking out.` });
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
      await logAudit(attendance.userId.toString(), attendance.userName, 'Manual Check-Out', req, '', attendance.toObject());
      return res.json(attendance);
    }
    
    console.log('✏️  Updating existing checkout record');
    const oldRecord = attendance.toObject();
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
    await logAudit(attendance.userId.toString(), attendance.userName, 'Manual Check-Out', req, oldRecord, attendance.toObject());
    res.json(attendance);
  } catch (error) {
    console.error('❌ Check-out error:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// Record break updates
router.post('/break', verifyJWT, async (req, res) => {
  const { userId, date, status, breakTime, breakCount, breaks } = req.body;
  try {
    let attendance = await Attendance.findOne({ userId, date });
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const oldRecord = attendance.toObject();
    if (status) attendance.status = status;
    if (breakTime !== undefined) attendance.breakTime = breakTime;
    if (breakCount !== undefined) attendance.breakCount = breakCount;
    if (breaks !== undefined) attendance.breaks = breaks;

    await attendance.save();
    console.log('✅ Real-time break status saved to MongoDB:', attendance);
    await logAudit(attendance.userId.toString(), attendance.userName, 'Attendance Updated', req, oldRecord, attendance.toObject());
    res.json(attendance);
  } catch (error) {
    console.error('❌ Break update error:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// Update attendance record by Admin
router.put('/:id', verifyJWT, async (req, res) => {
  try {
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update attendance logs.' });
    }
    
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }
    
    const oldRecord = attendance.toObject();
    
    if (req.body.checkIn !== undefined) attendance.checkIn = req.body.checkIn;
    if (req.body.checkOut !== undefined) attendance.checkOut = req.body.checkOut;
    if (req.body.status !== undefined) attendance.status = req.body.status;
    if (req.body.breakTime !== undefined) attendance.breakTime = req.body.breakTime;
    if (req.body.workingHours !== undefined) attendance.workingHours = req.body.workingHours;
    if (req.body.isApproved !== undefined) attendance.isApproved = req.body.isApproved;
    if (req.body.breaks !== undefined) attendance.breaks = req.body.breaks;
    
    await attendance.save();
    await logAudit(attendance.userId.toString(), attendance.userName, 'Attendance Updated', req, oldRecord, attendance.toObject());
    
    res.json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete attendance record by Admin
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete attendance logs.' });
    }
    
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }
    
    const oldRecord = attendance.toObject();
    await attendance.deleteOne();
    await logAudit(attendance.userId.toString(), attendance.userName, 'Attendance Deleted', req, oldRecord, '');
    
    res.json({ message: 'Attendance record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve attendance log by Admin
router.post('/approve/:id', verifyJWT, async (req, res) => {
  try {
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to approve attendance logs.' });
    }
    
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }
    
    const oldRecord = attendance.toObject();
    attendance.isApproved = true;
    await attendance.save();
    await logAudit(attendance.userId.toString(), attendance.userName, 'Attendance Approved', req, oldRecord, attendance.toObject());
    
    res.json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
