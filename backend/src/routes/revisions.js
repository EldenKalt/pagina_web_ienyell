const express = require("express");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const {
  getRevisionStatus,
  useRevision,
  purchaseExtraRevisions
} = require("../controllers/revisionController");

const router = express.Router();

router.get("/revisions/:clientProductId", authenticateToken, getRevisionStatus);
router.post("/revisions/:clientProductId/use", authenticateToken, authorizeRole("ADMIN"), useRevision);
router.post("/revisions/:clientProductId/purchase", authenticateToken, purchaseExtraRevisions);

module.exports = router;
