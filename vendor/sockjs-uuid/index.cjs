'use strict';

const { randomUUID } = require('node:crypto');

// sockjs 0.3.24 calls only uuid.v4() without options or an output buffer.
// This is deliberately not a general-purpose replacement for the uuid package.
exports.v4 = (...args) => {
  if (args.length !== 0) {
    throw new TypeError('The SockJS UUID adapter only supports v4() without arguments');
  }
  return randomUUID();
};
