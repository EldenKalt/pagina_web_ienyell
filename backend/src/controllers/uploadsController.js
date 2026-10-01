const { validateFile, uploadToCloudinary, sanitizeName } = require("../utils/cloudinaryHelper");

const MAX_ATTACHMENTS = 3;

async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo." });
    }

    const { originalname, mimetype, size, buffer } = req.file;

    const validation = validateFile(originalname, mimetype, size);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const result = await uploadToCloudinary(buffer, mimetype, originalname);

    const isImage = mimetype.startsWith("image/");
    const isVideo = mimetype.startsWith("video/");

    return res.status(201).json({
      url: result.secure_url,
      publicId: result.public_id,
      name: sanitizeName(originalname),
      size: formatSize(size),
      type: isImage ? "image" : isVideo ? "video" : "file"
    });
  } catch (error) {
    return next(error);
  }
}

function formatSize(bytes) {
  const kb = bytes / 1024;
  if (kb > 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(kb))} KB`;
}

module.exports = { uploadFile };
