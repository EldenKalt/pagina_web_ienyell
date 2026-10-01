const express = require("express");
const { createIntent, previewIntent } = require("../controllers/checkoutController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

router.get("/preview", authenticateToken, authorizeRole("CLIENT"), previewIntent);
router.post("/create-intent", authenticateToken, authorizeRole("CLIENT"), createIntent);

module.exports = router;
