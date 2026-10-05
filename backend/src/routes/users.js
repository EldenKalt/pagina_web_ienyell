const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRole } = require("../middleware/auth");
const {
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
  deleteAccount,
  getMessagesHistory,
  downloadMessagesHistoryPdf,
  bulkDeleteClients,
  getClients,
  createClient,
  updateClient,
  updateClientMeta,
  assignAgent
} = require("../controllers/userController");

const router = express.Router();
const readerProfile = require('../controllers/readerProfileController');
router.get('/me/profile', authenticateToken, readerProfile.ownProfile);
router.patch('/me/profile', authenticateToken, readerProfile.updateOwnProfile);
router.get('/me/notes', authenticateToken, readerProfile.myNotes);
router.get('/me/comments', authenticateToken, readerProfile.myComments);
router.get('/me/annotations', authenticateToken, readerProfile.myHighlights);
router.get('/me/wishlist', authenticateToken, readerProfile.myWishlist);
router.get('/me/wishlist/search', authenticateToken, readerProfile.searchWishlistProducts);
router.put('/me/wishlist/:productId', authenticateToken, readerProfile.addWishlistItem);
router.delete('/me/wishlist/:productId', authenticateToken, readerProfile.removeWishlistItem);

router.get("/profile", authenticateToken, getProfile);
router.patch("/profile", authenticateToken, updateProfile);
router.post("/change-password", authenticateToken, changePassword);
router.patch("/account/deactivate", authenticateToken, deactivateAccount);
router.delete("/account", authenticateToken, deleteAccount);
router.get("/messages-history", authenticateToken, getMessagesHistory);
router.get("/messages-history/pdf", authenticateToken, downloadMessagesHistoryPdf);
router.delete("/clients/bulk", authenticateToken, authorizeRole("ADMIN"), bulkDeleteClients);
router.patch("/:clientId/meta", authenticateToken, authorizeRole("ADMIN"), updateClientMeta);
router.get("/:clientId/messages-history", authenticateToken, authorizeRole("ADMIN"), getMessagesHistory);
router.get("/:clientId/messages-history/pdf", authenticateToken, authorizeRole("ADMIN"), downloadMessagesHistoryPdf);
router.get("/clients", authenticateToken, authorizeRole("ADMIN"), getClients);
router.post("/clients", authenticateToken, authorizeRole("ADMIN"), createClient);
router.patch("/clients/:id", authenticateToken, authorizeRole("ADMIN"), updateClient);
router.patch("/:id/assign-agent", authenticateToken, authorizeRole("ADMIN"), assignAgent);

module.exports = router;
