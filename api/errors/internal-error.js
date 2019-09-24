'use strict';

module.exports = function InternalError(message, code, info) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.status = 500;
  this.message = message;
  this.code = code;
  this.info = info;
};

require('util').inherits(module.exports, Error);