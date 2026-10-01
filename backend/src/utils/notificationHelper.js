const prisma = require("../lib/prisma");

function encodeNotificationBody(body, linkUrl, metadata) {
  if (!linkUrl && !metadata) {
    return body;
  }

  return JSON.stringify({
    text: body,
    linkUrl: linkUrl || null,
    metadata: metadata || null
  });
}

async function createNotification(userId, { title, body, type, linkUrl, metadata }) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body: encodeNotificationBody(body, linkUrl, metadata),
      type
    }
  });

  const { io } = require("../index");
  if (io) {
    io.to(`user-${userId}`).emit("notification:new", notification);
  }

  return notification;
}

module.exports = {
  createNotification
};
