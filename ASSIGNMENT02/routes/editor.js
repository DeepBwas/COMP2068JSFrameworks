const express = require("express");
const router = express.Router();
const isAuthenticated = require("../routes/auth");
const GalleryImage = require("../models/GalleryImage");
const UploadManager = require("../services/UploadManager");
const crypto = require('crypto');

// Create editor manager with same config as gallery
const editorManager = new UploadManager({
    allowedMimes: ["image/jpeg", "image/png", "image/jpg"],
    maxSize: 12 * 1024 * 1024,
    maxDimension: 1920,
    bucketName: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_REGION,
    uploadPath: "gallery",
});

// Get editor page with specific image
router.get("/:imageId/edit", isAuthenticated, async (req, res) => {
  try {
    // Find and verify image ownership
    const image = await GalleryImage.findById(req.params.imageId);
    if (!image) {
      res.notify.error("Image not found");
      return res.redirect("/gallery");
    }

    if (image.userId.toString() !== req.user.id) {
      res.notify.error("Unauthorized");
      return res.redirect("/gallery");
    }

    // Get signed URL for image
    const signedUrl = await editorManager.getSignedUrl(image.imageKey);
    const processedImage = image.toObject();
    processedImage.imageUrl = signedUrl;

    res.render("editor", {
      title: "Edit Image",
      image: processedImage,
      active: { gallery: true },
      hideFooter: true
    });
  } catch (error) {
    console.error("Editor error:", error);
    res.notify.error("Error loading editor");
    res.redirect("/gallery");
  }
});

const validatePayloadSize = (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'], 10);
    if (contentLength > 50 * 1024 * 1024) { // 50MB limit
        return res.status(413).json({
            error: "Payload too large. Please reduce the image size."
        });
    }
    next();
};

// Modified save route
router.post("/:imageId/save", 
    isAuthenticated,
    editorManager.getUploader().single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "No image data provided" });
            }

            // Find and validate image
            const image = await GalleryImage.findById(req.params.imageId);
            if (!image) {
                return res.status(404).json({ error: "Image not found" });
            }
            if (image.userId.toString() !== req.user.id) {
                return res.status(403).json({ error: "Unauthorized" });
            }

            try {
                // Delete the old file and update with new one
                if (image.imageKey) {
                    await editorManager.deleteFile(image.imageKey).catch(console.error);
                }
                
                image.imageKey = req.file.key;
                image.lastEdited = new Date();
                image.lastEditMessage = req.body.editMessage;
                await image.save();

                return res.json({
                    success: true,
                    message: "Image saved successfully"
                });
            } catch (dbError) {
                console.error("Database error:", dbError);
                await editorManager.deleteFile(req.file.key).catch(console.error);
                return res.status(500).json({ error: "Failed to update image record" });
            }

        } catch (error) {
            console.error("Save error:", error);
            return res.status(500).json({ error: "Error saving image" });
        }
    }
);


module.exports = router;