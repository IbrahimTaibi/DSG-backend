const jwt = require("jsonwebtoken");
const User = require("../models/user");

module.exports = async function (req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("[AUTH] Missing or malformed Authorization header");
    return res
      .status(401)
      .json({ message: "Missing or malformed Authorization header" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      console.error(`[AUTH] No user found for token. UserID: ${decoded.id}`);
      return res.status(401).json({ message: "Invalid token: user not found" });
    }
    // Optionally log the user and role
    console.log(
      `[AUTH] Authenticated user: ${req.user._id}, role: ${req.user.role}`,
    );
    next();
  } catch (err) {
    console.error("[AUTH] JWT verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
