const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageKey: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  lastEdited: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.models.GalleryImage || mongoose.model('GalleryImage', galleryImageSchema);