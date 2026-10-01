const express = require("express");
const {
  listPublic,
  getPost,
  listAdmin,
  createPost,
  updatePost,
  togglePublish,
  deletePost
} = require("../controllers/blogController");
const { authenticateToken, authorizeRole, authorizeFeature } = require("../middleware/auth");

const router = express.Router();
const editorAccess = [authenticateToken, authorizeRole("ADMIN", "COLABORADOR"), authorizeFeature("blog")];

router.get("/", listPublic);
router.get("/admin", ...editorAccess, listAdmin);
router.post("/", ...editorAccess, createPost);
router.put("/:id", ...editorAccess, updatePost);
router.patch("/:id/publish", ...editorAccess, togglePublish);
router.delete("/:id", ...editorAccess, deletePost);
router.get("/:slug", getPost);

module.exports = router;
