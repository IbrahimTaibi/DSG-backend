const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

// Public
router.get("/", catchAsync(categoryController.getAll));
router.get("/tree", catchAsync(categoryController.getTree));
router.get("/slug/:slug", catchAsync(categoryController.getBySlug));
router.get(/^\/path\/(.*)/, catchAsync(categoryController.getBySlugPath));

// Admin only
router.post("/", auth, role("admin"), catchAsync(categoryController.create));
router.put("/:id", auth, role("admin"), catchAsync(categoryController.update));
router.delete(
  "/:id",
  auth,
  role("admin"),
  catchAsync(categoryController.remove),
);

module.exports = router;
