const express = require("express");
const {
  listFaq,
  listFaqAdmin,
  createFaq,
  updateFaq,
  toggleFaq,
  deleteFaq
} = require("../controllers/faqController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();
const adminOnly = [authenticateToken, authorizeRole("ADMIN")];

router.get("/", listFaq);
router.get("/admin", ...adminOnly, listFaqAdmin);
router.post("/", ...adminOnly, createFaq);
router.put("/:id", ...adminOnly, updateFaq);
router.patch("/:id/toggle", ...adminOnly, toggleFaq);
router.delete("/:id", ...adminOnly, deleteFaq);

module.exports = router;
