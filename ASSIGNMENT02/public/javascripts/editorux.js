document.addEventListener("DOMContentLoaded", function () {
  const imageId = window.location.pathname.split("/")[2];
  const editImage = document.getElementById("editImage");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const canvasContainer = document.getElementById("canvasContainer");
  const optionBtns = document.querySelectorAll(".option-btn");
  const suboptions = document.querySelectorAll(".suboption-group");

  let changesSaved = true;

  // Store adjustments
  let adjustments = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    brilliance: 0,
    highlights: 0,
    shadows: 0,
    warmth: 0,
    sharpness: 0,
  };

  // Add edit history tracking
  let editHistory = {
    adjustments: new Map(),
    filters: [],
    crops: 0,

    // Add edit to history
    addAdjustment(type, value) {
      this.adjustments.set(type, value);
    },

    addFilter(filterName) {
      if (filterName !== "none") {
        this.filters.push(filterName);
      } else {
        this.filters = [];
      }
    },

    addCrop() {
      this.crops++;
    },

    // Generate edit message
    generateMessage() {
      const parts = [];

      // Add adjustments summary
      const adjustmentsList = [];
      this.adjustments.forEach((value, type) => {
        if (value !== 0) {
          adjustmentsList.push(`${type}: ${value}`);
        }
      });
      if (adjustmentsList.length > 0) {
        parts.push(`Adjustments: ${adjustmentsList.join(", ")}`);
      }

      // Add filters
      if (this.filters.length > 0) {
        parts.push(`Filters: ${[...new Set(this.filters)].join(", ")}`);
      }

      // Add crops
      if (this.crops > 0) {
        parts.push(`Cropped ${this.crops} time${this.crops > 1 ? "s" : ""}`);
      }

      return parts.length > 0 ? parts.join("; ") : "Image edited";
    },

    // Reset history
    reset() {
      this.adjustments.clear();
      this.filters = [];
      this.crops = 0;
    },
  };

  // Initialize states
  let currentFilter = "none";
  let isProcessing = false;
  let caman = null;
  let isCropping = false;
  let currentAspectRatio = null;
  let cropBox = null;

  // Hide canvas container initially
  canvasContainer.style.display = "none";

  // Create crop container
  const cropContainer = document.createElement("div");
  cropContainer.className = "crop-container";
  cropContainer.style.display = "none";

  // Initialize crop overlay HTML
  cropContainer.innerHTML = `
        <div class="crop-overlay">
            <div class="crop-box">
                <div class="crop-handle tl"></div>
                <div class="crop-handle tr"></div>
                <div class="crop-handle bl"></div>
                <div class="crop-handle br"></div>
            </div>
            <div class="crop-actions">
                <button class="crop-apply-btn">Apply</button>
                <button class="crop-cancel-btn">Cancel</button>
            </div>
        </div>
    `;

  // Add crop styles
  const cropStyles = `
        .crop-container {
            position: absolute;
            inset: 0;
            pointer-events: none;
        }
        .crop-overlay {
            position: relative;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
        }
        .crop-box {
            position: absolute;
            border: 2px solid white;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
            pointer-events: all;
            cursor: move;
        }
        .crop-handle {
            position: absolute;
            width: 20px;
            height: 20px;
            background: white;
            border: 1px solid #333;
        }
        .crop-handle.tl { top: -10px; left: -10px; cursor: nw-resize; }
        .crop-handle.tr { top: -10px; right: -10px; cursor: ne-resize; }
        .crop-handle.bl { bottom: -10px; left: -10px; cursor: sw-resize; }
        .crop-handle.br { bottom: -10px; right: -10px; cursor: se-resize; }
        .crop-actions {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            pointer-events: all;
        }
        .crop-apply-btn, .crop-cancel-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: "SF-Pro", sans-serif;
            color: white;
        }
        .crop-apply-btn {
            background: #444;
        }
        .crop-cancel-btn {
            background: #444;
        }
    `;

  // Add styles to document
  const styleSheet = document.createElement("style");
  styleSheet.textContent = cropStyles;
  document.head.appendChild(styleSheet);

  // Load image first
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = function () {
    // Set canvas dimensions
    editImage.width = this.naturalWidth;
    editImage.height = this.naturalHeight;

    // Draw image
    const ctx = editImage.getContext("2d");
    ctx.drawImage(this, 0, 0);

    // Hide loading indicator and show canvas
    loadingIndicator.style.display = "none";
    canvasContainer.style.display = "block";

    // Add crop container to canvas container
    canvasContainer.appendChild(cropContainer);

    // Initialize Caman after image is loaded
    caman = Caman("#editImage", function () {
      notify.success("Image ready for editing");
    });
  };

  img.onerror = function (error) {
    console.error("Error loading image:", error);
    loadingIndicator.textContent =
      "Error loading image. Please try refreshing.";
    notify.error("Error loading image. Please try again.");
  };

  // Get image URL from canvas data attribute
  const imageUrl = editImage.dataset.imageUrl;
  img.src = imageUrl;

  // Cropping functionality
  function startCropping(aspectRatio) {
    isCropping = true;
    cropContainer.style.display = "block";

    // Get crop box reference
    cropBox = cropContainer.querySelector(".crop-box");

    // Calculate initial crop box size
    const canvasRect = canvasContainer.getBoundingClientRect();
    const imageRect = editImage.getBoundingClientRect();

    let width, height;

    if (aspectRatio === "original") {
      // Use the current image aspect ratio
      const imageAspectRatio = editImage.width / editImage.height;
      width = Math.min(imageRect.width * 0.8, canvasRect.width * 0.8);
      height = width / imageAspectRatio;
    } else {
      // Use specified aspect ratio
      aspectRatio = parseFloat(aspectRatio);
      width = Math.min(imageRect.width * 0.8, canvasRect.width * 0.8);
      height = aspectRatio === 0 ? width : width / aspectRatio;

      // Adjust if height exceeds boundaries
      if (height > imageRect.height * 0.8) {
        height = imageRect.height * 0.8;
        width = aspectRatio === 0 ? height : height * aspectRatio;
      }
    }

    // Position crop box centered on image
    const left = (canvasRect.width - width) / 2;
    const top = (canvasRect.height - height) / 2;

    // Apply dimensions and position
    cropBox.style.width = `${width}px`;
    cropBox.style.height = `${height}px`;
    cropBox.style.left = `${left}px`;
    cropBox.style.top = `${top}px`;
  }

  function initializeCropDragging() {
    let isDragging = false;
    let startX, startY;
    let startLeft, startTop;
    let currentHandle = null;

    // Handle drag start
    cropBox.addEventListener("mousedown", function (e) {
      if (e.target.classList.contains("crop-handle")) {
        currentHandle = e.target;
      } else if (e.target === cropBox) {
        currentHandle = null;
      } else {
        return;
      }

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = cropBox.offsetLeft;
      startTop = cropBox.offsetTop;
      startWidth = cropBox.offsetWidth;
      startHeight = cropBox.offsetHeight;

      e.preventDefault();
    });

    // Handle dragging
    document.addEventListener("mousemove", function (e) {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const canvasRect = editImage.getBoundingClientRect();

      if (currentHandle) {
        // Resizing
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        if (currentHandle.classList.contains("br")) {
          newWidth = startWidth + deltaX;
          if (currentAspectRatio) {
            newHeight = newWidth / currentAspectRatio;
          } else {
            newHeight = startHeight + deltaY;
          }
        }
        // Add other handle cases here...

        // Apply constraints
        newWidth = Math.max(50, Math.min(newWidth, canvasRect.width - newLeft));
        newHeight = Math.max(
          50,
          Math.min(newHeight, canvasRect.height - newTop)
        );

        cropBox.style.width = `${newWidth}px`;
        cropBox.style.height = `${newHeight}px`;
        cropBox.style.left = `${newLeft}px`;
        cropBox.style.top = `${newTop}px`;
      } else {
        // Moving
        let newLeft = startLeft + deltaX;
        let newTop = startTop + deltaY;

        // Keep within bounds
        newLeft = Math.max(
          0,
          Math.min(newLeft, canvasRect.width - cropBox.offsetWidth)
        );
        newTop = Math.max(
          0,
          Math.min(newTop, canvasRect.height - cropBox.offsetHeight)
        );

        cropBox.style.left = `${newLeft}px`;
        cropBox.style.top = `${newTop}px`;
      }
    });

    // Handle drag end
    document.addEventListener("mouseup", function () {
      isDragging = false;
      currentHandle = null;
    });
  }

  function applyCrop() {
    if (!isCropping || !cropBox) return;

    const canvasRect = editImage.getBoundingClientRect();
    const boxRect = cropBox.getBoundingClientRect();

    const scaleX = editImage.width / canvasRect.width;
    const scaleY = editImage.height / canvasRect.height;

    const cropX = (boxRect.left - canvasRect.left) * scaleX;
    const cropY = (boxRect.top - canvasRect.top) * scaleY;
    const cropWidth = boxRect.width * scaleX;
    const cropHeight = boxRect.height * scaleY;

    // Create temporary canvas for cropping
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;

    const ctx = tempCanvas.getContext("2d");
    ctx.drawImage(
      editImage,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    // Update original canvas
    editImage.width = cropWidth;
    editImage.height = cropHeight;
    editImage.getContext("2d").drawImage(tempCanvas, 0, 0);

    // Reset crop mode
    cancelCrop();

    // Reinitialize Caman
    caman = Caman(editImage, function () {
      // Reapply current adjustments and filters
      applyAdjustments();
    });
    editHistory.addCrop();
  }

  function cancelCrop() {
    isCropping = false;
    currentAspectRatio = null;
    cropContainer.style.display = "none";
  }

  // Add crop button handlers
  const cropBtns = document.querySelectorAll(".crop-btn");
  cropBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isProcessing || !caman) return;

      cropBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      startCropping(btn.dataset.ratio);
    });
  });

  // Add crop action button handlers
  const cropApplyBtn = cropContainer.querySelector(".crop-apply-btn");
  const cropCancelBtn = cropContainer.querySelector(".crop-cancel-btn");

  cropApplyBtn.addEventListener("click", applyCrop);
  cropCancelBtn.addEventListener("click", cancelCrop);
  // Option buttons click handlers
  optionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const option = btn.dataset.option;
      const targetSuboptions = document.getElementById(`${option}Options`);
      const wasActive = btn.classList.contains("active");

      // Reset all buttons and suboptions
      optionBtns.forEach((b) => {
        b.classList.remove("active");
        const icon = b.querySelector(".material-icons");
        if (icon) icon.style.color = "white";
      });
      suboptions.forEach((sub) => sub.classList.remove("active"));

      // Toggle clicked option if it wasn't active
      if (!wasActive) {
        btn.classList.add("active");
        const icon = btn.querySelector(".material-icons");
        if (icon) icon.style.color = "#fe0000";
        targetSuboptions.classList.add("active");
      }
    });
  });

  // Adjustment sliders
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach((slider) => {
    slider.addEventListener("input", (e) => {
      if (isProcessing || !caman) return;
      changesSaved = false;
      const value = parseInt(e.target.value);
      const label = e.target.previousElementSibling;
      const adjustmentType = slider.dataset.adjust;

      // Update label
      label.textContent = `${
        adjustmentType.charAt(0).toUpperCase() + adjustmentType.slice(1)
      }: ${value}`;

      // Store adjustment value
      adjustments[adjustmentType] = value;

      // Debounce the adjustment application
      clearTimeout(slider.timeout);
      slider.timeout = setTimeout(() => {
        applyAdjustments();
      }, 150);
      editHistory.addAdjustment(adjustmentType, value);
    });

    // Add double-click reset
    slider.addEventListener("dblclick", function () {
      if (isProcessing) return;

      this.value = 0;
      const label = this.previousElementSibling;
      const adjustmentType = this.dataset.adjust;
      label.textContent = `${
        adjustmentType.charAt(0).toUpperCase() + adjustmentType.slice(1)
      }: 0`;
      adjustments[adjustmentType] = 0;
      applyAdjustments();
    });
  });

  // Function to apply adjustments
  function applyAdjustments() {
    if (isProcessing || !caman) return;
    isProcessing = true;
    changesSaved = false;

    // Reset Caman
    caman.revert(false);

    // Basic adjustments
    caman.brightness(adjustments.brightness);
    caman.contrast(adjustments.contrast);
    caman.saturation(adjustments.saturation);

    // Brilliance (combination of contrast and vibrance)
    if (adjustments.brilliance !== 0) {
      const brillianceValue = adjustments.brilliance;
      caman.contrast(brillianceValue * 0.3);
      caman.vibrance(brillianceValue * 0.5);
    }

    // Highlights and shadows
    if (adjustments.highlights !== 0) {
      const highlightValue = adjustments.highlights;
      caman.exposure(highlightValue * 0.5);
      if (highlightValue > 0) {
        caman.curves("rgb", [0, 0], [100, 120], [180, 180], [255, 255]);
      } else {
        caman.curves("rgb", [0, 0], [100, 80], [180, 180], [255, 255]);
      }
    }

    if (adjustments.shadows !== 0) {
      const shadowValue = adjustments.shadows;
      if (shadowValue > 0) {
        caman.gamma(1 - shadowValue * 0.02);
        caman.curves("rgb", [0, 20], [100, 100], [255, 255]);
      } else {
        caman.gamma(1 + Math.abs(shadowValue) * 0.02);
        caman.curves("rgb", [0, -20], [100, 100], [255, 255]);
      }
    }

    // Sharpness
    if (adjustments.sharpness > 0) {
      caman.sharpen(adjustments.sharpness * 0.5);
    }

    // Warmth (color temperature)
    if (adjustments.warmth !== 0) {
      const warmthValue = adjustments.warmth;
      if (warmthValue > 0) {
        caman.colorize(255, 150, 0, warmthValue * 0.5);
      } else {
        caman.colorize(0, 100, 255, Math.abs(warmthValue) * 0.5);
      }
    }

    // If there's an active filter, reapply it
    if (currentFilter && currentFilter !== "none") {
      applyFilter(currentFilter, false);
    }

    // Render changes
    caman.render(function () {
      isProcessing = false;
    });
  }

  // Filter buttons
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isProcessing || !caman) return;

      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentFilter = btn.dataset.filter;
      applyFilter(currentFilter);

      const filterName = btn.dataset.filter;
      editHistory.addFilter(filterName);
    });
  });

  // Function to apply filters
  function applyFilter(filterName, shouldRender = true) {
    if (isProcessing || !caman) return;
    isProcessing = true;
    changesSaved = false;

    if (shouldRender) {
      caman.revert(false);
    }

    switch (filterName) {
      case "none":
        break;
      case "vivid":
        caman.vibrance(50);
        caman.saturation(25);
        caman.contrast(15);
        caman.exposure(10);
        break;
      case "dramatic":
        caman.contrast(50);
        caman.brightness(10);
        caman.exposure(10);
        caman.curves("rgb", [0, 0], [100, 120], [180, 180], [255, 255]);
        break;
      case "mono":
        caman.greyscale();
        caman.contrast(10);
        caman.exposure(10);
        break;
      case "silvertone":
        caman.greyscale();
        caman.sepia(30);
        caman.curves("rgb", [0, 10], [128, 140], [255, 255]);
        caman.exposure(10);
        break;
      case "noir":
        caman.greyscale();
        caman.contrast(50);
        caman.brightness(-10);
        caman.vignette("50%");
        caman.curves("rgb", [0, 0], [100, 60], [255, 255]);
        break;
    }

    if (shouldRender) {
      // Reapply adjustments after filter
      Object.entries(adjustments).forEach(([type, value]) => {
        if (value !== 0) {
          switch (type) {
            case "brightness":
              caman.brightness(value);
              break;
            case "contrast":
              caman.contrast(value);
              break;
            case "saturation":
              caman.saturation(value);
              break;
            case "warmth":
              if (value > 0) {
                caman.colorize(255, 150, 0, value * 0.5);
              } else {
                caman.colorize(0, 100, 255, Math.abs(value) * 0.5);
              }
              break;
          }
        }
      });

      caman.render(function () {
        isProcessing = false;
      });
    }
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.92
      ); // Reduced quality from 0.92 to 0.85
    });
  }

  const backBtn = document.querySelector(".editor-back-btn");

  backBtn.addEventListener("click", function (e) {
    e.preventDefault(); // Prevent default navigation first

    if (hasUnsavedChanges()) {
      console.log("Unsaved changes detected");
      notify.warning("Save or reset your changes before leaving");
    } else {
      window.location.href = "/gallery";
    }
  });

  const saveBtn = document.querySelector(".editor-save-btn");
  saveBtn.addEventListener("click", async () => {
    try {
      if (isProcessing || !caman) {
        notify.info("Please wait while processing");
        return;
      }

      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span class="material-icons">hourglass_empty</span> Saving...`;

      const canvas = document.getElementById("editImage");
      const blob = await canvasToBlob(canvas);

      const formData = new FormData();
      formData.append("image", blob, "edited-image.jpg");
      formData.append("editMessage", editHistory.generateMessage());

      const response = await fetch(`/editor/${imageId}/save`, {
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Save failed");
        }
        throw new Error("Server error occurred");
      }

      const data = await response.json();
      notify.success("Image saved successfully");
      changesSaved = true; // Set changes as saved
    } catch (error) {
      console.error("Save error:", error);
      notify.error(error.message || "Error saving image");
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<span class="material-icons">save</span> Save`;
    }
  });

  function handleBeforeUnload(e) {
    if (hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = "";
    }
  }

  function hasUnsavedChanges() {
    if (changesSaved) return false;

    const hasAdjustments = Object.values(adjustments).some(
      (value) => value !== 0
    );
    const hasFilter = currentFilter !== "none";
    const hasEditHistory =
      editHistory.filters.length > 0 || editHistory.crops > 0;

    return hasAdjustments || hasFilter || hasEditHistory;
  }

  window.addEventListener("beforeunload", handleBeforeUnload);

  // Add keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    // Cancel crop with Escape key
    if (e.key === "Escape" && isCropping) {
      cancelCrop();
    }

    // Save with Ctrl+S
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!saveBtn.disabled) {
        saveBtn.click();
      }
    }
  });

  // Function to check if device is mobile
  function isMobileDevice() {
    return (
      typeof window.orientation !== "undefined" ||
      navigator.userAgent.indexOf("IEMobile") !== -1
    );
  }

  // Add touch support for mobile devices
  if (isMobileDevice()) {
    let touchStartX, touchStartY;
    let touchTimeout;

    editImage.addEventListener("touchstart", function (e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;

      // Start timer for long press
      touchTimeout = setTimeout(() => {
        // Handle zoom in on long press
        const scale =
          currentScale < MAX_SCALE ? currentScale + SCALE_FACTOR : MIN_SCALE;
        editImage.style.transform = `scale(${scale})`;
      }, 500);
    });

    editImage.addEventListener("touchend", function () {
      clearTimeout(touchTimeout);
    });

    editImage.addEventListener("touchmove", function (e) {
      clearTimeout(touchTimeout);
    });
  }

  // Initialize tooltips
  const tooltipElements = document.querySelectorAll("[data-tooltip]");
  tooltipElements.forEach((element) => {
    const tooltipText = element.dataset.tooltip;
    element.title = tooltipText;
  });

  // Clean up function
  function cleanup() {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    if (caman) {
      caman.reset();
    }
    editHistory.reset();
    changesSaved = true;
  }

  // Handle page unload
  function handleBeforeUnload(e) {
    if (hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = "";
    }
  }

  // Clean up on page unload
  window.addEventListener("unload", cleanup);

  window.applyCrop = function () {
    if (!isCropping || !cropBox) return;

    changesSaved = false;
    const canvasRect = editImage.getBoundingClientRect();
    const boxRect = cropBox.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();

    // Calculate the scale factors to convert from display pixels to canvas pixels
    const scaleX = editImage.width / editImage.offsetWidth;
    const scaleY = editImage.height / editImage.offsetHeight;

    // Calculate the relative position of the crop box to the image
    const imageOffset = {
      left: (containerRect.width - editImage.offsetWidth) / 2,
      top: (containerRect.height - editImage.offsetHeight) / 2,
    };

    // Calculate crop dimensions in canvas coordinates
    const cropX =
      (boxRect.left - containerRect.left - imageOffset.left) * scaleX;
    const cropY = (boxRect.top - containerRect.top - imageOffset.top) * scaleY;
    const cropWidth = boxRect.width * scaleX;
    const cropHeight = boxRect.height * scaleY;

    // Create temporary canvas for cropping
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;

    const ctx = tempCanvas.getContext("2d");
    ctx.drawImage(
      editImage,
      cropX,
      cropY,
      cropWidth,
      cropHeight, // Source coordinates
      0,
      0,
      cropWidth,
      cropHeight // Destination coordinates
    );

    // Update original canvas
    editImage.width = cropWidth;
    editImage.height = cropHeight;
    editImage.getContext("2d").drawImage(tempCanvas, 0, 0);

    // Reset crop mode
    isCropping = false;
    cropContainer.style.display = "none";

    // Reset crop buttons
    document.querySelectorAll(".crop-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector('[data-ratio="original"]').classList.add("active");

    // Reinitialize Caman
    caman = Caman(editImage, function () {
      // Reapply current adjustments and filters
      applyAdjustments();
      notify.success("Image cropped successfully");
    });
  };

  const resetBtn = document.querySelector(".editor-reset-btn");

  function resetImage() {
    if (isProcessing || !caman) return;

    // Check if there are any changes to reset
    if (!hasUnsavedChanges()) {
      notify.info("No changes to reset");
      return;
    }

    // Reset all adjustments
    adjustments = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      brilliance: 0,
      highlights: 0,
      shadows: 0,
      warmth: 0,
      sharpness: 0,
    };

    // Reset all sliders and labels
    document.querySelectorAll('input[type="range"]').forEach((slider) => {
      slider.value = 0;
      const label = slider.previousElementSibling;
      const adjustmentType = slider.dataset.adjust;
      label.textContent = `${
        adjustmentType.charAt(0).toUpperCase() + adjustmentType.slice(1)
      }: 0`;
    });

    // Reset filter buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document
      .querySelector('.filter-btn[data-filter="none"]')
      .classList.add("active");
    currentFilter = "none";

    // Reset edit history
    editHistory.reset();

    // Reset the image
    isProcessing = true;
    caman.revert(true);

    // Load original image again
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      const canvas = document.getElementById("editImage");
      canvas.width = this.naturalWidth;
      canvas.height = this.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(this, 0, 0);

      // Reinitialize Caman
      caman = Caman("#editImage", function () {
        isProcessing = false;
        changesSaved = true;
        notify.success("Image reset to original");
      });
    };
    img.src = editImage.dataset.imageUrl;
  }

  // Add reset button handler
  resetBtn.addEventListener("click", () => {
    if (isProcessing) {
      notify.info("Please wait while processing");
      return;
    }

    if (hasUnsavedChanges()) {
      resetImage();
    } else {
      notify.info("No changes to reset");
    }
  });

  // Add keyboard shortcut for reset (Ctrl+R)
  document.addEventListener("keydown", function (e) {
    if (e.key === "r" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      resetBtn.click();
    }
  });
});
