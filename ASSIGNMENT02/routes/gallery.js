const express = require("express");
const router = express.Router();
const isAuthenticated = require("../routes/auth");
const GalleryImage = require("../models/GalleryImage");
const UploadManager = require("../services/UploadManager");

// Create gallery manager
const galleryManager = new UploadManager({
  allowedMimes: ["image/jpeg", "image/png"],
  maxSize: 12 * 1024 * 1024,
  maxDimension: 1920,
  bucketName: process.env.AWS_BUCKET_NAME,
  region: process.env.AWS_REGION,
  uploadPath: "gallery",
});

// Get gallery page
router.get('/gallery', isAuthenticated, async (req, res) => {
  try {
    let images = await GalleryImage.find({ userId: req.user.id });

    // Process each image
    const processedImages = await Promise.all(images.map(async (image) => {
      try {
        const signedUrl = await galleryManager.getSignedUrl(image.imageKey);
        const processedImage = image.toObject();
        processedImage.imageUrl = signedUrl;
        return processedImage;
      } catch (error) {
        console.error(`Error processing image ${image._id}:`, error);
        return null;
      }
    }));

    // Filter out any null values and sort by upload date
    const finalImages = processedImages
      .filter(img => img !== null)
      .sort((a, b) => b.uploadDate - a.uploadDate);

    res.render('gallery', {
      title: 'My Gallery',
      images: finalImages,
      active: { gallery: true }
    });
  } catch (error) {
    console.error('Gallery error:', error);
    res.notify.error('Error loading gallery');
    res.redirect('/home');
  }
});

// Upload gallery image
router.post(
  "/gallery/upload",
  isAuthenticated,
  galleryManager.getUploader().single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        res.notify.error("No file uploaded");
        return res.redirect("/gallery");
      }

      const signedUrl = await galleryManager.getSignedUrl(req.file.key);
      await GalleryImage.create({
        userId: req.user.id,
        imageKey: req.file.key,
        imageUrl: signedUrl,
        originalName: req.file.originalname,
        isVersionControlEnabled: true,
      });

      res.notify.success("Image uploaded successfully");
      res.redirect("/gallery");
    } catch (error) {
      console.error("Gallery upload error:", error);
      res.notify.error(error.message || "Error uploading image");
      res.redirect("/gallery");
    }
  }
);

// Download gallery image
router.get('/gallery/download/:imageKey', isAuthenticated, async (req, res) => {
    try {
      const { imageKey } = req.params;
      const signedUrl = await galleryManager.getSignedUrl(imageKey);
      
      const response = await fetch(signedUrl);
      const buffer = await response.buffer();
      
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('Content-Type', 'image/jpeg');
      
      res.send(buffer);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Failed to download image' });
    }
  });

module.exports = router;