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

// Usage: fetchReturn(paramName, reqKey)
module.exports.fetchReturn =
  (paramName = "id", reqKey = "return") =>
  async (req, res, next) => {
    try {
      const id = req.params[paramName];
      const Return = require("../models/return");
      const doc = await Return.findById(id);
      if (!doc) return next(new ApiError(404, `Return not found.`));
      req[reqKey] = doc;
      next();
    } catch (err) {
      next(err);
    }
  };
