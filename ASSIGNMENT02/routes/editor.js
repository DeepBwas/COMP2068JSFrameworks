const express = require("express");
const router = express.Router();
const isAuthenticated = require("../routes/auth");
const GalleryImage = require("../models/GalleryImage");
const UploadManager = require("../services/UploadManager");

const editorManager = new UploadManager({
    allowedMimes: ["image/jpeg", "image/png", "image/jpg"],
    maxSize: 12 * 1024 * 1024,
    maxDimension: 1920,
    bucketName: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_REGION,
    uploadPath: "gallery",
});

router.get("/:imageId/edit", isAuthenticated, async (req, res) => {
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

    res.render("editor", {
      title: "PicsForge - Editor",
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

router.post("/:imageId/save", 
    isAuthenticated,
    editorManager.getUploader().single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "No image data provided" });
            }

            const image = await GalleryImage.findById(req.params.imageId);
            if (!image) {
                return res.status(404).json({ error: "Image not found" });
            }
            if (image.userId.toString() !== req.user.id) {
                return res.status(403).json({ error: "Unauthorized" });
            }

            try {
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