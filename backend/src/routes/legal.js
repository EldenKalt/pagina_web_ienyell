const express = require("express");
const { getPage, updatePage } = require("../controllers/legalController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

router.get("/:slug", getPage);
router.put("/:slug", authenticateToken, authorizeRole("ADMIN"), updatePage);

module.exports = router;
