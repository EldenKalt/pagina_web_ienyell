const express = require("express");
const {
  listAdminDownloads,
  setDownloadFile,
  createDownloadFile,
  deleteDownloadFile,
  listClientDownloads,
  generateDownloadToken,
  serveDownload,
  listAllClientDownloads,
  grantDownloadAccess,
  updateDownloadAccess,
} = require("../controllers/downloadsController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

// ── Public (token-gated) ────────────────────────────────────────────────────
router.get("/serve", serveDownload);

// ── Client ──────────────────────────────────────────────────────────────────
router.get("/my", authenticateToken, listClientDownloads);
router.post("/:accessId/token", authenticateToken, generateDownloadToken);

// ── Admin ────────────────────────────────────────────────────────────────────
router.get("/admin", authenticateToken, authorizeRole("ADMIN"), listAdminDownloads);
router.get("/admin/all-access", authenticateToken, authorizeRole("ADMIN"), listAllClientDownloads);
router.post("/admin/files", authenticateToken, authorizeRole("ADMIN"), createDownloadFile);
router.post("/admin/grant", authenticateToken, authorizeRole("ADMIN"), grantDownloadAccess);
router.patch("/admin/access/:id", authenticateToken, authorizeRole("ADMIN"), updateDownloadAccess);
router.put("/admin/:productId/file", authenticateToken, authorizeRole("ADMIN"), setDownloadFile);
router.delete("/admin/:productId/file", authenticateToken, authorizeRole("ADMIN"), deleteDownloadFile);

module.exports = router;
