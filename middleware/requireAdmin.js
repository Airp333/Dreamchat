// Part of Dreamchat — licensed under GPLv3. See LICENSE.

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect("/admin");
  }
}

module.exports = requireAdmin;
