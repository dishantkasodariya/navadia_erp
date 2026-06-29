const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');

// Get all audit logs (Admin only)
router.get('/', verifyJWT, checkRole('Admin'), async (req, res) => {
  try {
    const { employeeId } = req.query;
    let query = {};
    if (employeeId) {
      query.employeeId = employeeId;
    }
    const logs = await AuditLog.find(query).sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
