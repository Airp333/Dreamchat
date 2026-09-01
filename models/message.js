const mongoose = require('mongoose');

const payamSchema = new mongoose.Schema({
  text: {
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
}, { timestamps: true });

const Payam = mongoose.model('Payam', payamSchema);

module.exports = Payam;
