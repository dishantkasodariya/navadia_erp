const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const DEFAULT_USERS = [
  { name: "Super Admin", email: "super@navadia.com", password: "super", role: "Admin", phone: "+91 99999 99999" },
  { name: "Dr. Jatin Navadia", email: "jatin@navadia.com", password: "jatin", role: "Admin", phone: "+91 98765 43210" },
  { name: "Dr. Dimpal Navadia", email: "dimpal@navadia.com", password: "dimpal", role: "Admin", phone: "+91 98765 43211" },
  { name: "Naynaben", email: "naynaben@navadia.com", password: "naynaben", role: "Staff" },
  { name: "Kiran", email: "kiran@navadia.com", password: "kiran", role: "Staff" },
  { name: "Sapana", email: "sapana@navadia.com", password: "sapana", role: "Staff" },
  { name: "Bhavika", email: "bhavika@navadia.com", password: "bhavika", role: "Staff" },
  { name: "Tejal", email: "tejal@navadia.com", password: "tejal", role: "Staff" },
  { name: "Sunita", email: "sunita@navadia.com", password: "sunita", role: "Staff" },
  { name: "Urmila", email: "urmila@navadia.com", password: "urmila", role: "Staff" },
  { name: "Unnati", email: "unnati@navadia.com", password: "unnati", role: "Staff" },
  { name: "Samir", email: "samir@navadia.com", password: "samir", role: "Staff" },
  { name: "Aarati", email: "aarati@navadia.com", password: "aarati", role: "Staff" },
  { name: "Vaishnavi", email: "vaishnavi@navadia.com", password: "vaishnavi", role: "Staff" },
  { name: "Shivani", email: "shivani@navadia.com", password: "shivani", role: "Staff" },
  { name: "Dhruvi", email: "dhruvi@navadia.com", password: "dhruvi", role: "Staff" },
  { name: "Chetana", email: "chetana@navadia.com", password: "chetana", role: "Staff" },
  { name: "Radhika", email: "radhika@navadia.com", password: "radhika", role: "Staff" },
  { name: "Sangitaben", email: "sangitaben@navadia.com", password: "sunityben", role: "Staff" },
  { name: "Nikita", email: "nikita@navadia.com", password: "nikita", role: "Staff" }
];

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smileflow');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Seed default users if they don't already exist or update their password if changed
    console.log('Checking and seeding default users...');
    for (const u of DEFAULT_USERS) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        console.log(`Seeding default user: ${u.email}`);
        await User.create(u);
      } else {
        const isMatch = await exists.comparePassword(u.password);
        if (!isMatch) {
          console.log(`Updating password for user: ${u.email}`);
          exists.password = u.password;
          await exists.save();
        }
      }
    }

    // Seed/update clinic settings coordinates for Gayatri Nagar, Katargam geofencing
    const ClinicSetting = require('../models/ClinicSetting');
    let settings = await ClinicSetting.findOne();
    if (!settings) {
      console.log('Seeding default clinic settings...');
      await ClinicSetting.create({
        clinicName: 'Dental Clinic',
        address: '29, Siddheshwar Society, Ved Rd, Opp. Swaminarayan Mandir, Dabholi Char Rasta, Gayatri Nagar, Katargam, Surat, Gujarat - 395004',
        latitude: 21.2335,
        longitude: 72.8275,
        allowedRadius: 100,
        geofencingEnabled: true,
        gpsVerificationEnabled: true,
        weekendDays: [0]
      });
    } else {
      console.log('Updating clinic settings coordinates for Katargam geofencing...');
      settings.address = '29, Siddheshwar Society, Ved Rd, Opp. Swaminarayan Mandir, Dabholi Char Rasta, Gayatri Nagar, Katargam, Surat, Gujarat - 395004';
      settings.latitude = 21.2335;
      settings.longitude = 72.8275;
      await settings.save();
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; // Trigger reload
