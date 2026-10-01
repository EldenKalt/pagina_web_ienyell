const express = require("express");
const { authenticateToken, authorizeRole, authorizeFeature } = require("../middleware/auth");
const {
  createTicket,
  getTickets,
  getTicketById,
  addMessage,
  updateTicketStatus,
  createCallRequest,
  scheduleCallRequest,
  cancelCallRequest,
  rescheduleCallRequest,
  bulkDeleteTickets
} = require("../controllers/ticketsController");

const router = express.Router();

router.post("/", authenticateToken, createTicket);
router.get("/", authenticateToken, getTickets);
router.delete("/bulk", authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("tickets"), bulkDeleteTickets);
router.get("/:id", authenticateToken, getTicketById);
router.post("/:id/messages", authenticateToken, addMessage);
router.post("/:id/call-requests", authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("tickets"), createCallRequest);
router.post("/call-requests/:requestId/schedule", authenticateToken, authorizeRole("CLIENT"), scheduleCallRequest);
router.patch("/call-requests/:requestId/cancel", authenticateToken, cancelCallRequest);
router.patch("/call-requests/:requestId/reschedule", authenticateToken, rescheduleCallRequest);
router.patch("/:id/status", authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("tickets"), updateTicketStatus);

module.exports = router;
