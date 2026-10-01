const express = require("express");
const { authenticateToken, authenticateOptional, authorizeRole } = require("../middleware/auth");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
} = require("../controllers/portfolioController");

const router = express.Router();

router.get("/categories", listCategories);
router.post("/categories", authenticateToken, authorizeRole("ADMIN"), createCategory);
router.patch("/categories/:id", authenticateToken, authorizeRole("ADMIN"), updateCategory);
router.delete("/categories/:id", authenticateToken, authorizeRole("ADMIN"), deleteCategory);

router.get("/projects", authenticateOptional, listProjects);
router.get("/projects/:slug", authenticateOptional, getProject);
router.post("/projects", authenticateToken, authorizeRole("ADMIN"), createProject);
router.patch("/projects/:id", authenticateToken, authorizeRole("ADMIN"), updateProject);
router.delete("/projects/:id", authenticateToken, authorizeRole("ADMIN"), deleteProject);

module.exports = router;
