// Side nav toggle
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger");
  const sideNav = document.getElementById("sideNav");
  const uploadAreas = document.querySelectorAll('.upload-area');
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

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
  document.addEventListener('dragenter', preventDefaults);
  
  document.addEventListener('dragleave', (e) => {
    preventDefaults(e);
    
    // Check if we're actually leaving the document
    if (e.clientX <= 0 || e.clientX >= window.innerWidth || 
        e.clientY <= 0 || e.clientY >= window.innerHeight) {
      removeAllOverlays();
    }
  });
  
  // Upload area drag and drop
  uploadAreas.forEach(area => {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      area.addEventListener(eventName, preventDefaults);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      area.addEventListener(eventName, highlight);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      area.addEventListener(eventName, unhighlight);
    });

    area.addEventListener('drop', handleDrop);
  });
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
  
  if (isProcessingDrag) return;  // Skip if we're already processing
  
  const uploadArea = e.currentTarget;
  
  // Only handle if this is a new drag target or no current target
  if (!currentDropTarget || currentDropTarget !== uploadArea) {
    isProcessingDrag = true;
    
    // Clean up any existing overlays first
    removeAllOverlays();
    
    currentDropTarget = uploadArea;
    dragCounter = 1;
    
    uploadArea.classList.add('drag-active');
    
    const overlay = document.createElement('div');
    overlay.className = 'drag-overlay';
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
  
  if (isProcessingDrag) return;  // Skip if we're already processing
  
  const uploadArea = e.currentTarget;
  const relatedTarget = e.relatedTarget;
  
  // Check if we're actually leaving the upload area
  if (relatedTarget && uploadArea.contains(relatedTarget)) {
    return;  // Skip if moving to a child element
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
  document.querySelectorAll('.drag-active').forEach(element => {
    element.classList.remove('drag-active');
  });
  
  document.querySelectorAll('.drag-overlay').forEach(overlay => {
    overlay.remove();
  });
}

function handleDrop(e) {
  preventDefaults(e);
  
  const uploadArea = e.currentTarget;
  removeAllOverlays();
  
  const dt = e.dataTransfer;
  const files = dt.files;
  const input = uploadArea.closest('.upload-form').querySelector('input[type="file"]');
  
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
  const uploadArea = container.querySelector('.upload-area');
  const uploadBtn = container.querySelector('.upload-btn');
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
  uploadArea.classList.remove('has-preview');
  
  // Hide upload button
  if (uploadBtn) {
    uploadBtn.style.display = 'none';
  }

  // Hide delete button
  const deleteBtn = container.querySelector('.upload-delete-btn');
  if (deleteBtn) {
    deleteBtn.style.display = 'none';
  }
  
  // Clear file input
  if (fileInput) {
    fileInput.value = '';
  }
}

// Password visibility toggle
function togglePasswordVisibility(fieldId) {
  const passwordField = document.getElementById(fieldId);
  const eyeIcon = passwordField.parentElement.querySelector(".password-toggle img");

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
    const container = document.getElementById("notification-container") || this.createContainer();
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
      uploadArea.innerHTML = '';
      uploadArea.appendChild(img);
      uploadArea.classList.add('has-preview');
      
      const uploadBtn = uploadContainer.querySelector('.upload-btn');
      const deleteBtn = uploadContainer.querySelector('.upload-delete-btn');
      uploadBtn.style.display = 'block';
      deleteBtn.style.display = 'block';
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
  
  // Reset the upload area when hiding
  resetUploadArea(uploadId);
}

// Escape key handler
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const visibleContainer = document.querySelector('.upload-container[style*="display: block"]');
    if (visibleContainer) {
      hideUpload(visibleContainer.id);
    }
  }
});