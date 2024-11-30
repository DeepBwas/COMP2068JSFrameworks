const express = require("express");
const router = express.Router();
const isAuthenticated = require("../routes/auth");
const User = require("../models/User");
const UploadManager = require("../services/UploadManager");
const sharp = require("sharp");

// Create avatar manager
const avatarManager = new UploadManager({
  allowedMimes: ["image/jpeg", "image/png"],
  maxSize: 12 * 1024 * 1024, // 12MB
  bucketName: process.env.AWS_BUCKET_NAME,
  region: process.env.AWS_REGION,
});

// Render profile page
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Refresh the signed URL if user has an avatar
    if (user.avatarKey) {
      user.avatarUrl = await avatarManager.getSignedUrl(user.avatarKey);
      await user.save();
    }

    res.render("profile", {
      user,
      title: "Profile Settings",
      active: { profile: true },
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.notify.error("Error loading profile");
    res.redirect("/home");
  }
});

// Update profile
router.post("/profile/update", isAuthenticated, async (req, res) => {
  try {
    const { username, email, bio } = req.body;

    if (!username || !email) {
      res.notify.error("Username and email are required");
      return res.redirect("/profile");
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      _id: { $ne: req.user.id },
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      res.notify.error("Username or email already exists");
      return res.redirect("/profile");
    }

    await User.findByIdAndUpdate(req.user.id, {
      username,
      email,
      bio,
    });

    res.notify.success("Profile updated successfully");
    res.redirect("/profile");
  } catch (error) {
    console.error("Profile update error:", error);
    res.notify.error("Error updating profile");
    res.redirect("/profile");
  }
});

// Update account settings
router.post("/profile/update/account", isAuthenticated, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.notify.error("Email is required");
      return res.redirect("/profile");
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      _id: { $ne: req.user.id },
      email,
    });

    if (existingUser) {
      res.notify.error("Email already exists");
      return res.redirect("/profile");
    }

    await User.findByIdAndUpdate(req.user.id, { email });
    res.notify.success("Email updated successfully");
    res.redirect("/profile");
  } catch (error) {
    console.error("Account update error:", error);
    res.notify.error("Error updating email");
    res.redirect("/profile");
  }
});

// Update password
router.post("/profile/update/password", isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.notify.error("All password fields are required");
      return res.redirect("/profile");
    }

    if (newPassword !== confirmPassword) {
      res.notify.error("New passwords do not match");
      return res.redirect("/profile");
    }

    const user = await User.findById(req.user.id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      res.notify.error("Current password is incorrect");
      return res.redirect("/profile");
    }

    user.password = newPassword;
    await user.save();

    res.notify.success("Password updated successfully");
    res.redirect("/profile");
  } catch (error) {
    console.error("Password update error:", error);
    res.notify.error("Error updating password");
    res.redirect("/profile");
  }
});

// Upload avatar
// In profile.js, modify the avatar upload route:

router.post(
  "/profile/avatar/upload",
  isAuthenticated,
  avatarManager.getUploader().single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        res.notify.error("No file uploaded");
        return res.redirect("/profile");
      }

      // Get current user
      const user = await User.findById(req.user.id);

      // Delete old avatar if exists
      if (user.avatarKey) {
        try {
          await avatarManager.deleteFile(user.avatarKey);
        } catch (deleteError) {
          console.error("Error deleting old avatar:", deleteError);
        }
      }

      // Get a signed URL for immediate use
      const signedUrl = await avatarManager.getSignedUrl(req.file.key);

      // Update user with new avatar info
      await User.findByIdAndUpdate(req.user.id, {
        avatarKey: req.file.key,
        avatarUrl: signedUrl,
      });

      res.notify.success("Avatar uploaded successfully");
      res.redirect("/profile");
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.notify.error(error.message || "Error uploading avatar");
      res.redirect("/profile");
    }
  }
);

// Delete avatar
router.post("/profile/avatar/remove", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.avatarKey) {
      return res.json({
        success: false,
        message: "No avatar to remove",
      });
    }

    try {
      await avatarManager.deleteFile(user.avatarKey);
    } catch (deleteError) {
      console.error("Error deleting from S3:", deleteError);
    }

    await User.findByIdAndUpdate(req.user.id, {
      $unset: { avatarKey: 1, avatarUrl: 1 },
    });

    return res.json({
      success: true,
      message: "Avatar removed successfully",
    });
  } catch (error) {
    console.error("Avatar deletion error:", error);
    return res.json({
      success: false,
      message: "Error removing avatar",
    });
  }
});

module.exports = router;
