const express = require("express");
const passport = require("passport");
const User = require("../models/User");
const UploadManager = require('../services/UploadManager');
const router = express.Router();

const avatarManager = new UploadManager({
  bucketName: process.env.AWS_BUCKET_NAME,
  region: process.env.AWS_REGION
});

const isAuthenticated = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.notify.error("Please login to access this page");
    return res.redirect("/login");
  }

  if (req.user && req.user.avatarKey) {
    try {
      const user = await User.findById(req.user.id);
      user.avatarUrl = await avatarManager.getSignedUrl(user.avatarKey);
      await user.save();
      req.user = user;
    } catch (error) {
      console.error('Error refreshing avatar URL:', error);
    }
  }
  next();
};


router.get("/register", (req, res) => {
  const notification = req.session.notification;
  const formData = req.session.formData;

  delete req.session.notification;
  delete req.session.formData;

  res.render("register", {
    error: notification?.message,
    formData,
    notification,
  });
});


router.post("/register", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  req.session.formData = { username, email };

  if (!username || !email || !password || !confirmPassword) {
    res.notify.error("All fields are required");
    return res.redirect("/register");
  }

  if (password !== confirmPassword) {
    res.notify.error("Passwords do not match");
    return res.redirect("/register");
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      res.notify.error("Email or username already exists");
      return res.redirect("/register");
    }

    const user = new User({ username, email, password });
    await user.save();

    res.notify.success("Account created successfully! Please login.");
    res.redirect("/login");
  } catch (err) {
    console.error("Error creating account:", err);
    res.notify.error("Error creating account");
    res.redirect("/register");
  }
});

router.get("/login", (req, res) => {
  const notification = req.session.notification;
  delete req.session.notification;
  res.render("login", { error: null, notification });
});

router.post("/login", (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    res.notify.error("Email and password are required");
    return res.redirect("/login");
  }

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
      res.notify.success("Successfully logged in");
      return res.redirect("/home");
    });
  })(req, res, next);
});

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

module.exports = router;
module.exports.isAuthenticated = isAuthenticated;