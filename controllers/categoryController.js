const Category = require("../models/category");
const ApiError = require("../utils/ApiError");
const slugify = require("slugify");
const catchAsync = require("../utils/catchAsync");

// Create category (admin only)
exports.create = catchAsync(async (req, res) => {
  const { name, parent } = req.body;
  if (!name) throw new ApiError(400, "Category name is required.");
  const exists = await Category.findOne({ name });
  if (exists) throw new ApiError(409, "Category already exists.");
  const slug = slugify(name, { lower: true, strict: true });
  const slugExists = await Category.findOne({ slug });
  if (slugExists) throw new ApiError(409, "Category slug already exists.");
  const category = new Category({ name, parent: parent || null, slug });
  await category.save();
  res.status(201).json(category);
});

// Get all categories (flat)
exports.getAll = catchAsync(async (req, res) => {
  const categories = await Category.find().select("name parent slug");
  res.json(categories);
});

// Get category tree (nested)
exports.getTree = catchAsync(async (req, res) => {
  const categories = await Category.find().select("name parent slug");
  // Helper to build tree
  function buildTree(parentId = null) {
    return categories
      .filter((cat) => String(cat.parent) === String(parentId))
      .map((cat) => ({
        _id: cat._id,
        name: cat.name,
        slug: cat.slug,
        parent: cat.parent,
        children: buildTree(cat._id),
      }));
  }
  res.json(buildTree());
});

// Get category by slug
exports.getBySlug = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const category = await Category.findOne({ slug });
  if (!category)
    return res.status(404).json({ message: "Category not found." });
  res.json(category);
});

// Get category by full slug path (nested)
exports.getBySlugPath = catchAsync(async (req, res) => {
  const slugPath = req.params[0];
  if (!slugPath) return res.status(400).json({ message: "Missing slug path." });
  const slugs = slugPath.split("/").filter(Boolean);
  if (slugs.length === 0)
    return res.status(400).json({ message: "Invalid slug path." });
  let parent = null;
  let category = null;
  for (const slug of slugs) {
    category = await Category.findOne({ slug, parent: parent });
    if (!category)
      return res.status(404).json({ message: "Category not found for path." });
    parent = category._id;
  }
  res.json(category);
});

// Update category (admin only)
exports.update = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, parent } = req.body;
  const category = await Category.findById(id);
  if (!category) throw new ApiError(404, "Category not found.");
  if (name) {
    category.name = name;
    category.slug = slugify(name, { lower: true, strict: true });
  }
  if (typeof parent !== "undefined") category.parent = parent;
  await category.save();
  res.json(category);
});

// Delete category (admin only)
exports.remove = catchAsync(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) throw new ApiError(404, "Category not found.");
  await category.deleteOne();
  res.json({ message: "Category deleted." });
});
