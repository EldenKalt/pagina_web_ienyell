const express = require("express");
const { createCartOrder, getCartOrder, handleCartWebhook, listAdminCartOrders } = require("../controllers/cartController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

router.post("/webhook", express.raw({ type: "application/json" }), handleCartWebhook);

router.use(express.json());

router.post("/", authenticateToken, authorizeRole("CLIENT"), createCartOrder);
router.get("/admin", authenticateToken, authorizeRole("ADMIN"), listAdminCartOrders);
router.get("/:id", authenticateToken, getCartOrder);

module.exports = router;
