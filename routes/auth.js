const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt')
const User = require('../models/User.js')

router.post('/signup', async (req, res) => {
  const { username, password } = req.body;

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

router.post('/login', async (req, res) => {

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
