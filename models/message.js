const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  username: {
    type: String,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  replyToUsername: {
    type: String,
  },
  replyToText: {
    type: String,
  }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
