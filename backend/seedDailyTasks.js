const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Task = require('./models/Task');

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smileflow';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to database.");

    // Delete ALL existing recurring tasks to clear duplicates completely
    console.log("Clearing all old recurring tasks...");
    const deleteResult = await Task.deleteMany({ isRecurring: true });
    console.log(`Cleared ${deleteResult.deletedCount} recurring tasks.`);

    console.log("Successfully cleared all recurring tasks in MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding tasks:", error);
    process.exit(1);
  }
}

run();
