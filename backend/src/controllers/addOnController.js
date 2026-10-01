const prisma = require("../lib/prisma");

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getProductAddOns(req, res, next) {
  try {
    const productId = parsePositiveInt(req.params.productId);
    if (!productId) return res.status(400).json({ error: "productId inválido" });

    const addOns = await prisma.productAddOn.findMany({
      where: { productId },
      orderBy: { order: "asc" }
    });
    return res.json({ addOns });
  } catch (error) {
    return next(error);
  }
}

async function createAddOn(req, res, next) {
  try {
    const allowedFields = ["name", "description", "price", "maxQty"];
    const invalidFields = Object.keys(req.body || {}).filter((key) => !allowedFields.includes(key));
    if (invalidFields.length) {
      return res.status(400).json({ error: "Campos de add-on invalidos" });
    }

    const productId = parsePositiveInt(req.params.productId);
    if (!productId) return res.status(400).json({ error: "productId inválido" });

    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "El nombre es requerido" });

    const description = String(req.body?.description || "").trim() || null;
    const price = Number(req.body?.price);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: "El precio debe ser un número válido >= 0" });
    }

    const maxQty = req.body?.maxQty ? Number.parseInt(req.body.maxQty, 10) : 1;
    if (!Number.isInteger(maxQty) || maxQty < 1) {
      return res.status(400).json({ error: "maxQty debe ser >= 1" });
    }

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return res.status(404).json({ error: "Producto no encontrado" });

    const addOn = await prisma.$transaction(async (tx) => {
      const order = await tx.productAddOn.count({ where: { productId } });
      return tx.productAddOn.create({
        data: { productId, name, description, price, maxQty, order }
      });
    });
    return res.status(201).json({ addOn });
  } catch (error) {
    return next(error);
  }
}

async function updateAddOn(req, res, next) {
  try {
    const allowedFields = ["name", "description", "price", "maxQty", "isActive", "order"];
    const payloadKeys = Object.keys(req.body || {});
    if (!payloadKeys.length || payloadKeys.some((key) => !allowedFields.includes(key))) {
      return res.status(400).json({ error: "Campos de add-on invalidos" });
    }

    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const addOn = await prisma.productAddOn.findUnique({ where: { id } });
    if (!addOn) return res.status(404).json({ error: "Add-on no encontrado" });

    const data = {};
    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: "El nombre es requerido" });
      data.name = name;
    }
    if (req.body?.description !== undefined) data.description = String(req.body.description).trim() || null;
    if (req.body?.price !== undefined) {
      const price = Number(req.body.price);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: "Precio inválido" });
      data.price = price;
    }
    if (req.body?.maxQty !== undefined) {
      const maxQty = Number.parseInt(req.body.maxQty, 10);
      if (!Number.isInteger(maxQty) || maxQty < 1) return res.status(400).json({ error: "maxQty inválido" });
      data.maxQty = maxQty;
    }
    if (req.body?.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
    if (req.body?.order !== undefined) {
      const order = Number.parseInt(req.body.order, 10);
      if (!Number.isInteger(order) || order < 0) return res.status(400).json({ error: "order invalido" });
      data.order = order;
    }

    const updated = await prisma.productAddOn.update({ where: { id }, data });
    return res.json({ addOn: updated });
  } catch (error) {
    return next(error);
  }
}

async function deleteAddOn(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const addOn = await prisma.productAddOn.findUnique({ where: { id } });
    if (!addOn) return res.status(404).json({ error: "Add-on no encontrado" });

    await prisma.productAddOn.delete({ where: { id } });
    return res.json({ message: "Add-on eliminado" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProductAddOns, createAddOn, updateAddOn, deleteAddOn };
