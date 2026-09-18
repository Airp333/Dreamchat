// Part of Dreamchat — licensed under GPLv3. See LICENSE.

const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const requireUser = require('../middleware/requireUser');
const requireAdmin = require('../middleware/requireAdmin');
const usernameToColor = require('../utils/usernameToColor');
const si = require('systeminformation');

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

router.get("/color", (req, res) => {
  res.render("colorPicker.ejs");
});

router.get("/calc", (req, res) => {
  res.render("calculator.ejs");
});

router.get("/kanban", (req, res) => {
  res.render("kanbanBoard.ejs");
});

router.get("/numguess", (req, res) => {
  res.render("numberGuesser.ejs");
});

router.get("/dashboard", requireAdmin, (req, res) => {
  res.render("dashboard.ejs");
});

router.get("/admin", (req, res) => {
  res.render("adminLogin.ejs");
});

router.post("/verify", (req, res) => {
  const password = req.body.password;

  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect("/dashboard");
  } else {
    res.redirect("/admin");
  }
});

module.exports = router;
