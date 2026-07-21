const DEFAULT_QUALITY = 0.88;

const readImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image file"));
    };

    image.src = objectUrl;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image conversion failed"));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });

export const resizeImageToLimit = async (file, maxWidth, maxHeight, quality = DEFAULT_QUALITY) => {
  // Skip non-image files; backend validation still applies.
  if (!file?.type?.startsWith("image/")) {
    return file;
  }

  const image = await readImageFromFile(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;

  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return file;
  }

  const scale = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
  const targetWidth = Math.max(1, Math.floor(originalWidth * scale));
  const targetHeight = Math.max(1, Math.floor(originalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const outputType = supportedTypes.has(file.type) ? file.type : "image/jpeg";
  const blob = await canvasToBlob(canvas, outputType, quality);

  const extension = outputType.split("/")[1] || "jpg";
  const baseName = file.name.includes(".") ? file.name.substring(0, file.name.lastIndexOf(".")) : file.name;

  return new File([blob], `${baseName}.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  });
};

export const resizeImagesToPlanLimit = async (files, maxWidth, maxHeight, quality = DEFAULT_QUALITY) => {
  return Promise.all(files.map((file) => resizeImageToLimit(file, maxWidth, maxHeight, quality)));
};
