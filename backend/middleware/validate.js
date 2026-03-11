const { validationResult } = require('express-validator');

/**
 * Middleware that reads express-validator results and sends a 400
 * with a structured errors array if validation failed.
 * Place this after your validation chain and before your route handler.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}

module.exports = validate;
