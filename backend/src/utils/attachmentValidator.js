const { sanitizeName } = require("./cloudinaryHelper");

const MAX_ATTACHMENTS = 3;
const ALLOWED_ATTACHMENT_TYPES = new Set(["image", "video", "file"]);
const MAX_PUBLIC_ID_LENGTH = 255;
const MAX_SIZE_LABEL_LENGTH = 40;

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function hasControlCharacters(value) {
  return /[\x00-\x1f\x7f]/.test(String(value || ""));
}

function cloudinaryUrlPrefix() {
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  if (!cloudName) {
    return null;
  }
  return `https://res.cloudinary.com/${cloudName}/`;
}

function validateAttachmentMetadata(input) {
  const prefix = cloudinaryUrlPrefix();
  if (!prefix) {
    return { error: "Cloudinary no está configurado para validar adjuntos." };
  }

  if (!isPlainObject(input)) {
    return { error: "Adjunto inválido." };
  }

  const url = String(input.url || "").trim();
  const publicId = String(input.publicId || "").trim();
  const type = String(input.type || "").trim();
  const size = String(input.size || "").trim();
  const name = sanitizeName(String(input.name || "").trim());

  if (!url || !url.startsWith(prefix)) {
    return { error: "El adjunto no pertenece al almacenamiento autorizado." };
  }

  if (!publicId || publicId.length > MAX_PUBLIC_ID_LENGTH || hasControlCharacters(publicId)) {
    return { error: "El identificador del adjunto no es válido." };
  }

  if (!ALLOWED_ATTACHMENT_TYPES.has(type)) {
    return { error: "Tipo de adjunto no permitido." };
  }

  if (!name) {
    return { error: "El nombre del adjunto no es válido." };
  }

  if (!size || size.length > MAX_SIZE_LABEL_LENGTH || hasControlCharacters(size)) {
    return { error: "El tamaño del adjunto no es válido." };
  }

  return {
    attachment: {
      url,
      publicId,
      name,
      size,
      type
    }
  };
}

function validateAttachmentsField(value) {
  if (value === undefined || value === null) {
    return { attachments: [] };
  }

  if (!Array.isArray(value)) {
    return { error: "attachments debe ser un arreglo." };
  }

  if (value.length > MAX_ATTACHMENTS) {
    return { error: `Máximo ${MAX_ATTACHMENTS} adjuntos por mensaje.` };
  }

  const attachments = [];
  for (const item of value) {
    const validation = validateAttachmentMetadata(item);
    if (validation.error) {
      return { error: validation.error };
    }
    attachments.push(validation.attachment);
  }

  return { attachments };
}

module.exports = {
  validateAttachmentsField
};
