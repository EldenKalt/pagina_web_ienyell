const express = require("express");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const {
  listConversations,
  getConversation,
  getPersonalConversation,
  sendMessage,
  markConversationRead,
  setTyping,
  exportMarkdown,
  exportPdf,
  bulkDeleteMessages,
  transferConversation
} = require("../controllers/messagesController");

const router = express.Router();

router.get("/conversations", authenticateToken, listConversations);
router.get("/personal-conversation", authenticateToken, getPersonalConversation);
router.delete("/bulk", authenticateToken, authorizeRole("ADMIN"), bulkDeleteMessages);
router.get("/conversations/:id", authenticateToken, getConversation);
router.post("/conversations/:id/messages", authenticateToken, sendMessage);
router.patch("/conversations/:id/read", authenticateToken, markConversationRead);
router.post("/conversations/:id/typing", authenticateToken, setTyping);
router.patch("/conversations/:id/transfer", authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), transferConversation);
router.get("/conversations/:id/export.md", authenticateToken, exportMarkdown);
router.get("/conversations/:id/export.pdf", authenticateToken, exportPdf);

module.exports = router;
