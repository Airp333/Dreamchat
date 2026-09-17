// Part of Dreamchat — licensed under GPLv3. See LICENSE.

const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
  },
  passwordHash: {
    type: String,
    required: true,
  }
})

const User = mongoose.model('User', userSchema);

module.exports = User;
