const express = require("express");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const {
  createPlan,
  listPlans,
  getPlan,
  generatePaymentLink,
  cancelPlan
} = require("../controllers/installmentController");

const router = express.Router();

router.post("/", authenticateToken, authorizeRole("ADMIN"), createPlan);
router.get("/", authenticateToken, listPlans);
router.get("/:id", authenticateToken, getPlan);
router.post("/:planId/installments/:installmentId/generate-link", authenticateToken, generatePaymentLink);
router.put("/:id/cancel", authenticateToken, authorizeRole("ADMIN"), cancelPlan);

module.exports = router;
