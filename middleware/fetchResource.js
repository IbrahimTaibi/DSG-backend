const ApiError = require("../utils/ApiError");

// Usage: fetchResource(Model, paramName, reqKey)
module.exports = (Model, paramName, reqKey) => async (req, res, next) => {
  try {
    const id = req.params[paramName];
    const doc = await Model.findById(id);
    if (!doc) return next(new ApiError(404, `${Model.modelName} not found.`));
    req[reqKey] = doc;
    next();
  } catch (err) {
    next(err);
  }
};
