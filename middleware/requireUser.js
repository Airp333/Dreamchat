// Part of Dreamchat — licensed under GPLv3. See LICENSE.

function requireUser(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/auth");
  }
}

module.exports = requireUser;
