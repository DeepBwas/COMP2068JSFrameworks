document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger");
  const sideNav = document.getElementById("sideNav");
  const uploadAreas = document.querySelectorAll(".upload-area");
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");
  const storedNotification = sessionStorage.getItem("notification");

  if (storedNotification) {
    const { message, type } = JSON.parse(storedNotification);
    notify[type](message);
    sessionStorage.removeItem("notification");
  }

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    sideNav.classList.toggle("active");
  });

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

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  const slideshow = document.getElementById("heroSlideshow");
  if (slideshow) {
    const heroSlideshow = new Slideshow(slideshow);

    slideshow.addEventListener("mouseenter", () => heroSlideshow.pause());
    slideshow.addEventListener("mouseleave", () => heroSlideshow.resume());
  }

  const uploadTriggers = document.querySelectorAll("[data-upload-trigger]");
  uploadTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const uploadId = trigger.dataset.uploadTrigger;
      showUpload(uploadId);
    });
  });

  document.addEventListener("dragenter", preventDefaults);

  document.addEventListener("dragleave", (e) => {
    preventDefaults(e);

    if (
      e.clientX <= 0 ||
      e.clientX >= window.innerWidth ||
      e.clientY <= 0 ||
      e.clientY >= window.innerHeight
    ) {
      removeAllOverlays();
    }
  });

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

  updateCopyrightYear();
  initializeSocialLinks();
});

let dragCounter = 0;
let currentDropTarget = null;
let isProcessingDrag = false;

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function highlight(e) {
  preventDefaults(e);

  if (isProcessingDrag) return;

  const uploadArea = e.currentTarget;

  if (!currentDropTarget || currentDropTarget !== uploadArea) {
    isProcessingDrag = true;

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

    setTimeout(() => {
      isProcessingDrag = false;
    }, 100);
  }
}

function unhighlight(e) {
  preventDefaults(e);

  if (isProcessingDrag) return;

  const uploadArea = e.currentTarget;
  const relatedTarget = e.relatedTarget;

  if (relatedTarget && uploadArea.contains(relatedTarget)) {
    return;
  }

  if (currentDropTarget === uploadArea) {
    isProcessingDrag = true;
    removeAllOverlays();
    setTimeout(() => {
      isProcessingDrag = false;
    }, 100);
  }
}

class Slideshow {
  constructor(element) {
    this.slideshow = element;
    this.slides = Array.from(element.getElementsByClassName("slide"));
    this.currentIndex = 0;
    this.interval = parseInt(element.dataset.interval) || 5000;
    this.timer = null;

    this.init();
  }

  init() {
    this.slides[0].classList.add("active");
    this.startSlideshow();
  }

  startSlideshow() {
    this.timer = setInterval(() => this.nextSlide(), this.interval);
  }

  nextSlide() {
    this.slides[this.currentIndex].classList.remove("active");

    this.currentIndex = (this.currentIndex + 1) % this.slides.length;

    this.slides[this.currentIndex].classList.add("active");
  }

  pause() {
    clearInterval(this.timer);
  }

  resume() {
    this.startSlideshow();
  }
}

function removeAllOverlays() {
  dragCounter = 0;
  currentDropTarget = null;
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

function resetUploadArea(uploadId) {
  const container = document.getElementById(uploadId);
  if (!container) return;

  const uploadArea = container.querySelector(".upload-area");
  const deleteBtn = container.querySelector(".upload-delete-btn");
  const uploadBtn = container.querySelector(".upload-btn");
  const fileInput = container.querySelector('input[type="file"]');

  uploadArea.innerHTML = `
    <div class="upload-content">
      <span class="material-icons">cloud_upload</span>
      <p class="upload-specs-mute">Drag and drop or click to upload</p>
      <p class="upload-specs">Only JPG, JPEG and PNG files allowed</p>
    </div>
  `;

  uploadArea.classList.remove("has-preview");

  if (uploadBtn) {
    uploadBtn.style.display = "none";
  }

  if (deleteBtn) {
    deleteBtn.style.display = "none";
  }

  if (fileInput) {
    fileInput.value = "";
  }
}

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
        sessionStorage.setItem(
          "notification",
          JSON.stringify({
            message: data.message,
            type: "success",
          })
        );
        hideDeleteModal("delete-avatar-modal");

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

let activeGalleryImage = null;

function expandGalleryImage(imageId, imageUrl, altText) {
  const previousActive = document.querySelector(".gallery-item-active");
  if (previousActive) {
    previousActive.classList.remove("gallery-item-active");
  }

  if (activeGalleryImage === imageId) {
    closeGalleryPreview();
    return;
  }

  activeGalleryImage = imageId;
  const currentItem = document.querySelector(`[data-image-id="${imageId}"]`);
  currentItem.classList.add("gallery-item-active");

  const previewContainer = document.getElementById("galleryPreview");
  const previewImage = document.getElementById("galleryPreviewImage");
  const galleryGrid = document.querySelector(".gallery-grid");

  previewContainer.classList.add("gallery-preview-loading");

  previewImage.onload = function () {
    previewContainer.classList.remove("gallery-preview-loading");
  };

  previewImage.src = imageUrl;
  previewImage.alt = altText;

  galleryGrid.classList.add("gallery-grid-preview");
  previewContainer.classList.add("gallery-preview-active");
}

function callDeleteImage() {
  deleteImage(activeGalleryImage);
}

function callDownloadImage() {
  downloadImage(activeGalleryImage);
}

function callEditImage() {
  window.location.href = `/editor/${activeGalleryImage}/edit`;
}

function closeGalleryPreview() {
  activeGalleryImage = null;
  const galleryGrid = document.querySelector(".gallery-grid");
  const previewContainer = document.getElementById("galleryPreview");
  const activeItem = document.querySelector(".gallery-item-active");

  if (activeItem) {
    activeItem.classList.remove("gallery-item-active");
  }

  galleryGrid.classList.remove("gallery-grid-preview");
  previewContainer.classList.remove("gallery-preview-active");
}

function downloadImage(imageId) {
  const link = document.createElement("a");
  link.href = `/gallery/${imageId}/download`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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
