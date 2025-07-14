const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middleware/auth");

// POST /api/reviews
router.post("/", auth, catchAsync(productController.createOrUpdateReview));

module.exports = router;
