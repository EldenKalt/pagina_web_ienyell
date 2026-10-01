const express = require("express");
const {
  createReferral,
  listReferrals
} = require("../controllers/referralController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

router.get("/mine", authenticateToken, authorizeRole("CLIENT"), listReferrals);
router.post("/", authenticateToken, authorizeRole("CLIENT"), createReferral);

module.exports = router;
