const express = require('express');
const router = express.Router();
const Voicemail = require('../models/Voicemail');
const { protect } = require('../middleware/authMiddleware');

// Get all voicemails
router.get('/', protect, async (req, res) => {
  try {
    const voicemails = await Voicemail.find().sort({ createdAt: -1 });
    res.json(voicemails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const voicemail = await Voicemail.findById(req.params.id);
    if (voicemail) {
      voicemail.status = req.body.status;
      await voicemail.save();
      res.json(voicemail);
    } else {
      res.status(404).json({ message: 'Voicemail not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete voicemail
router.delete('/:id', protect, async (req, res) => {
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
