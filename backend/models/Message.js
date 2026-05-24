const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  receiver: {
    type: String, // Can be a User ObjectId or "broadcast"
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  voiceNote: {
    type: String // Base64 encoded audio string or audio file URL
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema);
