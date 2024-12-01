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
  imageUrl: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isVersionControlEnabled: {
    type: Boolean,
    default: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });


module.exports = mongoose.models.GalleryImage || mongoose.model('GalleryImage', galleryImageSchema);