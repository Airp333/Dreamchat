// Part of Dreamchat — licensed under GPLv3. See LICENSE.

const mongoose = require('mongoose');

const MONGO_URI = 'put your database url here';

async function nukeDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to: ${mongoose.connection.name}`);

    await mongoose.connection.dropDatabase();
    console.log('Database nuked successfully.');
  } catch (err) {
    console.log('mehrzad attack nazan namosan joyjoyjoy', err);
  } finally {
    await mongoose.disconnect();
  }
}

nukeDatabase();
