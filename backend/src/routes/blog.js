const express = require("express");
const {
  listPublic,
  listPublicTopics,
  getPublicSeries,
  getPost,
  listAdmin,
  getAdminPost,
  createPost,
  updatePost,
  togglePublish,
  deletePost
} = require("../controllers/blogController");
const { authenticateToken, authenticateOptional, authorizeRole, authorizeFeature } = require("../middleware/auth");

const router = express.Router();
const annotations = require('../controllers/annotationController');
const comments = require('../controllers/commentController');
const saved = require('../controllers/savedBlogController');
const reactions = require('../controllers/reactionController');
const rateLimit = require('express-rate-limit');
const shareLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
router.get('/saved', authenticateToken, saved.listSaved);
router.get('/:slug/reactions', authenticateOptional, reactions.postReactions);
router.put('/:slug/like', authenticateToken, reactions.setPostLike);
router.delete('/:slug/like', authenticateToken, reactions.setPostLike);
router.post('/:slug/share', shareLimiter, reactions.recordShare);
router.get('/:slug/save', authenticateToken, saved.getSaveState);
router.put('/:slug/save', authenticateToken, saved.savePost);
router.delete('/:slug/save', authenticateToken, saved.unsavePost);
router.get('/:slug/comments', authenticateOptional, comments.listComments);
router.get('/:slug/comment-locations', comments.commentLocations);
router.post('/:slug/comments', authenticateToken, comments.createComment);
router.get('/:slug/notes', authenticateToken, annotations.listNotes);
router.get('/:slug/public-notes', annotations.listPublicNotes);
router.post('/:slug/notes', authenticateToken, annotations.createNote);
router.get('/:slug/highlights', authenticateToken, annotations.listHighlights);
router.post('/:slug/highlights', authenticateToken, annotations.createHighlight);
router.delete('/:slug/highlights/:id', authenticateToken, annotations.deleteHighlight);
const editorAccess = [authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("blog")];
router.get('/admin/:id/comment-threads', ...editorAccess, comments.adminThreads);
router.post('/admin/:id/comment-threads/reassign', ...editorAccess, comments.reassignThreads);

router.get("/", listPublic);
router.get("/topics", listPublicTopics);
router.get("/series/:slug", getPublicSeries);
router.get("/admin", ...editorAccess, listAdmin);
router.get("/admin/:id", ...editorAccess, getAdminPost);
router.post("/", ...editorAccess, createPost);
router.put("/:id", ...editorAccess, updatePost);
router.patch("/:id/publish", ...editorAccess, togglePublish);
router.delete("/:id", ...editorAccess, deletePost);
router.get("/:slug", getPost);

module.exports = router;
