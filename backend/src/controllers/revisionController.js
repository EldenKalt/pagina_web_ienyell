const prisma = require("../lib/prisma");

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function serializeRevisionTracker(tracker) {
  if (!tracker) return null;
  const total = tracker.totalAllowed + tracker.extraPurchased;
  return {
    id: tracker.id,
    clientProductId: tracker.clientProductId,
    totalAllowed: tracker.totalAllowed,
    used: tracker.used,
    extraPurchased: tracker.extraPurchased,
    remaining: Math.max(total - tracker.used, 0)
  };
}

async function findAccessibleClientProduct(clientProductId, user, tx = prisma) {
  const clientProduct = await tx.clientProduct.findUnique({
    where: { id: clientProductId },
    select: {
      id: true,
      clientId: true,
      revisionTracker: true
    }
  });

  if (!clientProduct) {
    return { errorStatus: 404, error: "ClientProduct no encontrado" };
  }

  const isOwner = user?.role === "CLIENT" && clientProduct.clientId === user.id;
  const isAdmin = user?.role === "ADMIN";
  if (!isAdmin && !isOwner) {
    return { errorStatus: 403, error: "No tienes permiso para estas revisiones" };
  }

  return { clientProduct };
}

async function getRevisionStatus(req, res, next) {
  try {
    const clientProductId = parsePositiveInt(req.params.clientProductId);
    if (!clientProductId) {
      return res.status(400).json({ error: "clientProductId invalido" });
    }

    const { clientProduct, errorStatus, error } = await findAccessibleClientProduct(clientProductId, req.user);
    if (error) {
      return res.status(errorStatus).json({ error });
    }
    if (!clientProduct.revisionTracker) {
      return res.status(404).json({ error: "RevisionTracker no encontrado" });
    }

    return res.json({ revisionTracker: serializeRevisionTracker(clientProduct.revisionTracker) });
  } catch (error) {
    return next(error);
  }
}

async function useRevision(req, res, next) {
  try {
    const clientProductId = parsePositiveInt(req.params.clientProductId);
    if (!clientProductId) {
      return res.status(400).json({ error: "clientProductId invalido" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const access = await findAccessibleClientProduct(clientProductId, req.user, tx);
      if (access.error) {
        return access;
      }

      const tracker = access.clientProduct.revisionTracker;
      if (!tracker) {
        return { errorStatus: 404, error: "RevisionTracker no encontrado" };
      }

      const totalAvailable = tracker.totalAllowed + tracker.extraPurchased;
      if (tracker.used >= totalAvailable) {
        return { errorStatus: 400, error: "No quedan revisiones disponibles" };
      }

      const updatedCount = await tx.revisionTracker.updateMany({
        where: {
          id: tracker.id,
          used: { lt: totalAvailable }
        },
        data: {
          used: { increment: 1 }
        }
      });

      if (updatedCount.count !== 1) {
        return { errorStatus: 400, error: "No quedan revisiones disponibles" };
      }

      const updated = await tx.revisionTracker.findUnique({ where: { id: tracker.id } });
      return { revisionTracker: updated };
    });

    if (result.error) {
      return res.status(result.errorStatus).json({ error: result.error });
    }

    return res.json({ revisionTracker: serializeRevisionTracker(result.revisionTracker) });
  } catch (error) {
    return next(error);
  }
}

async function purchaseExtraRevisions(req, res, next) {
  try {
    const clientProductId = parsePositiveInt(req.params.clientProductId);
    if (!clientProductId) {
      return res.status(400).json({ error: "clientProductId invalido" });
    }

    const quantity = parsePositiveInt(req.body?.quantity);
    if (!quantity) {
      return res.status(400).json({ error: "quantity debe ser un entero positivo" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const access = await findAccessibleClientProduct(clientProductId, req.user, tx);
      if (access.error) {
        return access;
      }

      const tracker = access.clientProduct.revisionTracker;
      if (!tracker) {
        return { errorStatus: 404, error: "RevisionTracker no encontrado" };
      }

      const updated = await tx.revisionTracker.update({
        where: { id: tracker.id },
        data: {
          extraPurchased: { increment: quantity }
        }
      });

      return { revisionTracker: updated };
    });

    if (result.error) {
      return res.status(result.errorStatus).json({ error: result.error });
    }

    return res.json({ revisionTracker: serializeRevisionTracker(result.revisionTracker) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getRevisionStatus,
  useRevision,
  purchaseExtraRevisions
};
