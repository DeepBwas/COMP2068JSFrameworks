require("dotenv").config();
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const GalleryImage = require("../models/GalleryImage");
const UploadManager = require("../services/UploadManager");
const { isAuthenticated } = require("./auth");

const galleryManager = new UploadManager({
  allowedMimes: ["image/jpeg", "image/png"],
  maxSize: 12 * 1024 * 1024,
  maxDimension: 1920,
  bucketName: process.env.AWS_BUCKET_NAME,
  region: process.env.AWS_REGION,
  uploadPath: "gallery",
});

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

router.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self';" +
      "script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com;" +
      "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net fonts.googleapis.com;" +
      "style-src-elem 'self' 'unsafe-inline' cdn.jsdelivr.net fonts.googleapis.com;" +
      "font-src 'self' fonts.gstatic.com;" +
      "img-src 'self' data: https:;"
  );
  next();
});

/* GET index page */
router.get("/", async (req, res) => {
  try {
    console.log("Fetching gallery images...");

    const galleryImages = await GalleryImage.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "username")
      .lean();

    console.log("Found images:", galleryImages.length);

    const processedImages = await Promise.all(
      galleryImages.map(async (image) => {
        try {
          const signedUrl = await galleryManager.getSignedUrl(image.imageKey);
          console.log("Generated URL for image:", image._id);
          return {
            _id: image._id,
            imageUrl: signedUrl,
            userName: image.userId?.username || "Anonymous",
          };
        } catch (error) {
          console.error(`Error processing image ${image._id}:`, error);
          return null;
        }
      })
    );

    const images = processedImages.filter((img) => img !== null);
    console.log("Final processed images:", images.length);

    res.render("index", {
      title: "PicsForge - Welcome",
      publicImages: images,
      user: req.user,
    });
  } catch (error) {
    console.error("Gallery error:", error);
    res.status(500).render("index", {
      title: "PicsForge - Welcome",
      publicImages: [],
      error: "Error loading gallery",
    });
  }
});

/* Authentication Routes */
router.get("/login", (req, res) => {
  if (req.user) {
    return res.redirect("/home");
  }
  res.render("login", {
    title: "Login - PicsForge",
    hideFooter: true,
  });
});

router.get("/register", (req, res) => {
  if (req.user) {
    return res.redirect("/home");
  }
  res.render("register", {
    title: "Register - PicsForge",
    hideFooter: true,
  });
});

/* Protected Routes */
router.get("/home", isAuthenticated, async (req, res) => {
  try {
    console.log("Fetching gallery images...");

    const galleryImages = await GalleryImage.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "username")
      .lean();

    console.log("Found images:", galleryImages.length);

    const processedImages = await Promise.all(
      galleryImages.map(async (image) => {
        try {
          const signedUrl = await galleryManager.getSignedUrl(image.imageKey);
          console.log("Generated URL for image:", image._id);
          return {
            _id: image._id,
            imageUrl: signedUrl,
            userName: image.userId?.username || "Anonymous",
          };
        } catch (error) {
          console.error(`Error processing image ${image._id}:`, error);
          return null;
        }
      })
    );

    const images = processedImages.filter((img) => img !== null);
    console.log("Final processed images:", images.length);

    res.render("home", {
      title: "PicsForge - Home",
      publicImages: images,
      user: req.user,
    });
  } catch (error) {
    console.error("Gallery error:", error);
    res.status(500).render("home", {
      title: "PicsForge - Home",
      publicImages: [],
      error: "Error loading gallery",
    });
  }
});

/* Public Routes */
router.get("/about", (req, res) => {
  res.render("about", {
    title: "About - PicsForge",
    user: req.user,
  });
});

router.get("/privacy-policy", (req, res) => {
  res.render("privacy-policy", {
    title: "Privacy Policy - PicsForge",
    user: req.user,
  });
});

/* Notification Routes */
router.get("/test-notifications", (req, res) => {
  res.render("test-notifications", {
    user: req.user,
  });
});

router.post("/clear-notifications", (req, res) => {
  if (req.session) {
    delete req.session.notifications;
  }
  res.sendStatus(200);
});

/* Error handler */
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    message: "Something broke!",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

module.exports = router;
