const jwt = require("jsonwebtoken");
const { DownloadAccessStatus, ProductType } = require("@prisma/client");
const prisma = require("../lib/prisma");

const DOWNLOAD_TOKEN_TTL = 60 * 60;
const VALID_DOWNLOAD_STATUSES = Object.values(DownloadAccessStatus);

function downloadSecret() {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('DOWNLOAD_TOKEN_SECRET no está configurado o es demasiado corto');
  }
  return secret;
}

function signDownloadToken(clientId, accessId) {
  return jwt.sign(
    { sub: clientId, accessId, purpose: "download" },
    downloadSecret(),
    { algorithm: 'HS256', expiresIn: DOWNLOAD_TOKEN_TTL }
  );
}

function verifyDownloadToken(token) {
  try {
    const payload = jwt.verify(token, downloadSecret(), { algorithms: ['HS256'] });
    return payload.purpose === "download" ? payload : null;
  } catch (_err) {
    return null;
  }
}

function isSafeFileUrl(value) {
  return /^https?:\/\/.+/.test(value) || /^\//.test(value);
}

function serializeFile(file) {
  if (!file) return null;
  return {
    id: file.id,
    productId: file.productId,
    fileName: file.fileName,
    fileSize: file.fileSize,
    version: file.version,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

function isMissingDownloadFileIdColumn(error) {
  return error?.code === "P2022" && String(error?.meta?.column || "").includes("ClientDownload.downloadFileId");
}

async function listAdminDownloads(req, res, next) {
  try {
    const [products, standaloneFiles] = await Promise.all([
      prisma.product.findMany({
        where: { type: ProductType.DESCARGABLE },
        include: { downloadFile: true },
        orderBy: { name: "asc" },
      }),
      prisma.productDownloadFile.findMany({
        where: { productId: null },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return res.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        isActive: p.isActive,
        downloadFile: serializeFile(p.downloadFile),
      })),
      standaloneFiles: standaloneFiles.map(serializeFile),
    });
  } catch (error) {
    return next(error);
  }
}

async function upsertDownloadFile({ productId = null, body, uploadedById }) {
  const { fileUrl, fileName, fileSize, version } = body || {};
  const url = String(fileUrl || "").trim();
  if (!url) {
    const error = new Error("fileUrl es requerido");
    error.status = 400;
    throw error;
  }
  if (!isSafeFileUrl(url)) {
    const error = new Error("fileUrl debe ser una URL valida (https://...) o ruta absoluta (/...)");
    error.status = 400;
    throw error;
  }

  const data = {
    productId,
    fileUrl: url,
    fileName: String(fileName || "").trim() || "archivo",
    fileSize: fileSize ? Number(fileSize) : null,
    version: version ? String(version).trim() : null,
    uploadedById,
  };

  if (productId) {
    return prisma.productDownloadFile.upsert({
      where: { productId },
      update: data,
      create: data,
    });
  }

  return prisma.productDownloadFile.create({ data });
}

async function setDownloadFile(req, res, next) {
  try {
    const productId = Number.parseInt(req.params.productId, 10);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: "productId invalido" });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, type: true },
    });
    if (!product) return res.status(404).json({ error: "Producto no encontrado" });
    if (product.type !== ProductType.DESCARGABLE) {
      return res.status(400).json({ error: "Este producto no es de tipo DESCARGABLE" });
    }

    const file = await upsertDownloadFile({
      productId,
      body: req.body,
      uploadedById: req.user.id,
    });

    return res.json(serializeFile(file));
  } catch (error) {
    return error.status ? res.status(error.status).json({ error: error.message }) : next(error);
  }
}

async function createDownloadFile(req, res, next) {
  try {
    const productId = req.body?.productId ? Number.parseInt(req.body.productId, 10) : null;
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, type: true },
      });
      if (!product) return res.status(404).json({ error: "Producto no encontrado" });
      if (product.type !== ProductType.DESCARGABLE) {
        return res.status(400).json({ error: "Solo se puede vincular a productos DESCARGABLE" });
      }
    }

    const file = await upsertDownloadFile({
      productId,
      body: req.body,
      uploadedById: req.user.id,
    });

    return res.status(201).json(serializeFile(file));
  } catch (error) {
    return error.status ? res.status(error.status).json({ error: error.message }) : next(error);
  }
}

async function deleteDownloadFile(req, res, next) {
  try {
    const productId = Number.parseInt(req.params.productId, 10);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: "productId invalido" });
    }
    const file = await prisma.productDownloadFile.findUnique({ where: { productId } });
    if (!file) return res.status(404).json({ error: "Archivo no encontrado" });
    await prisma.productDownloadFile.delete({ where: { productId } });
    return res.json({ message: "Archivo eliminado" });
  } catch (error) {
    return next(error);
  }
}

async function listClientDownloads(req, res, next) {
  try {
    const downloads = await prisma.clientDownload.findMany({
      where: { clientId: req.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            details: true,
            specificationsUrl: true,
            isActive: true,
          },
        },
        downloadFile: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            version: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      downloads: downloads.map((d) => ({
        id: d.id,
        productId: d.productId,
        productName: d.product?.name || d.downloadFile?.fileName || "Archivo descargable",
        productDescription: d.product?.description || null,
        productDetails: d.product?.details || null,
        specificationsUrl: d.product?.specificationsUrl || null,
        status: d.status,
        notes: d.notes,
        downloadCount: d.downloadCount,
        lastDownloadAt: d.lastDownloadAt,
        createdAt: d.createdAt,
        file: d.downloadFile
          ? {
              fileName: d.downloadFile.fileName,
              fileSize: d.downloadFile.fileSize,
              version: d.downloadFile.version,
              updatedAt: d.downloadFile.updatedAt,
            }
          : null,
        isAvailable: Boolean(d.downloadFile)
          && d.status === DownloadAccessStatus.ACTIVE
          && (d.product?.isActive ?? true),
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function generateDownloadToken(req, res, next) {
  try {
    const accessId = Number.parseInt(req.params.accessId || req.params.productId, 10);
    if (!Number.isInteger(accessId) || accessId <= 0) {
      return res.status(400).json({ error: "accessId invalido" });
    }

    const access = await prisma.clientDownload.findFirst({
      where: { id: accessId, clientId: req.user.id },
      include: {
        product: { select: { isActive: true } },
        downloadFile: { select: { id: true, fileName: true } },
      },
    });

    if (!access) return res.status(403).json({ error: "No tenes acceso a esta descarga" });
    if (!access.downloadFile) return res.status(404).json({ error: "El archivo aun no esta disponible" });
    if (access.status !== DownloadAccessStatus.ACTIVE) return res.status(403).json({ error: "Esta descarga no esta activa" });
    if (access.product && !access.product.isActive) return res.status(403).json({ error: "Este producto no esta disponible" });

    return res.json({
      token: signDownloadToken(req.user.id, access.id),
      expiresIn: DOWNLOAD_TOKEN_TTL,
      fileName: access.downloadFile.fileName,
    });
  } catch (error) {
    return next(error);
  }
}

async function serveDownload(req, res, next) {
  try {
    const tokenStr = String(req.query.token || "").trim();
    if (!tokenStr) return res.status(400).json({ error: "token requerido" });

    const payload = verifyDownloadToken(tokenStr);
    if (!payload) return res.status(401).json({ error: "Token invalido o expirado" });

    const access = await prisma.clientDownload.findFirst({
      where: {
        id: Number(payload.accessId),
        clientId: Number(payload.sub),
        status: DownloadAccessStatus.ACTIVE,
      },
      include: {
        product: { select: { isActive: true } },
        downloadFile: { select: { fileUrl: true, fileName: true } },
      },
    });

    if (!access || !access.downloadFile || (access.product && !access.product.isActive)) {
      return res.status(403).json({ error: "Acceso denegado o archivo no disponible" });
    }

    prisma.clientDownload.update({
      where: { id: access.id },
      data: { downloadCount: { increment: 1 }, lastDownloadAt: new Date() },
    }).catch(() => {});

    res.setHeader("Content-Disposition", `attachment; filename="${access.downloadFile.fileName}"`);
    res.setHeader("X-Robots-Tag", "noindex");
    return res.redirect(302, access.downloadFile.fileUrl);
  } catch (error) {
    return next(error);
  }
}

async function listAllClientDownloads(req, res, next) {
  try {
    let downloads;
    try {
      downloads = await prisma.clientDownload.findMany({
        include: {
          client: { select: { id: true, name: true, email: true, company: true } },
          product: { select: { id: true, name: true } },
          downloadFile: { select: { id: true, fileName: true, version: true, updatedAt: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      if (!isMissingDownloadFileIdColumn(error)) {
        throw error;
      }

      downloads = await prisma.clientDownload.findMany({
        include: {
          client: { select: { id: true, name: true, email: true, company: true } },
          product: {
            select: {
              id: true,
              name: true,
              downloadFile: { select: { id: true, fileName: true, version: true, updatedAt: true } }
            }
          },
        },
        orderBy: { createdAt: "desc" },
      });

      downloads = downloads.map((download) => ({
        ...download,
        downloadFile: download.product?.downloadFile || null,
      }));
    }
    return res.json({ downloads, statuses: VALID_DOWNLOAD_STATUSES });
  } catch (error) {
    return next(error);
  }
}

async function grantDownloadAccess(req, res, next) {
  try {
    const { clientId, productId, downloadFileId, orderId, status, notes } = req.body || {};
    const cId = Number.parseInt(clientId, 10);
    const pId = productId ? Number.parseInt(productId, 10) : null;
    const fId = Number.parseInt(downloadFileId, 10);
    const oId = orderId ? Number.parseInt(orderId, 10) : null;
    const nextStatus = status ? String(status) : DownloadAccessStatus.ACTIVE;

    if (!Number.isInteger(cId) || cId <= 0) return res.status(400).json({ error: "clientId invalido" });
    if (pId && (!Number.isInteger(pId) || pId <= 0)) return res.status(400).json({ error: "productId invalido" });
    if (!Number.isInteger(fId) || fId <= 0) return res.status(400).json({ error: "downloadFileId invalido" });
    if (!VALID_DOWNLOAD_STATUSES.includes(nextStatus)) return res.status(400).json({ error: "status invalido" });

    const file = await prisma.productDownloadFile.findUnique({
      where: { id: fId },
      select: { id: true, productId: true },
    });
    if (!file) return res.status(404).json({ error: "Archivo no encontrado" });

    if (pId) {
      const product = await prisma.product.findUnique({ where: { id: pId }, select: { type: true } });
      if (!product) return res.status(404).json({ error: "Producto no encontrado" });
      if (product.type !== ProductType.DESCARGABLE) {
        return res.status(400).json({ error: "Solo se puede vincular a productos DESCARGABLE" });
      }
    }

    let resolvedOrderId = oId;
    if (!resolvedOrderId && pId) {
      const order = await prisma.order.findFirst({
        where: { clientId: cId, productId: pId },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });
      resolvedOrderId = order?.id || null;
    }

    const access = await prisma.clientDownload.upsert({
      where: { clientId_downloadFileId: { clientId: cId, downloadFileId: fId } },
      update: {
        productId: pId || file.productId || null,
        orderId: resolvedOrderId,
        status: nextStatus,
        notes: notes ? String(notes).trim() : null,
      },
      create: {
        clientId: cId,
        productId: pId || file.productId || null,
        downloadFileId: fId,
        orderId: resolvedOrderId,
        status: nextStatus,
        notes: notes ? String(notes).trim() : null,
      },
    });

    return res.status(201).json(access);
  } catch (error) {
    return next(error);
  }
}

async function updateDownloadAccess(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "id invalido" });

    const data = {};
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "status")) {
      const status = String(req.body.status || "");
      if (!VALID_DOWNLOAD_STATUSES.includes(status)) return res.status(400).json({ error: "status invalido" });
      data.status = status;
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "notes")) {
      data.notes = req.body.notes ? String(req.body.notes).trim() : null;
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: "No hay campos para actualizar" });

    const access = await prisma.clientDownload.update({ where: { id }, data });
    return res.json(access);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Acceso no encontrado" });
    return next(error);
  }
}

module.exports = {
  listAdminDownloads,
  setDownloadFile,
  createDownloadFile,
  deleteDownloadFile,
  listClientDownloads,
  generateDownloadToken,
  serveDownload,
  listAllClientDownloads,
  grantDownloadAccess,
  updateDownloadAccess,
};
