// routes/auth.js
const express = require("express");
const passport = require("passport");
const User = require("../models/User");
const router = express.Router();

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.notify.error("Please login to access this page");
  res.redirect("/login");
};

// GET register page
router.get("/register", (req, res) => {
  const notification = req.session.notification;
  const formData = req.session.formData;

  // Clear session data after use
  delete req.session.notification;
  delete req.session.formData;

  res.render("register", {
    error: notification?.message,
    formData,
    notification,
  });
});

// POST register
router.post("/register", async (req, res) => {
  console.log("Registration attempt - Request body:", req.body);

  const { username, email, password, confirmPassword } = req.body;
  req.session.formData = { username, email };

  if (!username || !email || !password || !confirmPassword) {
    console.log("Missing required fields");
    res.notify.error("All fields are required");
    return res.redirect("/register");
  }

  if (password !== confirmPassword) {
    console.log("Password mismatch");
    res.notify.error("Passwords do not match");
    return res.redirect("/register");
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      console.log("User already exists");
      res.notify.error("Email or username already exists");
      return res.redirect("/register");
    }

    const user = new User({ username, email, password });
    await user.save();

    console.log("User registered successfully:", user);
    res.notify.success("Account created successfully! Please login.");
    res.redirect("/login");
  } catch (err) {
    console.error("Error creating account:", err);
    res.notify.error("Error creating account");
    res.redirect("/register");
  }
});

// GET login page
router.get("/login", (req, res) => {
  const notification = req.session.notification;
  delete req.session.notification;
  res.render("login", { error: null, notification });
});

// POST login
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      res.notify.error("Login error occurred");
      return next(err);
    }
    if (!user) {
      res.notify.error(info.message || "Invalid credentials");
      return res.redirect("/login");
    }
    req.logIn(user, (err) => {
      if (err) {
        res.notify.error("Login error occurred");
        return next(err);
      }
      res.notify.success("Welcome back!");
      return res.redirect("/home");
    });
  })(req, res, next);
});

// GET logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      res.notify.error("Error logging out");
      return res.redirect("/");
    }
    res.notify.success("Successfully logged out");
    res.redirect("/");
  });
});

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    failureMessage: true,
  }),
  (req, res) => {
    res.notify.success("Successfully logged in with Google");
    res.redirect("/home");
  }
);

// GitHub OAuth routes
router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/login",
    failureMessage: true,
  }),
  (req, res) => {
    res.notify.success("Successfully logged in with GitHub");
    res.redirect("/home");
  }
);

// Protected routes
router.get("/profile", isAuthenticated, (req, res) => {
  res.render("profile", { user: req.user });
});

router.get("/home", isAuthenticated, (req, res) => {
  res.render("home", { user: req.user });
});

module.exports = router;