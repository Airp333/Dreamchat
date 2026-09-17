// Part of Dreamchat — licensed under GPLv3. See LICENSE.

const mongoose = require('mongoose');

function connectDB() {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('mongodb connected'))
    .catch(err => console.error('error:', err));
}

module.exports = connectDB;
