// Migration Script: Local "Dentist" DB → Atlas "smileflow" DB
// Run with mongosh

const LOCAL_URI = 'mongodb://localhost:27017/Dentist';
const ATLAS_URI = 'mongodb+srv://navadia:jatin%40navadiya@navadia.svkmbpx.mongodb.net/smileflow';

print('🔄 Migration: Local "Dentist" DB → Atlas "smileflow" DB');
print('━'.repeat(55));

// Connect to local "Dentist" database
print('\n📡 Reading data from Local MongoDB (Dentist)...');
const localConn = connect(LOCAL_URI);
const collections = localConn.getCollectionNames();
print(`✅ Found ${collections.length} collections: ${collections.join(', ')}`);

// Read all data
const allData = {};
let totalDocs = 0;
for (const collName of collections) {
  const docs = localConn.getCollection(collName).find({}).toArray();
  allData[collName] = docs;
  totalDocs += docs.length;
  print(`   📦 ${collName}: ${docs.length} documents read`);
}
print(`\n   Total documents to migrate: ${totalDocs}`);

// Connect to Atlas "smileflow" database
print('\n☁️  Connecting to MongoDB Atlas (smileflow)...');
const atlasConn = connect(ATLAS_URI);
print('✅ Connected to Atlas');

// Write data
print('\n📤 Writing data to Atlas...\n');
let migratedDocs = 0;
for (const collName of collections) {
  const docs = allData[collName];
  if (docs.length === 0) {
    print(`   📂 ${collName}: 0 documents (skipped)`);
    continue;
  }
  
  // Clear existing to avoid duplicates
  atlasConn.getCollection(collName).deleteMany({});
  
  // Insert
  const result = atlasConn.getCollection(collName).insertMany(docs);
  const count = Object.keys(result.insertedIds).length;
  migratedDocs += count;
  print(`   ✅ ${collName}: ${count} documents migrated`);
}

print('\n' + '━'.repeat(55));
print(`🎉 Migration Complete! ${migratedDocs} documents transferred.`);

// Verify
print('\n🔍 Verifying Atlas data...');
const atlasCollections = atlasConn.getCollectionNames();
for (const c of atlasCollections) {
  const count = atlasConn.getCollection(c).countDocuments();
  print(`   ☁️  ${c}: ${count} documents in Atlas`);
}
print('\n✅ Done! Your backend can now use Atlas database.\n');
