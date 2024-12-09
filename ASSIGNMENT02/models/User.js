const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: function() {
      return !this.googleId && !this.githubId;
    },
    minlength: 4
  },
  googleId: String,
  githubId: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  avatarKey: String,
  avatarUrl: String 
});

userSchema.virtual('galleryImages', {
  ref: 'GalleryImage',
  localField: '_id',
  foreignField: 'userId'
});

userSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password') || !this.password) {
      return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);