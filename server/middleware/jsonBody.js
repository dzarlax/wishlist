const express = require('express');

function jsonBody() {
  return express.json({ inflate: false, limit: '100kb' });
}

function jsonBodyErrorHandler(error, req, res, next) {
  const errors = {
    'encoding.unsupported': [415, 'Compressed JSON requests are not supported.'],
    'entity.too.large': [413, 'JSON request is too large.'],
    'entity.parse.failed': [400, 'Invalid JSON request.']
  };
  const response = errors[error.type];
  if (!response) return next(error);
  res.status(response[0]).json({ error: response[1], code: 'JSON_BODY_REJECTED' });
}

module.exports = { jsonBody, jsonBodyErrorHandler };
