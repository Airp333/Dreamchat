const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt')
const User = require('../models/User.js')
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many requests, please slow down." }
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.headers["cf-connecting-ip"] ?? ipKeyGenerator(req.ip),
  message: { error: "please wait before creating another account" },
});

router.post('/signup', signupLimiter, async (req, res) => {
  const { username, password, passwordCheck } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: "username and password are required" });
  }
  if (password.length < 8 || password.length > 35) {
    return res.status(400).json({ error: "password must be between 8-35 characters" });
  }
  if (!passwordCheck || passwordCheck !== password) {
    return res.status(400).json({ error: 'passwords do not match' });
  }

  const usernameRegex = /^[A-Za-z0-9_]{3,15}$/;

  if (!usernameRegex.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-15 characters: letters, numbers, and underscores only' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ username, passwordHash });
    await newUser.save();
    req.session.userId = newUser._id;
    req.session.username = newUser.username
    res.status(201).json({ message: "your account has been created." });
    } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "username already taken" });
    } else {
      console.error(err);
      res.status(500).send({ error: "Something went wrong" });
    }
  }
})

router.post('/login', loginLimiter, async (req, res) => {

  const { username, password } = req.body;

  try{
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).send({ error: "username or password is incorrect"})
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).send({ error: "username or password is incorrect" });
    }
    req.session.userId = user._id;
    req.session.username = user.username
    res.status(200).json({ message: "logged in successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Something went wrong" });
  }

});

module.exports = router;
