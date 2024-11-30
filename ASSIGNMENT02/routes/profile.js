const express = require('express');
const router = express.Router();
const isAuthenticated = require('../routes/auth');
const UploadManager = require('../services/UploadManager');

// Update profile
router.post('/profile/update', isAuthenticated, async (req, res) => {
  try {
    const { username, email, bio } = req.body;
    
    // Update user in database
    await User.findByIdAndUpdate(req.user.id, {
      username,
      email,
      bio
    });

    req.flash('success', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (error) {
    req.flash('error', 'Error updating profile');
    res.redirect('/profile');
  }
});


const avatarUpload = new UploadManager({
  bucketName: 'avatars',
  maxSize: 2 * 1024 * 1024 // 2MB
}).getUploader();

router.post('/profile/avatar/upload', avatarUpload.single('avatar'), async (req, res) => {
  try {
    const fileId = req.file.id;
    await User.findByIdAndUpdate(req.user.id, { avatarId: fileId });
    res.notify.success('Avatar uploaded successfully');
    res.redirect('/profile');
  } catch (error) {
    res.notify.error('Error uploading avatar');
    res.redirect('/profile');
  }
});

module.exports = router;