const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/webm"
]);

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf", ".mp4", ".webm"]);

const BLOCKED_EXT = new Set([
  ".zip", ".rar", ".7z", ".exe", ".bat", ".cmd",
  ".js", ".html", ".svg", ".docm", ".xlsm", ".php", ".sh"
]);

const SIZE_LIMITS = {
  "image/jpeg": 5 * 1024 * 1024,
  "image/png": 5 * 1024 * 1024,
  "image/webp": 5 * 1024 * 1024,
  "application/pdf": 10 * 1024 * 1024,
  "video/mp4": 25 * 1024 * 1024,
  "video/webm": 25 * 1024 * 1024
};

const RESOURCE_TYPE = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "application/pdf": "raw",
  "video/mp4": "video",
  "video/webm": "video"
};

function getExtension(filename) {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

function sanitizeName(filename) {
  // Strip path separators and control characters, truncate
  return filename
    .replace(/[/\\]/g, "")
    .replace(/[\x00-\x1f]/g, "")
    .slice(0, 120);
}

function validateFile(originalname, mimetype, size) {
  const safe = sanitizeName(originalname);
  const ext = getExtension(safe);

  if (!ext) {
    return { error: "El archivo no tiene extensión." };
  }

  if (BLOCKED_EXT.has(ext)) {
    return { error: `Tipo de archivo no permitido: ${ext}` };
  }

  if (!ALLOWED_EXT.has(ext)) {
    return { error: `Extensión no permitida: ${ext}. Permitidos: imágenes, PDF, MP4, WebM.` };
  }

  // Detect double extension like malware.pdf.exe
  const parts = safe.split(".");
  if (parts.length > 2) {
    const penultimate = `.${parts[parts.length - 2].toLowerCase()}`;
    if (BLOCKED_EXT.has(penultimate)) {
      return { error: "Nombre de archivo no permitido." };
    }
  }

  if (!ALLOWED_MIME.has(mimetype)) {
    return { error: `Tipo MIME no permitido: ${mimetype}` };
  }

  const limit = SIZE_LIMITS[mimetype];
  if (size > limit) {
    const mb = (limit / (1024 * 1024)).toFixed(0);
    return { error: `El archivo supera el límite de ${mb} MB.` };
  }

  return { safe };
}

async function uploadToCloudinary(buffer, mimetype, originalname) {
  const resourceType = RESOURCE_TYPE[mimetype];

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: "util/attachments",
        use_filename: false,
        unique_filename: true,
        access_mode: "public"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { validateFile, uploadToCloudinary, sanitizeName };
