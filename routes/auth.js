const express = require("express");
const passport = require("passport");

const router = express.Router();

// Start Google login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/signin",
  }),
  (req, res) => {
    res.redirect("/home");
  }
);

// Logout
router.get("/signout", (req, res) => {
  req.logout(() => {
    res.redirect("/signin");
  });
});

module.exports = router;
