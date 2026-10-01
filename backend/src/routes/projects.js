const express = require("express");
const {
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getEta,
  listProjects,
  listTasks,
  updateProject,
  updateTask
} = require("../controllers/projectsController");
const { authenticateToken, authorizeRole, authorizeFeature } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, listProjects);
router.post("/", authenticateToken, authorizeRole("ADMIN"), authorizeFeature("projects"), createProject);
router.patch("/tasks/:taskId", authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("projects"), updateTask);
router.delete("/tasks/:taskId", authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("projects"), deleteTask);
router.get("/:id/eta", authenticateToken, getEta);
router.get("/:id/tasks", authenticateToken, listTasks);
router.post("/:id/tasks", authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("projects"), createTask);
router.patch("/:id", authenticateToken, authorizeRole("ADMIN"), authorizeFeature("projects"), updateProject);
router.delete("/:id", authenticateToken, authorizeRole("ADMIN"), authorizeFeature("projects"), deleteProject);

module.exports = router;
