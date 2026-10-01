const express = require("express");
const { authenticateOptional, authenticateToken, authorizeRole, authorizeFeature } = require("../middleware/auth");
const {
  getAllProducts,
  getClientProducts,
  createProduct,
  updateProduct,
  toggleProduct,
  deleteProduct,
  bulkDeleteProducts,
  getRelatedProducts,
  listProductImages,
  addProductImage,
  setMainImage,
  deleteProductImage
} = require("../controllers/productsController");

const router = express.Router();

router.get("/", authenticateOptional, getAllProducts);
router.get("/related", getRelatedProducts);
router.get("/mine", authenticateToken, getClientProducts);
router.post("/", authenticateToken, authorizeFeature("products-crud"), createProduct);
router.patch("/:id", authenticateToken, authorizeFeature("products-crud"), updateProduct);
router.patch("/:id/toggle", authenticateToken, authorizeFeature("products-crud"), toggleProduct);
router.delete("/bulk", authenticateToken, authorizeFeature("products-crud"), bulkDeleteProducts);
router.delete("/:id", authenticateToken, authorizeFeature("products-crud"), deleteProduct);

router.get("/:productId/images", authenticateToken, listProductImages);
router.post("/:productId/images", authenticateToken, authorizeFeature("products-crud"), addProductImage);
router.patch("/images/:imageId/main", authenticateToken, authorizeFeature("products-crud"), setMainImage);
router.delete("/images/:imageId", authenticateToken, authorizeFeature("products-crud"), deleteProductImage);

module.exports = router;
