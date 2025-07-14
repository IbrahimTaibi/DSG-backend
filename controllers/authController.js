const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const Joi = require("joi");
const crypto = require("crypto");
const sendEmail = require("../utils/email");

// Joi schema for registration
const registerSchema = Joi.object({
  name: Joi.string().required(),
  mobile: Joi.string().required(),
  password: Joi.string().required(),
  email: Joi.string().email().optional(),
  address: Joi.object({
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
  }).optional(),
  role: Joi.string().optional(),
});
exports.registerSchema = registerSchema;

// Register user (mobile/password)
exports.register = async (req, res) => {
  const { name, mobile, password, email, address } = req.body;
  let { role } = req.body;
  if (!role) role = "store";
  const existing = await User.findOne({ mobile });
  if (existing) {
    throw new ApiError(409, "Mobile already registered.");
  }
  const hash = await bcrypt.hash(password, 10);
  const user = new User({
    name,
    mobile,
    password: hash,
    email,
    address,
    role,
  });
  await user.save();
  // Create welcome notification
  const Notification = require("../models/notification");
  await Notification.create({
    user: user._id,
    type: "welcome",
    data: { message: "Welcome to DSG!" },
  });
  // Return all user fields except sensitive ones
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpires;
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" },
  );
  res.status(201).json({
    message: "User registered successfully.",
    token,
    user: userObj,
  });
};

// Login user (mobile/password)
exports.login = async (req, res) => {
  const { mobile, password } = req.body;
  const user = await User.findOne({ mobile });
  if (!user || !user.password) {
    throw new ApiError(401, "Invalid credentials.");
  }
  if (user.status !== "active") {
    let statusMsg = "Your account is not active. Please contact support.";
    if (user.status === "inactive")
      statusMsg = "Your account is inactive. Please contact support.";
    else if (user.status === "suspended")
      statusMsg = "Your account is suspended. Please contact support.";
    else if (user.status === "deleted")
      statusMsg = "Your account has been deleted. Please contact support.";
    throw new ApiError(403, statusMsg);
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new ApiError(401, "Invalid credentials.");
  }
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" },
  );
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpires;
  res.json({
    token,
    user: userObj,
  });
};

// Placeholder for Google authentication
exports.googleAuth = async (req, res) => {
  // To be implemented
  res
    .status(501)
    .json({ message: "Google authentication not implemented yet." });
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const { email, mobile } = req.body;
  const user = await User.findOne(email ? { email } : { mobile });
  if (!user)
    return res
      .status(200)
      .json({ message: "If the account exists, a reset email has been sent." });
  const token = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 min
  await user.save();
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}&id=${user._id}`;
  await sendEmail({
    to: user.email,
    subject: "DSG Password Reset",
    html: require("../utils/email").emailWrapper({
      title: "Password Reset Request",
      bodyHtml: `<p>Click <a href=\"${resetUrl}\">here</a> to reset your password. This link expires in 30 minutes.</p>`,
    }),
  });
  res.json({ message: "If the account exists, a reset email has been sent." });
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { id, token, password } = req.body;
  const user = await User.findById(id);
  if (
    !user ||
    user.resetPasswordToken !== token ||
    !user.resetPasswordExpires ||
    user.resetPasswordExpires < Date.now()
  ) {
    return res.status(400).json({ message: "Invalid or expired token." });
  }
  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.json({ message: "Password reset successful." });
};

// Get current user info from token
exports.me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpires;
  res.json({ user: userObj });
};

// Get all notifications for the logged-in user
exports.getNotifications = async (req, res) => {
  const Notification = require("../models/notification");
  const notifications = await Notification.find({ user: req.user.id }).sort(
    "-createdAt",
  );
  res.json({ notifications });
};

// Mark a notification as read
exports.markNotificationRead = async (req, res) => {
  const Notification = require("../models/notification");
  const { id } = req.params;
  const notification = await Notification.findOne({
    _id: id,
    user: req.user.id,
  });
  if (!notification)
    return res.status(404).json({ message: "Notification not found." });
  notification.read = true;
  await notification.save();
  res.json(notification);
};

// Mark all notifications as read
exports.markAllNotificationsRead = async (req, res) => {
  const Notification = require("../models/notification");
  await Notification.updateMany(
    { user: req.user.id, read: false },
    { $set: { read: true } },
  );
  res.json({ message: "All notifications marked as read." });
};
