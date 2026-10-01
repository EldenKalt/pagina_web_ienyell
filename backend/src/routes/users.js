const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRole } = require("../middleware/auth");
const {
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
  deleteAccount,
  getMessagesHistory,
  downloadMessagesHistoryPdf,
  bulkDeleteClients,
  getClients,
  createClient,
  updateClient,
  updateClientMeta,
  assignAgent
} = require("../controllers/userController");

const router = express.Router();

router.get("/profile", authenticateToken, getProfile);
router.patch("/profile", authenticateToken, updateProfile);
router.post("/change-password", authenticateToken, changePassword);
router.patch("/account/deactivate", authenticateToken, deactivateAccount);
router.delete("/account", authenticateToken, deleteAccount);
router.get("/messages-history", authenticateToken, getMessagesHistory);
router.get("/messages-history/pdf", authenticateToken, downloadMessagesHistoryPdf);
router.delete("/clients/bulk", authenticateToken, authorizeRole("ADMIN"), bulkDeleteClients);
router.patch("/:clientId/meta", authenticateToken, authorizeRole("ADMIN"), updateClientMeta);
router.get("/:clientId/messages-history", authenticateToken, authorizeRole("ADMIN"), getMessagesHistory);
router.get("/:clientId/messages-history/pdf", authenticateToken, authorizeRole("ADMIN"), downloadMessagesHistoryPdf);
router.get("/clients", authenticateToken, authorizeRole("ADMIN"), getClients);
router.post("/clients", authenticateToken, authorizeRole("ADMIN"), createClient);
router.patch("/clients/:id", authenticateToken, authorizeRole("ADMIN"), updateClient);
router.patch("/:id/assign-agent", authenticateToken, authorizeRole("ADMIN"), assignAgent);

module.exports = router;
