const express = require("express");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const {
  getPublicTestimonials,
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial
} = require("../controllers/testimonialsController");

const router = express.Router();

router.get("/", getPublicTestimonials);
router.get("/all", authenticateToken, authorizeRole("ADMIN"), getAllTestimonials);
router.post("/", authenticateToken, authorizeRole("ADMIN"), createTestimonial);
router.patch("/:id", authenticateToken, authorizeRole("ADMIN"), updateTestimonial);
router.delete("/:id", authenticateToken, authorizeRole("ADMIN"), deleteTestimonial);

module.exports = router;
