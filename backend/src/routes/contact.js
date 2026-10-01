const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  submitContact,
  getContacts,
  markContactAsRead,
  replyToContact,
  bulkDeleteContacts
} = require("../controllers/contactController");
const { authenticateToken, authorizeRole, authorizeFeature } = require("../middleware/auth");

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Demasiados mensajes enviados. Intente más tarde." }
});

router.post("/", contactLimiter, submitContact);
router.get("/", authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("contact"), getContacts);
router.delete("/bulk", authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("contact"), bulkDeleteContacts);
router.patch("/:id/read", authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("contact"), markContactAsRead);
router.patch("/:id/reply", authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("contact"), replyToContact);

module.exports = router;
