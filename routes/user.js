const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Middleware: ensure user is logged in
// These routes are mounted under `/api` in server.js (eg. GET /api/me)
function isAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Unauthorized" });
}

/**
 * GET current user
 * used by: loadUser()
 */
router.get("/me", isAuth, (req, res) => {
  res.json({
    username: req.user.username,
    email: req.user.email,
  });
});

/**
 * UPDATE username
 * used by: edit/save button
 */
router.post("/user/name", isAuth, async (req, res) => {
  const { username } = req.body;

  if (!username || username.length < 2) {
    return res.status(400).json({ error: "Invalid username" });
  }

  req.user.username = username;
  await req.user.save();

  res.json({ success: true, username });
});

module.exports = router;
