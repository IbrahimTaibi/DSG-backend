const Product = require("../models/product");
const ApiError = require("../utils/ApiError");
const mongoose = require("mongoose");
const Review = require("../models/review");
const catchAsync = require("../utils/catchAsync");
const Invoice = require("../models/invoice");

// Create product (admin only)
exports.create = catchAsync(async (req, res) => {
  const {
    name,
    description,
    price,
    stock,
    category,
    additionalCategories,
    image,
    tax,
  } = req.body;
  if (!name || !price || !category || !tax)
    throw new ApiError(400, "Name, price, category, and tax are required.");

  // Validate tax exists
  const Tax = require("../models/tax");
  const taxDoc = await Tax.findById(tax);
  if (!taxDoc) throw new ApiError(400, "Invalid tax ID.");

  // Fetch all parent categories of the main category
  const Category = require("../models/category");
  let parentCategories = [];
  let currentCategory = await Category.findById(category);
  while (currentCategory && currentCategory.parent) {
    parentCategories.push(currentCategory.parent);
    currentCategory = await Category.findById(currentCategory.parent);
  }

  // Merge provided additionalCategories (if any) and remove duplicates and the main category
  let allAdditionalCategories = [
    ...(additionalCategories || []),
    ...parentCategories.map((id) => id.toString()),
  ];
  allAdditionalCategories = Array.from(
    new Set(
      allAdditionalCategories.filter(
        (catId) => catId.toString() !== category.toString(),
      ),
    ),
  );

  const product = new Product({
    name,
    description,
    price,
    stock,
    category,
    additionalCategories: allAdditionalCategories,
    image,
    tax,
  });
  await product.save();
  res.status(201).json(product);
});

// Get all products
exports.getAll = catchAsync(async (req, res) => {
  const products = await Product.find()
    .lean()
    .populate(["category", "additionalCategories"]);
  res.json(products);
});

// Get product by ID
exports.getById = catchAsync(async (req, res) => {
  const product = await req.product.populate([
    "category",
    "additionalCategories",
  ]);
  res.json(product.toObject ? product.toObject() : product);
});

// Update product (admin only)
exports.update = catchAsync(async (req, res) => {
  const product = req.product;
  const {
    name,
    description,
    price,
    stock,
    category,
    additionalCategories,
    image,
    tax,
  } = req.body;

  if (name) product.name = name;
  if (description) product.description = description;
  if (typeof price !== "undefined") product.price = price;
  if (typeof stock !== "undefined") {
    product.stock = stock;
    if (stock === 0) {
      product.status = "out_of_stock";
    } else if (product.status === "out_of_stock" && stock > 0) {
      product.status = "active";
    }
  }
  if (category) product.category = category;
  if (additionalCategories) product.additionalCategories = additionalCategories;
  if (image) product.image = image;
  if (tax) {
    const Tax = require("../models/tax");
    const taxDoc = await Tax.findById(tax);
    if (!taxDoc) throw new ApiError(400, "Invalid tax ID.");
    product.tax = tax;
  }

  await product.save();
  res.json(product);
});

// Delete product (admin only)
exports.remove = catchAsync(async (req, res) => {
  await req.product.deleteOne();
  res.json({ message: "Product deleted." });
});

// Advanced search for products
exports.advancedSearch = catchAsync(async (req, res) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    inStock,
    sort = "createdAt",
    order = "desc",
    page = 1,
    limit = 10,
  } = req.query;

  const filter = {};
  let categoryId = category;
  if (category) {
    const Category = require("../models/category");
    // If not a valid ObjectId, treat as slug
    if (!category.match(/^[0-9a-fA-F]{24}$/)) {
      const catDoc = await Category.findOne({ slug: category });
      if (catDoc) categoryId = catDoc._id.toString();
      else {
        // No such category, return empty result
        return res.json({
          total: 0,
          page: Number(page),
          pageSize: 0,
          products: [],
        });
      }
    }
  }

  if (q) {
    // Use case-insensitive regex for substring search on name and description
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }
  if (categoryId) {
    const Category = require("../models/category");
    const allCategories = await Category.find();
    const childCategories = [];
    function findChildren(parentId) {
      allCategories.forEach((cat) => {
        if (String(cat.parent) === String(parentId)) {
          childCategories.push(cat._id);
          findChildren(cat._id);
        }
      });
    }
    findChildren(categoryId);
    filter.category = { $in: [categoryId, ...childCategories] };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const sortObj = {};
  if (sort === "price" || sort === "name" || sort === "createdAt") {
    sortObj[sort] = order === "asc" ? 1 : -1;
  } else {
    sortObj["createdAt"] = -1;
  }

  const products = await Product.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(Number(limit))
    .lean()
    .populate(["category", "additionalCategories"]);
  const total = await Product.countDocuments(filter);

  // Fetch review stats for all products in the result
  const productIds = products.map((p) => p._id);
  const reviewStats = await Review.aggregate([
    { $match: { product: { $in: productIds } } },
    {
      $group: {
        _id: "$product",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);
  const reviewMap = {};
  reviewStats.forEach((stat) => {
    reviewMap[stat._id.toString()] = {
      average: stat.average || 0,
      count: stat.count || 0,
    };
  });
  // Attach review stats to each product
  const productsWithReviews = products.map((p) => {
    const stats = reviewMap[p._id.toString()] || { average: 0, count: 0 };
    return {
      ...p,
      averageRating: stats.average,
      reviewCount: stats.count,
    };
  });

  res.json({
    total,
    page: Number(page),
    pageSize: products.length,
    products: productsWithReviews,
  });
});

// Change product status (admin only)
exports.changeStatus = catchAsync(async (req, res) => {
  const product = req.product;
  const { status } = req.body;
  const allowed = [
    "active",
    "inactive",
    "out_of_stock",
    "discontinued",
    "draft",
  ];
  if (!allowed.includes(status)) {
    throw new ApiError(400, "Invalid status value.");
  }
  product.status = status;
  await product.save();
  res.json(product);
});

// Get all products under a parent category (including descendants)
exports.getByParentCategory = catchAsync(async (req, res) => {
  const { parentCategoryId } = req.params;
  const Category = require("../models/category");
  // Find all categories
  const allCategories = await Category.find();
  // Find all descendant category IDs
  const descendantIds = [];
  function findChildren(parentId) {
    allCategories.forEach((cat) => {
      if (String(cat.parent) === String(parentId)) {
        descendantIds.push(cat._id);
        findChildren(cat._id);
      }
    });
  }
  findChildren(parentCategoryId);
  // Include the parent category itself
  const categoryIds = [parentCategoryId, ...descendantIds];
  // Find products in any of these categories
  const products = await Product.find({
    category: { $in: categoryIds },
  }).populate(["category", "additionalCategories"]);
  res.json(products);
});

// Fast single-query: Get all products under a parent category (including descendants) by ObjectId or slug
exports.getByParentCategoryFast = catchAsync(async (req, res) => {
  const { parentCategoryIdOrSlug } = req.params;
  const Category = require("../models/category");
  let parentCategory;
  let parentId;
  // Try to interpret as ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(parentCategoryIdOrSlug)) {
    try {
      parentId = new mongoose.Types.ObjectId(parentCategoryIdOrSlug);
      parentCategory = await Category.findById(parentId);
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Invalid category ObjectId.", error: err.message });
    }
  } else {
    // Try as slug
    parentCategory = await Category.findOne({ slug: parentCategoryIdOrSlug });
    if (parentCategory) {
      parentId = parentCategory._id;
    }
  }
  if (!parentCategory) {
    return res.status(404).json({ message: "Category not found." });
  }
  // 1. Find all descendant categories (including self) using $graphLookup
  const categories = await Category.aggregate([
    { $match: { _id: parentId } },
    {
      $graphLookup: {
        from: "categories",
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parent",
        as: "descendants",
      },
    },
    {
      $project: {
        allCategoryIds: {
          $concatArrays: [
            ["$_id"],
            { $map: { input: "$descendants", as: "d", in: "$$d._id" } },
          ],
        },
      },
    },
  ]);
  if (!categories.length) {
    return res.json([]);
  }
  const allCategoryIds = categories[0].allCategoryIds;
  // 2. Find products in any of these categories
  const products = await Product.find({
    category: { $in: allCategoryIds },
  }).populate(["category", "additionalCategories"]);
  res.json(products);
});

// Create or update a review for a product
exports.createOrUpdateReview = catchAsync(async (req, res) => {
  const { productId, rating } = req.body;
  if (!productId || !rating) {
    return res
      .status(400)
      .json({ message: "productId and rating are required" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }
  const review = await Review.findOneAndUpdate(
    { user: req.user.id, product: productId },
    { rating },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.status(201).json(review);
});

// Get all reviews for a product (with average rating and count)
exports.getReviewsForProduct = catchAsync(async (req, res) => {
  const productId = req.params.id;
  const reviews = await Review.find({ product: productId }).populate(
    "user",
    "name",
  );
  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  res.json({
    count: reviews.length,
    average: avg,
    reviews,
  });
});
