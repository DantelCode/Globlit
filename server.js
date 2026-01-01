// ENVIRONMENT & DEPENDENCIES
require("dotenv").config();
require("./config/passport");

const express = require("express");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const mongoose = require("mongoose");
const passport = require("passport");
const path = require("path");

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

const app = express();

// MIDDLEWARE CONFIGURATION
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(expressLayouts);

// TEMPLATE ENGINE CONFIGURATION
app.set("layout", "layouts/main");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/signin");
}

// Routes
app.get('/', (req, res) => {
  res.redirect("/dashboard");
});

app.use("/auth", require("./routes/auth"));
app.use("/api", require("./routes/user"));
app.use("/api/news", require("./routes/news"));

app.get("/signin", (req, res) => {
  res.render("signin", { title: "Globlit - Signin" });
});

app.get("/dashboard", ensureAuth, (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/signin");
  res.render("home", { title: "Globlit" });
});


// Start server
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV;

if (!process.env.NEWS_API_KEY) console.warn('WARNING: NEWS_API_KEY is not set. News proxy endpoints will fail.');

// Start server only when this file is run directly. This makes local dev and requires/imports safe.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GLOBLIT SERVER STARTED AT PORT ${PORT} (env=${NODE_ENV})`);
  });
}

module.exports = app; // Vercel usage