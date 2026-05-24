const express = require('express');
const router = express.Router();
const Voicemail = require('../models/Voicemail');
const { verifyJWT, checkRole } = require('../middleware/authMiddleware');

// Get all voicemails (filtered by user if not Admin)
router.get('/', verifyJWT, async (req, res) => {
  try {
    let query = {};
    if (req.user.role.toLowerCase() !== 'admin') {
      query = { assignedTo: req.user._id.toString() };
    }
    const voicemails = await Voicemail.find(query).sort({ createdAt: -1 });
    res.json(voicemails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create voicemail (Admin only)
router.post('/', verifyJWT, checkRole('Admin'), async (req, res) => {
  const { audioFile, assignedTo, message, createdBy } = req.body;
  try {
    const voicemail = new Voicemail({
      audioFile,
      assignedTo,
      message,
      createdBy: createdBy || req.user.name
    });
    const created = await voicemail.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete voicemail
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const voicemail = await Voicemail.findById(req.params.id);
    if (voicemail) {
      await voicemail.deleteOne();
      res.json({ message: 'Voicemail removed' });
    } else {
      res.status(404).json({ message: 'Voicemail not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
