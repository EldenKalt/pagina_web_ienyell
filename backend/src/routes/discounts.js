const express = require("express");
const {
  createCode,
  deleteCode,
  listCodes,
  toggleCode,
  validateCode,
  getMyAutoDiscount
} = require("../controllers/discountController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, authorizeRole("ADMIN"), listCodes);
router.get("/my-auto", authenticateToken, getMyAutoDiscount);
router.post("/validate", authenticateToken, validateCode);
router.post("/", authenticateToken, authorizeRole("ADMIN"), createCode);
router.patch("/:id/toggle", authenticateToken, authorizeRole("ADMIN"), toggleCode);
router.delete("/:id", authenticateToken, authorizeRole("ADMIN"), deleteCode);

module.exports = router;
