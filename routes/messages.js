const express = require('express');
const rateLimit = require('express-rate-limit');
const Message = require('../models/message');
const requireAuth = require('../middleware/requireAuth');
const upload = require('../config/cloudinary');

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  message: { error: "Too many messages, please slow down." }
});

module.exports = function (io) {
  const router = express.Router();

  router.post("/messages", messageLimiter, requireAuth, (req, res) => {
    const text = req.body.text;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Message text is required" });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: "Message is too long" });
    }

    Message.create({ text: text, username: req.session.username, userId: req.session.userId })
      .then((newMessage) => {
        res.json({ success: true });
      })
      .catch((err) => {
        res.status(500).json({ error: "Something went wrong" });
        console.log(err);
      });
  });

  router.post('/messages/upload', requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "image is required" });
    }

    Message.create({ imageUrl: req.file.path, username: req.session.username, userId: req.session.userId })
      .then((newMessage) => {
        const botToken = process.env.BOT_TOKEN;
        const chatId = process.env.CHAT_ID;

        if (botToken && chatId) {
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `${req.session.username}: ${req.file.path}`
            })
          }).catch(err => console.log(err));
        }

        io.emit('chat message', {
          username: req.session.username,
          imageUrl: req.file.path,
          id: newMessage._id,
          createdAt: newMessage.createdAt
        });

        res.json({ success: true });
      })
      .catch((err) => {
        res.status(500).json({ error: "Something went wrong" });
        console.log(err);
      });
  });

  return router;
};
