const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos. Espere 15 minutos." }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Demasiados registros. Espere una hora antes de intentarlo nuevamente." }
});

router.post("/login", loginLimiter, authController.login);
router.post("/register", registerLimiter, authController.register);
router.post("/google", loginLimiter, authController.googleLogin);
router.post("/logout", authController.logout);
router.post("/forgot-password", loginLimiter, authController.forgotPassword);
router.post("/reset-password", loginLimiter, authController.resetPassword);
router.get("/check", authenticateToken, authController.check);
router.get("/me", authenticateToken, authController.me);

module.exports = router;
