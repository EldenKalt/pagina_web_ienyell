const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRole, authorizeFeature } = require("../middleware/auth");
const {
  getSubtasks,
  createSubtask,
  updateSubtask,
  toggleSubtask,
  deleteSubtask
} = require("../controllers/subtaskController");

const taskAuth = [authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("projects")];

router.get("/tasks/:taskId/subtasks", taskAuth, getSubtasks);
router.post("/tasks/:taskId/subtasks", taskAuth, createSubtask);
router.patch("/subtasks/:id", taskAuth, updateSubtask);
router.patch("/subtasks/:id/toggle", taskAuth, toggleSubtask);
router.delete("/subtasks/:id", taskAuth, deleteSubtask);

module.exports = router;
