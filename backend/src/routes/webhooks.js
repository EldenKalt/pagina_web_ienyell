const express = require("express");
const { handleWebhook } = require("../controllers/checkoutController");

const router = express.Router();

router.post("/onvo", express.raw({ type: "application/json" }), handleWebhook);

module.exports = router;
