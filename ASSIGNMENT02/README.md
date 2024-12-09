# PicsForge - Image Editing Web Application

PicsForge is a full-stack web application that allows users to upload, manage, and edit their images. Built with Node.js, Express, MongoDB, and AWS S3, it provides a secure and efficient platform for image management with features like user authentication, version control, and image editing capabilities.

## Features

- **User Authentication**
  - Local authentication with email and password
  - OAuth integration with Google and GitHub
  - Secure session management

- **Image Management**
  - Upload images with size and type validation
  - Gallery view of all uploaded images
  - Download functionality
  - Secure storage using AWS S3

- **Profile Management**
  - User profile customization
  - Profile picture upload
  - Account settings

## Technologies Used

- **Backend**
  - Node.js
  - Express.js
  - MongoDB with Mongoose
  - Passport.js for authentication
  - Multer & Multer-S3 for file uploads

- **Frontend**
  - Handlebars templating engine
  - JavaScript
  - CSS3
  - Responsive design

- **Cloud Services**
  - MongoDB Atlas
  - AWS S3 for image storage
  - Render for deployment