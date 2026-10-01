const express = require("express");
const { listPublic, listAdmin, updateCategory, createCategory } = require("../controllers/serviceCategoriesController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", listPublic);
router.get("/admin", authenticateToken, authorizeRole("ADMIN"), listAdmin);
router.post("/", authenticateToken, authorizeRole("ADMIN"), createCategory);
router.put("/:id", authenticateToken, authorizeRole("ADMIN"), updateCategory);

module.exports = router;
