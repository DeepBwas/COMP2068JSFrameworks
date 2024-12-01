const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');
const sharp = require('sharp');

class UploadManager {
  constructor(config = {}) {
    this.config = {
      allowedMimes: ['image/jpeg', 'image/png'],
      maxSize: 12 * 1024 * 1024,
      maxDimension: 500,
      bucketName: process.env.AWS_BUCKET_NAME,
      region: process.env.AWS_REGION,
      uploadPath: 'avatars',
      ...config
    };

    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  getUploader() {
    const self = this;
    
    return multer({
      storage: multerS3({
        s3: this.s3Client,
        bucket: this.config.bucketName,
        metadata: (req, file, cb) => {
          cb(null, {
            userId: req.user ? req.user.id : 'anonymous',
            originalName: file.originalname,
            contentType: file.mimetype
          });
        },
        key: (req, file, cb) => {
          crypto.randomBytes(16, (err, buf) => {
            if (err) return cb(err);
            const userId = req.user ? req.user.id : 'anonymous';
            const filename = buf.toString('hex') + '.jpg';
            const key = `${self.config.uploadPath}/${userId}/${filename}`;
            cb(null, key);
          });
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
        transforms: [{
          id: 'original',
          key: function(req, file, cb) {
            crypto.randomBytes(16, (err, buf) => {
              if (err) return cb(err);
              const userId = req.user ? req.user.id : 'anonymous';
              const filename = buf.toString('hex') + '.jpg';
              const key = `${self.config.uploadPath}/${userId}/${filename}`;
              cb(null, key);
            });
          },
          transform: function(req, file, cb) {
            const transformer = sharp()
              .resize(self.config.maxDimension, self.config.maxDimension, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .jpeg({ quality: 80 });
            cb(null, transformer);
          }
        }]
      }),
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

  async getSignedUrl(key) {
    try {
      if (!key) {
        throw new Error('No key provided for signed URL generation');
      }
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  async deleteFile(key) {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key
      }));
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw error;
    }
  }
}

module.exports = UploadManager;