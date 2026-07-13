const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  console.log('Total users:', users.length);
  console.log('Users list:', users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })));

  await mongoose.disconnect();
}

main().catch(console.error);
