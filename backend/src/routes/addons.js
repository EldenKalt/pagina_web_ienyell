const express = require("express");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { getProductAddOns, createAddOn, updateAddOn, deleteAddOn } = require("../controllers/addOnController");
const { getProductQuestions, createQuestion, updateQuestion, deleteQuestion } = require("../controllers/questionController");

const router = express.Router();
const adminAuth = [authenticateToken, authorizeRole("ADMIN")];

router.get("/products/:productId/addons", authenticateToken, getProductAddOns);
router.post("/products/:productId/addons", adminAuth, createAddOn);
router.patch("/addons/:id", adminAuth, updateAddOn);
router.delete("/addons/:id", adminAuth, deleteAddOn);

router.get("/products/:productId/questions", authenticateToken, getProductQuestions);
router.post("/products/:productId/questions", adminAuth, createQuestion);
router.patch("/questions/:id", adminAuth, updateQuestion);
router.delete("/questions/:id", adminAuth, deleteQuestion);

module.exports = router;
