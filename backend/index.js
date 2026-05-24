const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const User = require('./models/User');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Map to track active users: userId -> array of socketIds
const onlineUsers = new Map();

// Socket.io JWT authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smileflow_secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error: Token invalid'));
  }
});

// Handle Socket.io connection
io.on('connection', (socket) => {
  const userId = socket.user._id.toString();
  
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, []);
  }
  onlineUsers.get(userId).push(socket.id);
  console.log(`Socket Connected: ${socket.user.name} (${userId})`);

  socket.emit('joined', { userId });

  socket.on('disconnect', () => {
    if (onlineUsers.has(userId)) {
      const remainingSockets = onlineUsers.get(userId).filter(id => id !== socket.id);
      if (remainingSockets.length === 0) {
        onlineUsers.delete(userId);
      } else {
        onlineUsers.set(userId, remainingSockets);
      }
    }
    console.log(`Socket Disconnected: ${socket.user.name}`);
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Share socket io and online users map with our routes
app.use((req, res, next) => {
  req.io = io;
  req.onlineUsers = onlineUsers;
  next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));
app.use('/api/voicemails', require('./routes/voicemailRoutes'));
app.use('/api/settings', require('./routes/clinicSettingRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

app.get('/', (req, res) => {
  res.send('Smile Flow API is running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

