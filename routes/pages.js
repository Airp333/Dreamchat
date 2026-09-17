const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const requireUser = require('../middleware/requireUser');
const usernameToColor = require('../utils/usernameToColor');

router.get("/chat", requireUser, (req, res) => {
  Message.find()
    .sort({ createdAt: -1 }).limit(100)
    .then((messages) => {
      messages.reverse();
      const coloredMessage = messages.map((item) => ({
        username: item.username,
        text: item.text,
        imageUrl: item.imageUrl,
        color: usernameToColor(item.username),
        id: item._id,
        createdAt: item.createdAt,
        replyTo: item.replyTo,
        replyToUsername: item.replyToUsername,
        replyToText: item.replyToText
      }));
      res.render("chat.ejs", { username: req.session.username, coloredMessage });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Something went wrong");
    });
});

router.get("/auth", (req, res) => {
  res.render("auth.ejs");
});

router.get("/", (req, res) => {
  res.render("home.ejs");
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

module.exports = router;
