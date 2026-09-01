function requireAuth(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  else {
    return res.status(401).json({ error: "You must be logged in to engage" })
  }
}

module.exports = requireAuth;
