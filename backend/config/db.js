const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const DEFAULT_USERS = [
  { name: "Super Admin", email: "super@navadia.com", password: "super", role: "Admin", phone: "+91 99999 99999" },
  { name: "Dr. Jatin Navadia", email: "jatin@navadia.com", password: "jatin", role: "Admin", phone: "+91 98765 43210" },
  { name: "Dr. Dimpal Navadia", email: "dimpal@navadia.com", password: "dimpal", role: "Admin", phone: "+91 98765 43211" },
  { name: "Dr. Eva", email: "eva@navadia.com", password: "eva", role: "Dentist", phone: "+91 00000 00001" },
  { name: "Dr. Archita", email: "archita@navadia.com", password: "archita", role: "Dentist", phone: "+91 00000 00002" },
  { name: "Dr. Sejal", email: "sejal@navadia.com", password: "sejal", role: "Dentist", phone: "+91 00000 00003" },
  { name: "Dr. Shruti", email: "shruti@navadia.com", password: "shruti", role: "Dentist", phone: "+91 00000 00004" },
  { name: "Dr. Pooja", email: "pooja@navadia.com", password: "pooja", role: "Dentist", phone: "+91 00000 00005" },
  { name: "Dr. Mosam", email: "mosam@navadia.com", password: "mosam", role: "Dentist", phone: "+91 00000 00006" },
];

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smileflow');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Seed default users if DB is empty
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('Seeding default users...');
      // Using User.create will trigger pre-save hooks (password hashing)
      await User.create(DEFAULT_USERS);
      console.log('Seeding completed successfully!');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
