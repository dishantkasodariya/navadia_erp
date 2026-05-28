/**
 * Migration Script: Local MongoDB → MongoDB Atlas
 * Uses direct connection string (non-SRV) to bypass DNS issues
 * 
 * Usage: node migrate-to-atlas.js
 */

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

// Source: Local MongoDB
const LOCAL_URI = 'mongodb://localhost:27017';
const DB_NAME = 'smileflow';

// Destination: MongoDB Atlas - Direct connection (non-SRV)
// Using hosts from SRV lookup results
const ATLAS_URI = 'mongodb://navadia:jatin%40navadiya@ac-itrfkya-shard-00-00.svkmbpx.mongodb.net:27017,ac-itrfkya-shard-00-01.svkmbpx.mongodb.net:27017,ac-itrfkya-shard-00-02.svkmbpx.mongodb.net:27017/smileflow?ssl=true&replicaSet=atlas-11lf7l-shard-0&authSource=admin&retryWrites=true&w=majority';

async function migrate() {
  console.log('🔄 Migration Started: Local MongoDB → MongoDB Atlas');
  console.log('━'.repeat(50));

  let localClient, atlasClient;

  try {
    // Step 1: Connect to Local MongoDB
    console.log('\n📡 Connecting to Local MongoDB...');
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    const localDb = localClient.db(DB_NAME);
    console.log('✅ Connected to Local MongoDB');

    // Step 2: Connect to Atlas
    console.log('\n☁️  Connecting to MongoDB Atlas...');
    atlasClient = new MongoClient(ATLAS_URI);
    await atlasClient.connect();
    const atlasDb = atlasClient.db(DB_NAME);
    console.log('✅ Connected to MongoDB Atlas');

    // Step 3: Get all collections
    const collections = await localDb.listCollections().toArray();
    console.log(`\n📋 Found ${collections.length} collections to migrate:\n`);

    let totalDocs = 0;

    // Step 4: Migrate each collection
    for (const collInfo of collections) {
      const collName = collInfo.name;
      const localCollection = localDb.collection(collName);
      const atlasCollection = atlasDb.collection(collName);

      // Get all documents from local
      const docs = await localCollection.find({}).toArray();
      
      if (docs.length === 0) {
        console.log(`   📂 ${collName}: 0 documents (skipped)`);
        continue;
      }

      // Clear existing data in Atlas collection (to avoid duplicates)
      await atlasCollection.deleteMany({});

      // Insert all documents into Atlas
      const result = await atlasCollection.insertMany(docs);
      console.log(`   ✅ ${collName}: ${result.insertedCount} documents migrated`);
      totalDocs += result.insertedCount;
    }

    console.log('\n' + '━'.repeat(50));
    console.log(`🎉 Migration Complete! Total ${totalDocs} documents transferred to Atlas.`);
    console.log('\n💡 Your app will now use the Atlas database.');
    console.log('   You can verify data in MongoDB Atlas dashboard or Compass.\n');

  } catch (error) {
    console.error('\n❌ Migration Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   → Make sure local MongoDB is running (check MongoDB Compass)');
    }
    if (error.message.includes('authentication') || error.message.includes('auth')) {
      console.error('   → Check your Atlas username/password in .env file');
    }
    if (error.message.includes('network') || error.message.includes('ETIMEOUT')) {
      console.error('   → Check your internet connection and Atlas IP whitelist (0.0.0.0/0)');
    }
  } finally {
    if (localClient) await localClient.close();
    if (atlasClient) await atlasClient.close();
  }
}

migrate();
