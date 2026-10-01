const prisma = require("../lib/prisma");
const { parseBulkIds } = require("../utils/bulkIds");

function parseNotificationId(id) {
  const parsed = Number.parseInt(id, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getNotifications(req, res, next) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: req.user.id
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.notification.count({
        where: {
          userId: req.user.id,
          isRead: false
        }
      })
    ]);

    res.set("X-Unread-Count", String(unreadCount));
    return res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    return next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const notificationId = parseNotificationId(req.params.id);
    if (!notificationId) {
      return res.status(400).json({ error: "id inválido" });
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    const updated = await prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        isRead: true
      }
    });

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    return res.json({
      message: "Notificaciones marcadas como leídas",
      updatedCount: result.count
    });
  } catch (error) {
    return next(error);
  }
}

async function bulkDeleteNotifications(req, res, next) {
  try {
    const { ids, error } = parseBulkIds(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const result = await prisma.notification.deleteMany({
      where: {
        id: { in: ids },
        userId: req.user.id
      }
    });

    return res.json({ deleted: result.count });
  } catch (requestError) {
    return next(requestError);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  bulkDeleteNotifications
};
