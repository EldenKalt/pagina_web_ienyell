const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  bulkDeleteNotifications
} = require("../controllers/notificationsController");

const router = express.Router();

router.get("/", authenticateToken, getNotifications);
router.patch("/read-all", authenticateToken, markAllAsRead);
router.delete("/bulk", authenticateToken, bulkDeleteNotifications);
router.patch("/:id/read", authenticateToken, markAsRead);

module.exports = router;
