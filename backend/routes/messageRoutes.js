const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { verifyJWT } = require('../middleware/authMiddleware');

// All message routes are protected
router.use(verifyJWT);

// Helper to broadcast socket event to recipient and sender
const emitSocketEvent = (req, eventName, data, receiverId, senderId) => {
  const io = req.io;
  const onlineUsers = req.onlineUsers;
  
  if (!io || !onlineUsers) return;

  if (receiverId === 'broadcast') {
    io.emit(eventName, data);
  } else {
    // Send to receiver sockets
    const receiverSockets = onlineUsers.get(receiverId) || [];
    receiverSockets.forEach(socketId => {
      io.to(socketId).emit(eventName, data);
    });

    // Send to sender sockets for sync across multiple tabs/devices
    if (senderId) {
      const senderSockets = onlineUsers.get(senderId) || [];
      senderSockets.forEach(socketId => {
        io.to(socketId).emit(eventName, data);
      });
    }
  }
};

// @desc    Get all messages involving current user
// @route   GET /api/messages
router.get('/', async (req, res) => {
  try {
    const userIdStr = req.user._id.toString();
    const messages = await Message.find({
      $or: [
        { sender: req.user._id },
        { receiver: userIdStr },
        { receiver: 'broadcast' }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create and save a new message
// @route   POST /api/messages
router.post('/', async (req, res) => {
  const { receiver, content, voiceNote } = req.body;

  if (!receiver) {
    return res.status(400).json({ message: 'Receiver is required' });
  }

  try {
    const message = await Message.create({
      sender: req.user._id,
      senderName: req.user.name,
      receiver,
      content: content || '',
      voiceNote,
      isEdited: false,
      isRead: false
    });

    // Emit live event
    emitSocketEvent(
      req, 
      'receive_message', 
      message, 
      receiver, 
      req.user._id.toString()
    );

    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Edit an existing message
// @route   PUT /api/messages/:id
router.put('/:id', async (req, res) => {
  const { content, voiceNote } = req.body;

  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can edit
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    message.content = content !== undefined ? content : message.content;
    if (voiceNote !== undefined) {
      message.voiceNote = voiceNote;
    }
    message.isEdited = true;

    const updatedMessage = await message.save();

    // Emit live edit event
    emitSocketEvent(
      req, 
      'message_edited', 
      updatedMessage, 
      updatedMessage.receiver, 
      req.user._id.toString()
    );

    res.json(updatedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete a message
// @route   DELETE /api/messages/:id
router.delete('/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    const receiverId = message.receiver;
    const senderId = message.sender.toString();
    const msgId = message._id.toString();

    await message.deleteOne();

    // Emit live delete event
    emitSocketEvent(
      req, 
      'message_deleted', 
      { id: msgId }, 
      receiverId, 
      senderId
    );

    res.json({ message: 'Message deleted successfully', id: msgId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Mark a message as read
// @route   PUT /api/messages/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.isRead = true;
    const updatedMessage = await message.save();

    // Emit live read event (notify the sender that receiver read the message)
    emitSocketEvent(
      req, 
      'message_read', 
      { id: updatedMessage._id.toString() }, 
      updatedMessage.sender.toString(), // Send to sender to update read tick
      null
    );

    res.json(updatedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

