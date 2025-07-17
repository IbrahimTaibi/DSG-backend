module.exports =
  (...roles) =>
  (req, res, next) => {
    const userRole = req.user && req.user.role;
    // If admin is allowed, support is allowed for read-only/support actions
    if (roles.includes("admin") && !roles.includes("support")) {
      roles = [...roles, "support"];
    }
    if (!userRole || !roles.includes(userRole)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions." });
    }
    next();
  };
