const CompanyInfo = require("../models/companyInfo");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

// Get company info (singleton)
exports.get = catchAsync(async (req, res) => {
  const info = await CompanyInfo.findOne();
  if (!info) return res.status(404).json({ message: "Company info not set." });
  res.json(info);
});

// Update company info (admin only)
exports.update = catchAsync(async (req, res) => {
  let info = await CompanyInfo.findOne();
  if (!info) {
    info = new CompanyInfo(req.body);
  } else {
    Object.assign(info, req.body);
  }
  await info.save();
  res.json(info);
});
