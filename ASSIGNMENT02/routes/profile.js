const express = require('express');
const router = express.Router();
const isAuthenticated = require('../routes/auth');

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

module.exports = router;