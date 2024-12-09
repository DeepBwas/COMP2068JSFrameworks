let hasBeenCropped = false;
document.addEventListener("DOMContentLoaded", function () {
  const imageId = window.location.pathname.split("/")[2];
  const editImage = document.getElementById("editImage");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const canvasContainer = document.getElementById("canvasContainer");
  const optionBtns = document.querySelectorAll(".option-btn");
  const suboptions = document.querySelectorAll(".suboption-group");

  let changesSaved = true;

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

  let editHistory = {
    adjustments: new Map(),
    filters: [],
    crops: 0,

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

    generateMessage() {
      const parts = [];

      const adjustmentsList = [];
      this.adjustments.forEach((value, type) => {
        if (value !== 0) {
          adjustmentsList.push(`${type}: ${value}`);
        }
      });
      if (adjustmentsList.length > 0) {
        parts.push(`Adjustments: ${adjustmentsList.join(", ")}`);
      }

      if (this.filters.length > 0) {
        parts.push(`Filters: ${[...new Set(this.filters)].join(", ")}`);
      }

      if (this.crops > 0) {
        parts.push(`Cropped ${this.crops} time${this.crops > 1 ? "s" : ""}`);
      }

      return parts.length > 0 ? parts.join("; ") : "Image edited";
    },

    reset() {
      this.adjustments.clear();
      this.filters = [];
      this.crops = 0;
    },
  };

  let currentFilter = "none";
  let isProcessing = false;
  let caman = null;
  let isCropping = false;
  let currentAspectRatio = null;
  let cropBox = null;

  canvasContainer.style.display = "none";

  const cropContainer = document.createElement("div");
  cropContainer.className = "crop-container";
  cropContainer.style.display = "none";

  cropContainer.innerHTML = `
    <div class="crop-overlay">
        <div class="crop-box">
            <div class="crop-handle tl"></div>
            <div class="crop-handle tr"></div>
            <div class="crop-handle bl"></div>
            <div class="crop-handle br"></div>
        </div>
    </div>
`;

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
  `;

  const styleSheet = document.createElement("style");
  styleSheet.textContent = cropStyles;
  document.head.appendChild(styleSheet);

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = function () {
    editImage.width = this.naturalWidth;
    editImage.height = this.naturalHeight;

    const ctx = editImage.getContext("2d");
    ctx.drawImage(this, 0, 0);

    loadingIndicator.style.display = "none";
    canvasContainer.style.display = "block";

    canvasContainer.appendChild(cropContainer);

    caman = Caman("#editImage", function () {});
  };

  img.onerror = function (error) {
    console.error("Error loading image:", error);
    loadingIndicator.textContent =
      "Error loading image. Please try refreshing.";
    notify.error("Error loading image. Please try again.");
  };

  const imageUrl = editImage.dataset.imageUrl;
  img.src = imageUrl;

  function startCropping(aspectRatio) {
    cleanupCrop();

    isCropping = true;
    cropContainer.style.display = "block";
    currentAspectRatio = aspectRatio === "0" ? null : parseFloat(aspectRatio);
    cropBox = cropContainer.querySelector(".crop-box");

    const canvasRect = editImage.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();

    let width, height;

    if (aspectRatio === "original") {
      const imageRatio = editImage.width / editImage.height;
      width = Math.min(canvasRect.width * 0.8, canvasRect.width);
      height = width / imageRatio;
    } else if (aspectRatio === "1") {
      width = Math.min(canvasRect.width, canvasRect.height) * 0.8;
      height = width;
    } else if (aspectRatio === "0") {
      width = canvasRect.width * 0.8;
      height = canvasRect.height * 0.8;
    } else {
      width = canvasRect.width * 0.8;
      height = width / parseFloat(aspectRatio);

      if (height > canvasRect.height * 0.8) {
        height = canvasRect.height * 0.8;
        width = height * parseFloat(aspectRatio);
      }
    }

    const left = (canvasRect.width - width) / 2;
    const top = (canvasRect.height - height) / 2;

    cropContainer.style.width = canvasRect.width + "px";
    cropContainer.style.height = canvasRect.height + "px";
    cropContainer.style.left =
      (containerRect.width - canvasRect.width) / 2 + "px";
    cropContainer.style.top =
      (containerRect.height - canvasRect.height) / 2 + "px";

    cropBox.style.width = `${width}px`;
    cropBox.style.height = `${height}px`;
    cropBox.style.left = `${left}px`;
    cropBox.style.top = `${top}px`;

    initializeCropDragging();
  }

  function initializeCropDragging() {
    let isDragging = false;
    let startX, startY;
    let startLeft, startTop;
    let startWidth, startHeight;
    let currentHandle = null;

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

    document.addEventListener("mousemove", function (e) {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const imageRect = editImage.getBoundingClientRect();
      const containerRect = canvasContainer.getBoundingClientRect();

      const imageBounds = {
        left: (containerRect.width - imageRect.width) / 2,
        top: (containerRect.height - imageRect.height) / 2,
        right: (containerRect.width + imageRect.width) / 2,
        bottom: (containerRect.height + imageRect.height) / 2,
      };

      if (currentHandle) {
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        switch (currentHandle.className.split(" ")[1]) {
          case "br":
            newWidth = Math.max(
              50,
              Math.min(startWidth + deltaX, imageBounds.right - startLeft)
            );
            if (currentAspectRatio) {
              newHeight = newWidth / currentAspectRatio;
              if (newHeight > imageBounds.bottom - startTop) {
                newHeight = imageBounds.bottom - startTop;
                newWidth = newHeight * currentAspectRatio;
              }
            } else {
              newHeight = Math.max(
                50,
                Math.min(startHeight + deltaY, imageBounds.bottom - startTop)
              );
            }
            break;

          case "bl":
            newWidth = Math.max(
              50,
              Math.min(
                startWidth - deltaX,
                startLeft + startWidth - imageBounds.left
              )
            );
            newLeft = startLeft + startWidth - newWidth;
            if (currentAspectRatio) {
              newHeight = newWidth / currentAspectRatio;
              if (newHeight > imageBounds.bottom - startTop) {
                newHeight = imageBounds.bottom - startTop;
                newWidth = newHeight * currentAspectRatio;
                newLeft = startLeft + startWidth - newWidth;
              }
            } else {
              newHeight = Math.max(
                50,
                Math.min(startHeight + deltaY, imageBounds.bottom - startTop)
              );
            }
            break;

          case "tr":
            newWidth = Math.max(
              50,
              Math.min(startWidth + deltaX, imageBounds.right - startLeft)
            );
            if (currentAspectRatio) {
              newHeight = newWidth / currentAspectRatio;
              newTop = startTop + startHeight - newHeight;
              if (newTop < imageBounds.top) {
                newTop = imageBounds.top;
                newHeight = startTop + startHeight - imageBounds.top;
                newWidth = newHeight * currentAspectRatio;
              }
            } else {
              newHeight = Math.max(
                50,
                Math.min(
                  startHeight - deltaY,
                  startTop + startHeight - imageBounds.top
                )
              );
              newTop = startTop + startHeight - newHeight;
            }
            break;

          case "tl":
            newWidth = Math.max(
              50,
              Math.min(
                startWidth - deltaX,
                startLeft + startWidth - imageBounds.left
              )
            );
            newLeft = startLeft + startWidth - newWidth;
            if (currentAspectRatio) {
              newHeight = newWidth / currentAspectRatio;
              newTop = startTop + startHeight - newHeight;
              if (newTop < imageBounds.top) {
                newTop = imageBounds.top;
                newHeight = startTop + startHeight - imageBounds.top;
                newWidth = newHeight * currentAspectRatio;
                newLeft = startLeft + startWidth - newWidth;
              }
            } else {
              newHeight = Math.max(
                50,
                Math.min(
                  startHeight - deltaY,
                  startTop + startHeight - imageBounds.top
                )
              );
              newTop = startTop + startHeight - newHeight;
            }
            break;
        }

        cropBox.style.width = `${newWidth}px`;
        cropBox.style.height = `${newHeight}px`;
        cropBox.style.left = `${newLeft}px`;
        cropBox.style.top = `${newTop}px`;
      } else {
        let newLeft = startLeft + deltaX;
        let newTop = startTop + deltaY;

        newLeft = Math.max(
          imageBounds.left,
          Math.min(newLeft, imageBounds.right - cropBox.offsetWidth)
        );
        newTop = Math.max(
          imageBounds.top,
          Math.min(newTop, imageBounds.bottom - cropBox.offsetHeight)
        );

        cropBox.style.left = `${newLeft}px`;
        cropBox.style.top = `${newTop}px`;
      }
    });

    document.addEventListener("mouseup", function () {
      isDragging = false;
      currentHandle = null;
    });
  }

  function applyCrop() {
    if (!isCropping || !cropBox) return;
    let canvasRect = editImage.getBoundingClientRect();
    let boxRect = cropBox.getBoundingClientRect();

    const relativeX = boxRect.left - canvasRect.left;
    const relativeY = boxRect.top - canvasRect.top;

    const scaleX = editImage.width / canvasRect.width;
    const scaleY = editImage.height / canvasRect.height;

    const cropX = Math.round(relativeX * scaleX);
    const cropY = Math.round(relativeY * scaleY);
    const cropWidth = Math.round(boxRect.width * scaleX);
    const cropHeight = Math.round(boxRect.height * scaleY);

    caman.crop(cropWidth, cropHeight, cropX, cropY);

    caman.render(() => {
      editImage.width = cropWidth;
      editImage.height = cropHeight;

      const ctx = editImage.getContext("2d");
      ctx.clearRect(0, 0, editImage.width, editImage.height);
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

      editImage.style.display = "none";
      editImage.offsetHeight;
      editImage.style.display = "block";

      cleanupCrop();
      cropBtns.forEach((btn) => btn.classList.remove("active"));

      hasBeenCropped = true;
      changesSaved = false;
      notify.success("Image cropped successfully");
      isProcessing = false;

      caman = Caman("#editImage", function () {});
    });
  }

  function cancelCrop() {
    cleanupCrop();
    cropBtns.forEach((btn) => btn.classList.remove("active"));
  }

  function cleanupCrop() {
    isCropping = false;
    currentAspectRatio = null;
    cropContainer.style.display = "none";
    if (cropBox) {
      cropBox.style.width = "0px";
      cropBox.style.height = "0px";
      cropBox.style.left = "0px";
      cropBox.style.top = "0px";
    }
    cropBox = null;
  }

  const cropBtns = document.querySelectorAll(".crop-btn");
  cropBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isProcessing || !caman) return;

      if (isCropping && btn.classList.contains("active")) {
        cancelCrop();
        return;
      }

      cropBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const ratio = btn.dataset.ratio;
      startCropping(ratio);
    });
  });

  window.applyCrop = applyCrop;

  const cropApplyBtn = document.querySelector(".crop-apply-btn");
  const cropCancelBtn = document.querySelector(".crop-cancel-btn");

  if (cropApplyBtn && cropCancelBtn) {
    cropApplyBtn.addEventListener("click", applyCrop);
    cropCancelBtn.addEventListener("click", cancelCrop);
  } else {
    console.log("Crop action buttons not found");
    console.log(cropApplyBtn, cropCancelBtn);
  }

  optionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const option = btn.dataset.option;
      const targetSuboptions = document.getElementById(`${option}Options`);
      const wasActive = btn.classList.contains("active");

      optionBtns.forEach((b) => {
        b.classList.remove("active");
        const icon = b.querySelector(".material-icons");
        if (icon) icon.style.color = "white";
      });
      suboptions.forEach((sub) => sub.classList.remove("active"));
      cancelCrop();
      if (!wasActive) {
        btn.classList.add("active");
        const icon = btn.querySelector(".material-icons");
        if (icon) icon.style.color = "#fe0000";
        targetSuboptions.classList.add("active");
      }
    });
  });

  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach((slider) => {
    slider.addEventListener("input", (e) => {
      if (isProcessing || !caman) return;
      changesSaved = false;
      const value = parseInt(e.target.value);
      const label = e.target.previousElementSibling;
      const adjustmentType = slider.dataset.adjust;

      label.textContent = `${
        adjustmentType.charAt(0).toUpperCase() + adjustmentType.slice(1)
      }: ${value}`;

      adjustments[adjustmentType] = value;

      clearTimeout(slider.timeout);
      slider.timeout = setTimeout(() => {
        applyAdjustments();
      }, 150);
      editHistory.addAdjustment(adjustmentType, value);
    });

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

  function applyAdjustments() {
    if (isProcessing || !caman) return;
    isProcessing = true;
    changesSaved = false;

    caman.revert(false);

    caman.brightness(adjustments.brightness);
    caman.contrast(adjustments.contrast);
    caman.saturation(adjustments.saturation);

    if (adjustments.brilliance !== 0) {
      const brillianceValue = adjustments.brilliance;
      caman.contrast(brillianceValue * 0.3);
      caman.vibrance(brillianceValue * 0.5);
    }

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

    if (adjustments.sharpness > 0) {
      caman.sharpen(adjustments.sharpness * 0.5);
    }

    if (adjustments.warmth !== 0) {
      const warmthValue = adjustments.warmth;
      if (warmthValue > 0) {
        caman.colorize(255, 150, 0, warmthValue * 0.5);
      } else {
        caman.colorize(0, 100, 255, Math.abs(warmthValue) * 0.5);
      }
    }

    if (currentFilter && currentFilter !== "none") {
      applyFilter(currentFilter, false);
    }

    caman.render(function () {
      isProcessing = false;
    });
  }

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
      );
    });
  }

  const backBtn = document.querySelector(".editor-back-btn");

  backBtn.addEventListener("click", function (e) {
    e.preventDefault();

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
      changesSaved = true;
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

    return hasAdjustments || hasFilter || hasEditHistory || hasBeenCropped;
  }

  window.addEventListener("beforeunload", handleBeforeUnload);

  const tooltipElements = document.querySelectorAll("[data-tooltip]");
  tooltipElements.forEach((element) => {
    const tooltipText = element.dataset.tooltip;
    element.title = tooltipText;
  });

  function handleBeforeUnload(e) {
    if (hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = "";
    }
  }

  const resetBtn = document.querySelector(".editor-reset-btn");

  function resetImage() {
    if (isProcessing || !caman) return;

    if (!hasUnsavedChanges()) {
      notify.info("No changes to reset");
      return;
    }

    cancelCrop();

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

    document.querySelectorAll('input[type="range"]').forEach((slider) => {
      slider.value = 0;
      const label = slider.previousElementSibling;
      const adjustmentType = slider.dataset.adjust;
      label.textContent = `${
        adjustmentType.charAt(0).toUpperCase() + adjustmentType.slice(1)
      }: 0`;
    });

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document
      .querySelector('.filter-btn[data-filter="none"]')
      .classList.add("active");
    currentFilter = "none";

    editHistory.reset();

    isProcessing = true;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      const canvas = document.getElementById("editImage");
      canvas.width = this.naturalWidth;
      canvas.height = this.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(this, 0, 0);

      if (caman) {
        caman.reset();
        caman = null;
      }

      caman = Caman("#editImage", function () {
        isProcessing = false;
        changesSaved = true;
        notify.success("Image reset to original");
      });
    };
    img.src = editImage.dataset.imageUrl;
  }

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

  document.addEventListener("keydown", function (e) {
    if (e.key === "r" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      resetBtn.click();
    }
  });
});
