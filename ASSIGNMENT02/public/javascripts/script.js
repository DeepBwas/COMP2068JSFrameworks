// Side nav toggle
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger");
  const sideNav = document.getElementById("sideNav");
  const uploadAreas = document.querySelectorAll(".upload-area");
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");
  const storedNotification = sessionStorage.getItem("notification");

  // Show stored notification
  if (storedNotification) {
    const { message, type } = JSON.parse(storedNotification);
    notify[type](message);
    sessionStorage.removeItem("notification");
  }

  // Hamburger menu
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    sideNav.classList.toggle("active");
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !hamburger.contains(e.target) &&
      !sideNav.contains(e.target) &&
      sideNav.classList.contains("active")
    ) {
      hamburger.classList.remove("active");
      sideNav.classList.remove("active");
    }
  });

  // Tab functionality
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  // Initialize upload triggers
  const uploadTriggers = document.querySelectorAll("[data-upload-trigger]");
  uploadTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const uploadId = trigger.dataset.uploadTrigger;
      showUpload(uploadId);
    });
  });

  // Document-level drag events
  document.addEventListener("dragenter", preventDefaults);

  document.addEventListener("dragleave", (e) => {
    preventDefaults(e);

    // Check if we're actually leaving the document
    if (
      e.clientX <= 0 ||
      e.clientX >= window.innerWidth ||
      e.clientY <= 0 ||
      e.clientY >= window.innerHeight
    ) {
      removeAllOverlays();
    }
  });

  // Upload area drag and drop
  uploadAreas.forEach((area) => {
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      area.addEventListener(eventName, preventDefaults);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      area.addEventListener(eventName, highlight);
    });

    ["dragleave", "drop"].forEach((eventName) => {
      area.addEventListener(eventName, unhighlight);
    });

    area.addEventListener("drop", handleDrop);
  });

  // Handle footer JavaScript
  updateCopyrightYear();
  initializeSocialLinks();
});

// Track drag state globally
let dragCounter = 0;
let currentDropTarget = null;
let isProcessingDrag = false;

// Drag and Drop handlers
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function highlight(e) {
  preventDefaults(e);

  if (isProcessingDrag) return; // Skip if we're already processing

  const uploadArea = e.currentTarget;

  // Only handle if this is a new drag target or no current target
  if (!currentDropTarget || currentDropTarget !== uploadArea) {
    isProcessingDrag = true;

    // Clean up any existing overlays first
    removeAllOverlays();

    currentDropTarget = uploadArea;
    dragCounter = 1;

    uploadArea.classList.add("drag-active");

    const overlay = document.createElement("div");
    overlay.className = "drag-overlay";
    overlay.innerHTML = `
      <div class="drag-content">
        <span class="material-icons">file_upload</span>
        <p>Drop image here</p>
      </div>
    `;
    uploadArea.appendChild(overlay);

    // Reset processing flag after a short delay
    setTimeout(() => {
      isProcessingDrag = false;
    }, 100);
  }
}

function unhighlight(e) {
  preventDefaults(e);

  if (isProcessingDrag) return; // Skip if we're already processing

  const uploadArea = e.currentTarget;
  const relatedTarget = e.relatedTarget;

  // Check if we're actually leaving the upload area
  if (relatedTarget && uploadArea.contains(relatedTarget)) {
    return; // Skip if moving to a child element
  }

  // Only unhighlight if this is our current drop target
  if (currentDropTarget === uploadArea) {
    isProcessingDrag = true;
    removeAllOverlays();
    setTimeout(() => {
      isProcessingDrag = false;
    }, 100);
  }
}

function removeAllOverlays() {
  // Reset state
  dragCounter = 0;
  currentDropTarget = null;

  // Remove all active states and overlays
  document.querySelectorAll(".drag-active").forEach((element) => {
    element.classList.remove("drag-active");
  });

  document.querySelectorAll(".drag-overlay").forEach((overlay) => {
    overlay.remove();
  });
}

function handleDrop(e) {
  preventDefaults(e);

  const uploadArea = e.currentTarget;
  removeAllOverlays();

  const dt = e.dataTransfer;
  const files = dt.files;
  const input = uploadArea
    .closest(".upload-form")
    .querySelector('input[type="file"]');

  if (files.length > 0) {
    input.files = files;
    handleFileSelect(input);
  }
}

// Reset upload area
function resetUploadArea(uploadId) {
  const container = document.getElementById(uploadId);
  if (!container) return;

  // Get the elements
  const uploadArea = container.querySelector(".upload-area");
  const deleteBtn = container.querySelector(".upload-delete-btn");
  const uploadBtn = container.querySelector(".upload-btn");
  const fileInput = container.querySelector('input[type="file"]');

  // Clear the upload area and restore initial content
  uploadArea.innerHTML = `
    <div class="upload-content">
      <span class="material-icons">cloud_upload</span>
      <p class="upload-specs-mute">Drag and drop or click to upload</p>
      <p class="upload-specs">Only JPG, JPEG and PNG files allowed</p>
    </div>
  `;

  // Remove preview class
  uploadArea.classList.remove("has-preview");

  // Hide upload button
  if (uploadBtn) {
    uploadBtn.style.display = "none";
  }

  // Hide delete button
  if (deleteBtn) {
    deleteBtn.style.display = "none";
  }

  // Clear file input
  if (fileInput) {
    fileInput.value = "";
  }
}

// Password visibility toggle
function togglePasswordVisibility(fieldId) {
  const passwordField = document.getElementById(fieldId);
  const eyeIcon = passwordField.parentElement.querySelector(
    ".password-toggle img"
  );

  if (passwordField.type === "password") {
    passwordField.type = "text";
    eyeIcon.src = "images/eye-off.svg";
  } else {
    passwordField.type = "password";
    eyeIcon.src = "images/eye.svg";
  }
}

// Notification System
class NotificationManager {
  static DEFAULT_DURATION = 5000;

  static show(message, type = "info", duration) {
    duration = duration || this.DEFAULT_DURATION;
    try {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () =>
          this._showNotification(message, type, duration)
        );
        return;
      }
      return this._showNotification(message, type, duration);
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }

  static _showNotification(message, type, duration) {
    const container =
      document.getElementById("notification-container") ||
      this.createContainer();
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      ${message}
      <span class="notification-close" onclick="this.parentElement.remove()">✕</span>
    `;

    container.appendChild(notification);
    notification.offsetHeight;
    notification.classList.add("show");

    setTimeout(() => {
      notification.classList.add("hide");
      setTimeout(() => notification.remove(), 300);
    }, duration);

    return notification;
  }

  static createContainer() {
    const container = document.createElement("div");
    container.id = "notification-container";
    document.body.appendChild(container);
    return container;
  }

  static success(message, duration) {
    return this.show(message, "success", duration);
  }

  static error(message, duration) {
    return this.show(message, "error", duration);
  }

  static info(message, duration) {
    return this.show(message, "info", duration);
  }

  static warning(message, duration) {
    return this.show(message, "warning", duration);
  }
}

window.notify = NotificationManager;

// Upload handler
function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    notify.error("Only JPG, JPEG and PNG files are allowed");
    input.value = "";
    return;
  }

  if (file.size > 12 * 1024 * 1024) {
    notify.error("File size should be less than 12MB");
    input.value = "";
    return;
  }

  const uploadContainer = input.closest(".upload-container");
  const uploadArea = uploadContainer.querySelector(".upload-area");
  const uploadContent = uploadArea.querySelector(".upload-content");

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.src = e.target.result;
    img.className = "preview-image";

    img.onload = function () {
      uploadArea.innerHTML = "";
      uploadArea.appendChild(img);
      uploadArea.classList.add("has-preview");

      const uploadBtn = uploadContainer.querySelector(".upload-btn");
      const deleteBtn = uploadContainer.querySelector(".upload-delete-btn");
      uploadBtn.style.display = "block";
      deleteBtn.style.display = "block";
    };
  };

  reader.onerror = function () {
    notify.error("Error reading file");
  };

  reader.readAsDataURL(file);
}

// Modal functions
function showUpload(uploadId) {
  const overlay = document.querySelector(".upload-overlay");
  const container = document.getElementById(uploadId);

  if (!container) {
    console.error(`Upload container with id ${uploadId} not found`);
    return;
  }

  overlay.style.display = "block";
  container.style.display = "flex";
  container.style.opacity = "1";
  container.style.visibility = "visible";
}

function hideUpload(uploadId) {
  const overlay = document.querySelector(".upload-overlay");
  const container = document.getElementById(uploadId);

  if (!overlay || !container) return;

  overlay.style.display = "none";
  container.style.display = "none";
  container.style.opacity = "0";
  container.style.visibility = "hidden";

  resetUploadArea(uploadId);
}

function showDeleteModal(modalId) {
  const overlay = document.querySelector(".delete-overlay");
  const modal = document.getElementById(modalId);

  if (!modal) return;

  overlay.style.display = "block";
  modal.style.display = "block";
  setTimeout(() => {
    modal.style.opacity = "1";
    modal.style.visibility = "visible";
  }, 10);
}

function hideDeleteModal(modalId) {
  const overlay = document.querySelector(".delete-overlay");
  const modal = document.getElementById(modalId);

  if (!modal) return;

  overlay.style.display = "none";
  modal.style.opacity = "0";
  modal.style.visibility = "hidden";
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}

// Avatar removal
function removeAvatar() {
  fetch("/profile/avatar/remove", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Store notification data in sessionStorage
        sessionStorage.setItem(
          "notification",
          JSON.stringify({
            message: data.message,
            type: "success",
          })
        );

        // Hide the modal
        hideDeleteModal("delete-avatar-modal");

        // Reload the page
        location.reload();
      } else {
        notify.error(data.message);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      notify.error("Error removing avatar");
    });
}

// Gallery JavaScript

let activeGalleryImage = null;

function expandGalleryImage(imageId, imageUrl, altText) {
  const previousActive = document.querySelector('.gallery-item-active');
  if (previousActive) {
    previousActive.classList.remove('gallery-item-active');
  }

  if (activeGalleryImage === imageId) {
    closeGalleryPreview();
    return;
  }

  activeGalleryImage = imageId;
  const currentItem = document.querySelector(`[data-image-id="${imageId}"]`);
  currentItem.classList.add('gallery-item-active');

  const previewContainer = document.getElementById('galleryPreview');
  const previewImage = document.getElementById('galleryPreviewImage');
  const galleryGrid = document.querySelector('.gallery-grid');
  const downloadBtn = previewContainer.querySelector('.gallery-download-btn');

  // Add loading class while image loads
  previewContainer.classList.add('gallery-preview-loading');
  
  previewImage.onload = function() {
    previewContainer.classList.remove('gallery-preview-loading');
  };

  previewImage.src = imageUrl;
  previewImage.alt = altText;

  galleryGrid.classList.add('gallery-grid-preview');
  previewContainer.classList.add('gallery-preview-active');
}

function callDeleteImage() {
  deleteImage(activeGalleryImage);
}

function callDownloadImage() {
  downloadImage(activeGalleryImage);
}

function closeGalleryPreview() {
  activeGalleryImage = null;
  const galleryGrid = document.querySelector('.gallery-grid');
  const previewContainer = document.getElementById('galleryPreview');
  const previewImage = document.getElementById('galleryPreviewImage');
  const activeItem = document.querySelector('.gallery-item-active');

  if (activeItem) {
    activeItem.classList.remove('gallery-item-active');
  }

  galleryGrid.classList.remove('gallery-grid-preview');
  previewContainer.classList.remove('gallery-preview-active');
}

function downloadImage(imageId) {
  fetch(`/gallery/${imageId}/download`, { 
    method: "GET",
    credentials: 'same-origin'
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || "Failed to get download URL");
        });
      }
      return response.json();
    })
    .then(({ url, filename }) => {
      
      return fetch(url, {
        method: 'GET',
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Image fetch failed: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          if (!blob) {
            throw new Error("No blob data received");
          }
          
          const objectUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = 'none';
          a.href = objectUrl;
          a.download = filename || 'picsforge-download';
          document.body.appendChild(a);
          a.click();
          
          setTimeout(() => {
            window.URL.revokeObjectURL(objectUrl);
            a.remove();
          }, 100);
          
          notify.success('Downloading image...');
        });
    })
    .catch((error) => {
      console.error("Download error details:", error);
      notify.error(`Failed to download image: ${error.message}`);
    });
}


// Delete images from gallery
function deleteImage(imageId) {
  fetch(`/gallery/${imageId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        sessionStorage.setItem(
          "notification",
          JSON.stringify({
            message: data.message,
            type: "success",
          })
        );

        // Hide the modal
        hideDeleteModal("gallery-delete-modal");

        // Reload the page
        location.reload();
      } else {
        notify.error(data.message);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      notify.error("Error deleting image");
    });
}

// Footer JavaScript
function updateCopyrightYear() {
  const yearElement = document.getElementById("currentYear");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}
function initializeSocialLinks() {
  const githubLink = document.querySelector(".footer-github");
  const linkedinLink = document.querySelector(".footer-linkedin");

  if (githubLink) {
    githubLink.addEventListener("click", function (e) {
      e.preventDefault();
      window.open("https://github.com/DeepBwas", "_blank");
    });
  }

  if (linkedinLink) {
    linkedinLink.addEventListener("click", function (e) {
      e.preventDefault();
      window.open("https://www.linkedin.com/in/deep-bwas/", "_blank");
    });
  }
}
