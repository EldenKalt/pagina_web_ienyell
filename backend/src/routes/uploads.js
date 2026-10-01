const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { authenticateToken } = require("../middleware/auth");
const { uploadFile } = require("../controllers/uploadsController");

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Demasiados archivos subidos. Espere 15 minutos." }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

router.post("/", authenticateToken, uploadLimiter, upload.single("file"), uploadFile);

module.exports = router;
