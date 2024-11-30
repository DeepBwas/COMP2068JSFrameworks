// services/UploadManager.js
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');

class UploadManager {
  constructor(config = {}) {
    this.config = {
      allowedMimes: ['image/jpeg', 'image/png'],
      maxSize: 5 * 1024 * 1024,
      bucketName: 'uploads',
      ...config
    };

    this.storage = new GridFsStorage({
      url: process.env.MONGODB_URI,
      file: (req, file) => {
        return new Promise((resolve, reject) => {
          crypto.randomBytes(16, (err, buf) => {
            if (err) return reject(err);
            
            const filename = buf.toString('hex') + path.extname(file.originalname);
            const fileInfo = {
              filename: filename,
              bucketName: this.config.bucketName
            };
            resolve(fileInfo);
          });
        });
      }
    });
  }

  getUploader() {
    return multer({
      storage: this.storage,
      limits: {
        fileSize: this.config.maxSize
      },
      fileFilter: (req, file, cb) => {
        if (!this.config.allowedMimes.includes(file.mimetype)) {
          return cb(new Error('Only jpg, jpeg and png files are allowed'), false);
        }
        cb(null, true);
      }
    });
  }
}

module.exports = UploadManager;