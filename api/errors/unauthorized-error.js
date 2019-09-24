'use strict';

module.exports = function UnauthorizedError(message, code) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.status = 401;
  this.message = message;
  this.code = code;
};

require('util').inherits(module.exports, Error);