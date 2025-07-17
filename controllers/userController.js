const User = require("../models/user");
const ApiError = require("../utils/ApiError");

// List all users (admin only)
exports.list = async (req, res) => {
  const users = await User.find({ status: { $ne: "deleted" } }).select(
    "-password -resetPasswordToken -resetPasswordExpires",
  );
  res.json(users);
};

// Get a single user by ID (admin only)
exports.getById = async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    status: { $ne: "deleted" },
  }).select("-password -resetPasswordToken -resetPasswordExpires");
  if (!user) throw new ApiError(404, "User not found.");
  res.json(user);
};

// Update a user by ID (admin only)
exports.update = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found.");
  const { name, email, role, address, status } = req.body;
  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (address) user.address = address;
  if (status) user.status = status;
  await user.save();
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpires;
  res.json(userObj);
};

// Delete a user by ID (admin only)
exports.remove = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found.");
  await user.deleteOne();
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpires;
  res.json({ message: "User deleted.", user: userObj });
};

// List all users with order count (admin only)
exports.listWithOrderCount = async (req, res) => {
  const User = require("../models/user");
  const Order = require("../models/order");
  const users = await User.find({ status: { $ne: "deleted" } }).select(
    "-password -resetPasswordToken -resetPasswordExpires",
  );
  const userIds = users.map((u) => u._id);
  const orderCounts = await Order.aggregate([
    { $match: { store: { $in: userIds } } },
    { $group: { _id: "$store", count: { $sum: 1 } } },
  ]);
  const countMap = {};
  orderCounts.forEach((oc) => {
    countMap[oc._id.toString()] = oc.count;
  });
  const usersWithOrderCount = users.map((u) => ({
    ...u.toObject(),
    id: u._id.toString(),
    orderCount: countMap[u._id.toString()] || 0,
  }));
  res.json(usersWithOrderCount);
};

// List all delivery users (admin only)
exports.listDelivery = async (req, res) => {
  const users = await User.find({
    role: "delivery",
    status: { $ne: "deleted" },
  }).select("-password -resetPasswordToken -resetPasswordExpires");
  res.json(users);
};
