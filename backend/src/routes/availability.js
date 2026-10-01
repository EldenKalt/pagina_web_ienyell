const express = require("express");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const {
  getStatus,
  updateStatus,
  updateSchedule,
  notifyWorkingOn
} = require("../controllers/availabilityController");

const router = express.Router();

router.get("/", getStatus);
router.patch("/status", authenticateToken, authorizeRole("ADMIN"), updateStatus);
router.patch("/schedule", authenticateToken, authorizeRole("ADMIN"), updateSchedule);
router.post("/working-on", authenticateToken, authorizeRole("ADMIN"), notifyWorkingOn);

module.exports = router;
