const express = require("express");
const router = express.Router();
const isAuthenticated = require("../routes/auth");
const GalleryImage = require("../models/GalleryImage");
const UploadManager = require("../services/UploadManager");

const galleryManager = new UploadManager({
  allowedMimes: ["image/jpeg", "image/png"],
  maxSize: 12 * 1024 * 1024,
  maxDimension: 1920,
  bucketName: process.env.AWS_BUCKET_NAME,
  region: process.env.AWS_REGION,
  uploadPath: "gallery",
});

router.get("/gallery", isAuthenticated, async (req, res) => {
  try {
    let images = await GalleryImage.find({ userId: req.user.id });

    const processedImages = await Promise.all(
      images.map(async (image) => {
        try {
          const signedUrl = await galleryManager.getSignedUrl(image.imageKey);
          const processedImage = image.toObject();
          processedImage.imageUrl = signedUrl;
          return processedImage;
        } catch (error) {
          console.error(`Error processing image ${image._id}:`, error);
          return null;
        }
      })
    );

    const finalImages = processedImages
      .filter((img) => img !== null)
      .sort((a, b) => b.uploadDate - a.uploadDate);

    res.render("gallery", {
      title: "PicsForge - Gallery",
      images: finalImages,
      active: { gallery: true },
    });
  } catch (error) {
    console.error("Gallery error:", error);
    res.notify.error("Error loading gallery");
    res.redirect("/home");
  }
});

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

router.get("/gallery/:imageId/download", isAuthenticated, async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.imageId);
    if (!image) {
      return res.status(404).send("Image not found");
    }

    const signedUrl = await galleryManager.getSignedUrl(image.imageKey);
    
    const response = await fetch(signedUrl);
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Disposition', `attachment; filename="${image.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error("Download error:", error);
    res.status(500).send("Error downloading file");
  }
});

router.delete("/gallery/:imageId", isAuthenticated, async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.imageId);
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    if (image.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await galleryManager.deleteFile(image.imageKey);

    await GalleryImage.deleteOne({ _id: req.params.imageId });

    return res.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    return res.json({
      success: false,
      message: "Error deleting image",
    });
  }
});

router.get("editor/:imageId/edit", isAuthenticated, async (req, res) => {
    try {
        const image = await GalleryImage.findById(req.params.imageId);
        if (!image) {
            res.notify.error("Image not found");
            return res.redirect("/gallery");
        }

        if (image.userId.toString() !== req.user.id) {
            res.notify.error("Unauthorized");
            return res.redirect("/gallery");
        }

        const signedUrl = await editorManager.getSignedUrl(image.imageKey);
        const processedImage = image.toObject();
        processedImage.imageUrl = signedUrl;

        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.render("editor", {
            title: "Edit Image",
            image: processedImage,
            active: { gallery: true },
        });
    } catch (error) {
        console.error("Editor error:", error);
        res.notify.error("Error loading editor");
        res.redirect("/gallery");
    }
});

module.exports = router;
