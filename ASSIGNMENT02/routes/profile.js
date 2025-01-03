const express = require("express");
const router = express.Router();
const isAuthenticated = require("../routes/auth");
const User = require("../models/User");
const UploadManager = require("../services/UploadManager");

const avatarManager = new UploadManager({
  allowedMimes: ["image/jpeg", "image/png"],
  maxSize: 12 * 1024 * 1024, // 12MB
  bucketName: process.env.AWS_BUCKET_NAME,
  region: process.env.AWS_REGION,
});

router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

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

router.post("/profile/update/email", isAuthenticated, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.notify.error("Email is required");
      return res.redirect("/profile");
    }

    const existingUser = await User.findOne({
      _id: { $ne: req.user.id },
      email,
    });

    if (existingUser) {
      res.notify.error("Email already exists");
      return res.redirect("/profile");
    }

    await User.findByIdAndUpdate(req.user.id, {
      email,
    });

    res.notify.success("Email updated successfully");
    res.redirect("/profile");
  } catch (error) {
    console.error("Email update error:", error);
    res.notify.error("Error updating email");
    res.redirect("/profile");
  }
});

router.post("/profile/update/username", isAuthenticated, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      res.notify.error("Username is required");
      return res.redirect("/profile");
    }

    const existingUser = await User.findOne({
      _id: { $ne: req.user.id },
      username,
    });

    if (existingUser) {
      res.notify.error("Username already exists");
      return res.redirect("/profile");
    }

    await User.findByIdAndUpdate(req.user.id, {
      username,
    });

    res.notify.success("Username updated successfully");
    res.redirect("/profile");
  } catch (error) {
    console.error("Username update error:", error);
    res.notify.error("Error updating username");
    res.redirect("/profile");
  }
});

router.post("/profile/unlink/github", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.password && !user.googleId) {
      res.notify.error(
        "Please set a password before unlinking your GitHub account."
      );
      return res.redirect("/profile");
    }

    await User.findByIdAndUpdate(req.user.id, {
      $unset: { githubId: 1 },
    });

    res.notify.success("Unlinked from GitHub successfully");
    res.redirect("/profile");
  } catch (error) {
    console.error("GitHub unlink error:", error);
    res.notify.error("Error unlinking from GitHub");
    res.redirect("/profile");
  }
});

router.post("/profile/unlink/google", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.password && !user.githubId) {
      res.notify.error(
        "Please set a password before unlinking your Google account."
      );
      return res.redirect("/profile");
    }

    await User.findByIdAndUpdate(req.user.id, {
      $unset: { googleId: 1 },
    });

    res.notify.success("Unlinked from Google successfully");
    res.redirect("/profile");
  } catch (error) {
    console.error("Google unlink error:", error);
    res.notify.error("Error unlinking from Google");
    res.redirect("/profile");
  }
});

router.post("/profile/add/password", isAuthenticated, async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      res.notify.error("All password fields are required");
      return res.redirect("/profile");
    }

    if (newPassword !== confirmPassword) {
      res.notify.error("New passwords do not match");
      return res.redirect("/profile");
    }

    const user = await User.findById(req.user.id);
    user.password = newPassword;
    await user.save();

    res.notify.success("Password added successfully");
    res.redirect("/profile");
  } catch (error) {
    console.error("Add password error:", error);
    res.notify.error("Error adding password");
    res.redirect("/profile");
  }
});

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
    console.error("Update password error:", error);
    res.notify.error("Error updating password");
    res.redirect("/profile");
  }
});

router.post("/profile/remove/password", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.googleId && !user.githubId) {
      res.notify.error("You must have Google or GitHub linked to remove your password.");
      return res.redirect("/profile");
    }

    user.password = undefined;
    await user.save();

    res.notify.success("Password removed successfully");
    res.redirect("/profile");
  } catch (error) {
    console.error("Remove password error:", error);
    res.notify.error("Error removing password");
    res.redirect("/profile");
  }
});

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
      const user = await User.findById(req.user.id);

      if (user.avatarKey) {
        try {
          await avatarManager.deleteFile(user.avatarKey);
        } catch (deleteError) {
          console.error("Error deleting old avatar:", deleteError);
        }
      }

      const signedUrl = await avatarManager.getSignedUrl(req.file.key);

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
