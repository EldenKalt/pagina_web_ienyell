const {
  ProductCategory,
  ProductType,
  Role,
  ContractStatus
} = require("@prisma/client");
const prisma = require("../lib/prisma");
const { parseBulkIds } = require("../utils/bulkIds");

const VALID_CATEGORIES = Object.values(ProductCategory);
const VALID_TYPES = Object.values(ProductType);

function parseProductId(id) {
  const parsed = Number.parseInt(id, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeFeatures(features) {
  if (!Array.isArray(features)) {
    return null;
  }

  const cleaned = features
    .map((feature) => String(feature || "").trim())
    .filter(Boolean);

  return cleaned;
}

function validateCategory(category) {
  return VALID_CATEGORIES.includes(category);
}

async function resyncProductIdSequence() {
  await prisma.$executeRaw`
    SELECT setval(
      pg_get_serial_sequence('"Product"', 'id'),
      COALESCE((SELECT MAX(id) FROM "Product"), 0) + 1,
      false
    )
  `;
}

function isProductIdUniqueError(error) {
  return error?.code === "P2002"
    && Array.isArray(error?.meta?.target)
    && error.meta.target.includes("id");
}

function parseProductPayload(body, { partial = false } = {}) {
  const payload = {};

  if (!partial || Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = String(body.name || "").trim();
    if (!name) {
      return { error: "name es requerido" };
    }
    payload.name = name;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "category")) {
    if (!validateCategory(body.category)) {
      return { error: "category debe ser SOCIAL, VIDEO, DESIGN o WEB" };
    }
    payload.category = body.category;
  }

  if (Object.prototype.hasOwnProperty.call(body, "type")) {
    if (!VALID_TYPES.includes(body.type)) {
      return { error: `type debe ser uno de: ${VALID_TYPES.join(", ")}` };
    }
    payload.type = body.type;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "launchPrice")) {
    const launchPrice = Number(body.launchPrice);
    if (!Number.isFinite(launchPrice) || launchPrice < 0) {
      return { error: "launchPrice es requerido y debe ser numérico" };
    }
    payload.launchPrice = launchPrice;
  }

  if (Object.prototype.hasOwnProperty.call(body, "regularPrice")) {
    if (body.regularPrice === null || body.regularPrice === "") {
      payload.regularPrice = null;
    } else {
      const regularPrice = Number(body.regularPrice);
      if (!Number.isFinite(regularPrice) || regularPrice < 0) {
        return { error: "regularPrice debe ser numérico" };
      }
      payload.regularPrice = regularPrice;
    }
  } else if (!partial) {
    payload.regularPrice = null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    payload.description = body.description ? String(body.description).trim() : null;
  } else if (!partial) {
    payload.description = null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "details")) {
    payload.details = body.details ? String(body.details).trim() : null;
  } else if (!partial) {
    payload.details = null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "specificationsUrl")) {
    const url = String(body.specificationsUrl || "").trim();
    if (!url) {
      payload.specificationsUrl = null;
    } else if (!/^https?:\/\/.+/.test(url) && !/^\//.test(url)) {
      return { error: "specificationsUrl debe ser una URL vÃ¡lida (https://...) o ruta absoluta (/...)" };
    } else {
      payload.specificationsUrl = url;
    }
  } else if (!partial) {
    payload.specificationsUrl = null;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "features")) {
    const features = normalizeFeatures(body.features);
    if (!features) {
      return { error: "features debe ser un arreglo" };
    }
    payload.features = features;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'isActive')) {
    payload.isActive = Boolean(body.isActive);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'proveedorId')) {
    if (body.proveedorId === null || body.proveedorId === '') {
      payload.proveedorId = null;
    } else {
      const proveedorId = Number.parseInt(body.proveedorId, 10);
      if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
        return { error: 'proveedorId debe ser un entero positivo' };
      }
      payload.proveedorId = proveedorId;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'comisionUtil')) {
    const comisionUtil = Number(body.comisionUtil);
    if (!Number.isFinite(comisionUtil) || comisionUtil < 0) {
      return { error: 'comisionUtil debe ser un número >= 0' };
    }
    payload.comisionUtil = comisionUtil;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'porcentajeHacienda')) {
    const porcentajeHacienda = Number(body.porcentajeHacienda);
    if (!Number.isFinite(porcentajeHacienda) || porcentajeHacienda < 0) {
      return { error: 'porcentajeHacienda debe ser un número >= 0' };
    }
    payload.porcentajeHacienda = porcentajeHacienda;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'revisionEnabled')) {
    payload.revisionEnabled = Boolean(body.revisionEnabled);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'includedRevisions')) {
    const includedRevisions = Number.parseInt(body.includedRevisions, 10);
    if (!Number.isInteger(includedRevisions) || includedRevisions < 0) {
      return { error: 'includedRevisions debe ser un entero >= 0' };
    }
    payload.includedRevisions = includedRevisions;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'extraRevisionPrice')) {
    const extraRevisionPrice = Number(body.extraRevisionPrice);
    if (!Number.isFinite(extraRevisionPrice) || extraRevisionPrice < 0) {
      return { error: 'extraRevisionPrice debe ser un numero >= 0' };
    }
    payload.extraRevisionPrice = extraRevisionPrice;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'subscribable')) {
    payload.subscribable = Boolean(body.subscribable);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'subscriptionInterval')) {
    const raw = body.subscriptionInterval;
    if (raw === null || raw === '' || raw === undefined) {
      payload.subscriptionInterval = null;
    } else {
      const interval = String(raw).toUpperCase();
      const validIntervals = ['MONTHLY', 'QUARTERLY', 'YEARLY'];
      if (!validIntervals.includes(interval)) {
        return { error: 'subscriptionInterval debe ser MONTHLY, QUARTERLY o YEARLY' };
      }
      payload.subscriptionInterval = interval;
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'tags')) {
    const rawTags = body.tags;
    if (rawTags !== undefined) {
      if (!Array.isArray(rawTags)) {
        return { error: 'tags debe ser un arreglo de strings' };
      }
      payload.tags = rawTags
        .map((t) => String(t || '').trim().toLowerCase().replace(/\s+/g, '-'))
        .filter(Boolean);
    } else if (!partial) {
      payload.tags = [];
    }
  }

  return { payload };
}

async function getAllProducts(req, res, next) {
  try {
    const { category, tag, type, excludeType } = req.query;
    if (category && !validateCategory(category)) {
      return res.status(400).json({ error: 'category inválida' });
    }
    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'type inválido' });
    }
    if (excludeType && !VALID_TYPES.includes(excludeType)) {
      return res.status(400).json({ error: 'excludeType inválido' });
    }

    const where = {};
    if (category) {
      where.category = category;
    }
    if (tag && typeof tag === 'string') {
      const safeTag = tag.trim().toLowerCase();
      if (safeTag) {
        where.tags = { has: safeTag };
      }
    }
    if (type) {
      where.type = type;
    } else if (excludeType) {
      where.type = { not: excludeType };
    }

    if (!req.user || req.user.role !== Role.ADMIN) {
      where.isActive = true;
    }

    const productQuery = {
      where,
      include: {
        downloadFile: req.user?.role === Role.ADMIN
          ? { select: { id: true, fileName: true, fileSize: true, version: true, updatedAt: true } }
          : false,
        addOns: {
          where: { isActive: true },
          orderBy: { order: "asc" }
        },
        questions: {
          orderBy: { order: "asc" }
        },
        images: {
          orderBy: [{ isMain: "desc" }, { order: "asc" }]
        }
      },
      orderBy: [
        { isActive: "desc" },
        { category: "asc" },
        { name: "asc" }
      ]
    };

    let products;
    try {
      products = await prisma.product.findMany(productQuery);
    } catch (error) {
      if (!String(error?.message || "").includes("Unknown field `addOns`")) {
        throw error;
      }
      products = await prisma.product.findMany({
        where,
        include: {
          downloadFile: req.user?.role === Role.ADMIN
            ? { select: { id: true, fileName: true, fileSize: true, version: true, updatedAt: true } }
            : false
        },
        orderBy: productQuery.orderBy
      });
      products = products.map((product) => ({
        ...product,
        addOns: [],
        questions: []
      }));
    }

    return res.json(products);
  } catch (error) {
    return next(error);
  }
}

async function getClientProducts(req, res, next) {
  try {
    if (req.user.role !== Role.CLIENT) {
      return res.status(403).json({ error: "Solo clientes pueden consultar sus productos" });
    }

    const products = await prisma.clientProduct.findMany({
      where: {
        clientId: req.user.id
      },
      include: {
        product: true
      },
      orderBy: {
        startDate: "desc"
      }
    });

    return res.json(products);
  } catch (error) {
    return next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const { payload, error } = parseProductPayload(req.body || {});
    if (error) {
      return res.status(400).json({ error });
    }

    if (payload.proveedorId) {
      const proveedor = await prisma.user.findUnique({
        where: { id: payload.proveedorId },
        select: { role: true }
      });
      if (!proveedor || proveedor.role !== 'PROVEEDOR') {
        return res.status(400).json({ error: 'proveedorId no corresponde a un usuario con rol PROVEEDOR' });
      }
    }

    const comisionUtil = payload.comisionUtil ?? 0;
    const porcentajeHacienda = payload.porcentajeHacienda ?? 0;
    if (comisionUtil + porcentajeHacienda > 100) {
      return res.status(400).json({ error: 'comisionUtil + porcentajeHacienda no puede exceder 100%' });
    }

    let product;
    try {
      product = await prisma.product.create({
        data: payload
      });
    } catch (requestError) {
      if (!isProductIdUniqueError(requestError)) {
        throw requestError;
      }

      await resyncProductIdSequence();
      product = await prisma.product.create({
        data: payload
      });
    }

    return res.status(201).json(product);
  } catch (requestError) {
    return next(requestError);
  }
}

async function updateProduct(req, res, next) {
  try {
    const productId = parseProductId(req.params.id);
    if (!productId) {
      return res.status(400).json({ error: "id inválido" });
    }

    const body = req.body || {};
    if (!Object.keys(body).length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    const { payload, error } = parseProductPayload(body, { partial: true });
    if (error) {
      return res.status(400).json({ error });
    }

    if (!payload || !Object.keys(payload).length) {
      return res.status(400).json({ error: "No hay campos válidos para actualizar" });
    }

    if (payload.proveedorId !== undefined && payload.proveedorId !== null) {
      const proveedor = await prisma.user.findUnique({
        where: { id: payload.proveedorId },
        select: { role: true }
      });
      if (!proveedor || proveedor.role !== 'PROVEEDOR') {
        return res.status(400).json({ error: 'proveedorId no corresponde a un usuario con rol PROVEEDOR' });
      }
    }

    if ('comisionUtil' in payload || 'porcentajeHacienda' in payload) {
      const current = await prisma.product.findUnique({
        where: { id: productId },
        select: { comisionUtil: true, porcentajeHacienda: true }
      });
      if (!current) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      const comisionUtil = 'comisionUtil' in payload ? payload.comisionUtil : (current.comisionUtil || 0);
      const porcentajeHacienda = 'porcentajeHacienda' in payload ? payload.porcentajeHacienda : (current.porcentajeHacienda || 0);
      if (comisionUtil + porcentajeHacienda > 100) {
        return res.status(400).json({ error: 'comisionUtil + porcentajeHacienda no puede exceder 100%' });
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: payload
    });

    return res.json(product);
  } catch (requestError) {
    if (requestError.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    return next(requestError);
  }
}

async function toggleProduct(req, res, next) {
  try {
    const productId = parseProductId(req.params.id);
    if (!productId) {
      return res.status(400).json({ error: "id inválido" });
    }

    const current = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!current) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        isActive: !current.isActive
      }
    });

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const productId = parseProductId(req.params.id);
    if (!productId) {
      return res.status(400).json({ error: "id inválido" });
    }

    const [activeAssociations, orderAssociations] = await Promise.all([
      prisma.clientProduct.count({
        where: {
          productId,
          status: ContractStatus.ACTIVE
        }
      }),
      prisma.order.count({
        where: { productId }
      })
    ]);

    if (activeAssociations > 0 || orderAssociations > 0) {
      return res.status(400).json({ error: "No se puede eliminar un producto con contratos activos u órdenes asociadas" });
    }

    await prisma.product.delete({
      where: { id: productId }
    });

    return res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    if (error.code === "P2003") {
      return res.status(400).json({ error: "No se puede eliminar un producto con historial asociado" });
    }
    return next(error);
  }
}

async function bulkDeleteProducts(req, res, next) {
  try {
    const { ids, error } = parseBulkIds(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const blockedProducts = await prisma.product.findMany({
      where: {
        id: { in: ids },
        OR: [
          { clientProducts: { some: {} } },
          { orders: { some: {} } }
        ]
      },
      select: { id: true, name: true }
    });

    if (blockedProducts.length) {
      return res.status(400).json({
        error: "Algunos productos no se pueden eliminar porque tienen clientes activos o historial asociado",
        blockedProducts
      });
    }

    const result = await prisma.product.deleteMany({ where: { id: { in: ids } } });
    return res.json({ deleted: result.count });
  } catch (requestError) {
    return next(requestError);
  }
}

async function getRelatedProducts(req, res, next) {
  try {
    const ids = String(req.query.ids || "").split(",").map(Number).filter((n) => n > 0);
    if (!ids.length) return res.json([]);

    const sourceProducts = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { category: true, tags: true }
    });

    const categories = [...new Set(sourceProducts.map((p) => p.category).filter(Boolean))];
    const tags = [...new Set(sourceProducts.flatMap((p) => p.tags || []))];

    const related = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { notIn: ids },
        OR: [
          ...(categories.length ? [{ category: { in: categories } }] : []),
          ...(tags.length ? tags.map((tag) => ({ tags: { has: tag } })) : [])
        ]
      },
      take: 6,
      orderBy: { name: "asc" }
    });

    return res.json(related);
  } catch (error) {
    return next(error);
  }
}

async function listProductImages(req, res, next) {
  try {
    const productId = Number.parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ error: "ID inválido" });

    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ isMain: "desc" }, { order: "asc" }]
    });
    return res.json({ images });
  } catch (error) {
    return next(error);
  }
}

async function addProductImage(req, res, next) {
  try {
    const productId = Number.parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ error: "ID inválido" });

    const { url, isMain } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL de imagen requerida" });
    }

    if (isMain) {
      await prisma.productImage.updateMany({
        where: { productId, isMain: true },
        data: { isMain: false }
      });
    }

    const maxOrder = await prisma.productImage.aggregate({
      where: { productId },
      _max: { order: true }
    });

    const image = await prisma.productImage.create({
      data: {
        productId,
        url,
        isMain: Boolean(isMain),
        order: (maxOrder._max.order ?? -1) + 1
      }
    });
    return res.status(201).json(image);
  } catch (error) {
    return next(error);
  }
}

async function setMainImage(req, res, next) {
  try {
    const imageId = Number.parseInt(req.params.imageId, 10);
    if (!imageId) return res.status(400).json({ error: "ID inválido" });

    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) return res.status(404).json({ error: "Imagen no encontrada" });

    await prisma.$transaction([
      prisma.productImage.updateMany({
        where: { productId: image.productId, isMain: true },
        data: { isMain: false }
      }),
      prisma.productImage.update({
        where: { id: imageId },
        data: { isMain: true }
      })
    ]);

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function deleteProductImage(req, res, next) {
  try {
    const imageId = Number.parseInt(req.params.imageId, 10);
    if (!imageId) return res.status(400).json({ error: "ID inválido" });

    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) return res.status(404).json({ error: "Imagen no encontrada" });

    await prisma.productImage.delete({ where: { id: imageId } });

    if (image.isMain) {
      const next = await prisma.productImage.findFirst({
        where: { productId: image.productId },
        orderBy: { order: "asc" }
      });
      if (next) {
        await prisma.productImage.update({ where: { id: next.id }, data: { isMain: true } });
      }
    }

    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAllProducts,
  getClientProducts,
  createProduct,
  updateProduct,
  toggleProduct,
  deleteProduct,
  bulkDeleteProducts,
  getRelatedProducts,
  listProductImages,
  addProductImage,
  setMainImage,
  deleteProductImage
};
