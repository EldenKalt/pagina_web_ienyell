const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { getClientReport, getAdminReport } = require("../controllers/reportsController");
const { generateClientReportPDF } = require("../controllers/pdfController");
const router = require("express").Router();

router.get("/client", authenticateToken, getClientReport);
router.get("/admin", authenticateToken, authorizeRole("ADMIN"), getAdminReport);
router.get("/pdf", authenticateToken, generateClientReportPDF);

module.exports = router;
