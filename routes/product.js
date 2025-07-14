const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const fetchResource = require("../middleware/fetchResource");
const Product = require("../models/product");
const Review = require("../models/review");

// Public
router.get("/", catchAsync(productController.advancedSearch));
router.get("/search", catchAsync(productController.advancedSearch));
router.get("/advancedSearch", catchAsync(productController.advancedSearch));
router.get(
  "/category/:parentCategoryId/products",
  catchAsync(productController.getByParentCategory),
);

// Fast single-query: Get all products under a parent category (including descendants) by ObjectId or slug
router.get(
  "/category/:parentCategoryIdOrSlug/products/fast",
  catchAsync(productController.getByParentCategoryFast),
);

router.get(
  "/:id",
  fetchResource(Product, "id", "product"),
  catchAsync(productController.getById),
);

// Admin only
router.post("/", auth, role("admin"), catchAsync(productController.create));
router.put(
  "/:id",
  auth,
  role("admin"),
  fetchResource(Product, "id", "product"),
  catchAsync(productController.update),
);
router.put(
  "/:id/status",
  auth,
  role("admin"),
  fetchResource(Product, "id", "product"),
  catchAsync(productController.changeStatus),
);
router.delete(
  "/:id",
  auth,
  role("admin"),
  fetchResource(Product, "id", "product"),
  catchAsync(productController.remove),
);

// Reviews
// POST /api/reviews
router.post(
  "/../reviews",
  auth,
  catchAsync(productController.createOrUpdateReview),
);
// GET /api/products/:id/reviews
router.get("/:id/reviews", catchAsync(productController.getReviewsForProduct));

module.exports = router;
