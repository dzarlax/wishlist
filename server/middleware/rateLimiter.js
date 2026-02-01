const rateLimit = require('express-rate-limit');

// Rate limiter for admin authentication attempts
// Limits: 10 attempts per 15 minutes per IP
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Слишком много попыток авторизации. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for reservation operations
// Limits: 20 reservations per hour per IP
const reservationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Слишком много попыток бронирования. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  adminAuthLimiter,
  reservationLimiter,
};
