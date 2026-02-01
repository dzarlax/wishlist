const { body, param, validationResult } = require('express-validator');

// Helper to check validation results
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  }
  next();
};

// Validation rules
const validateGiftCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Название обязательно')
    .isLength({ min: 1, max: 200 }).withMessage('Название должно быть от 1 до 200 символов'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Описание не может превышать 1000 символов'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Категория не может превышать 100 символов'),
  body('priority')
    .optional()
    .trim()
    .isIn(['🔥 Очень хочу', '⭐ Было бы здорово', '💭 Просто мечта'])
    .withMessage('Некорректный приоритет'),
  body('link')
    .optional()
    .trim()
    .isURL({ allow_underscores: true }).withMessage('Некорректная ссылка')
    .isLength({ max: 500 }).withMessage('Ссылка не может превышать 500 символов'),
  body('image_url')
    .optional()
    .trim()
    .isURL({ allow_underscores: true }).withMessage('Некорректная ссылка на изображение')
    .isLength({ max: 500 }).withMessage('Ссылка не может превышать 500 символов'),
  body('price')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Цена не может превышать 50 символов'),
  checkValidation
];

const validateGiftUpdate = [
  param('id')
    .isInt({ min: 1 }).withMessage('Некорректный ID подарка'),
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Название не может быть пустым')
    .isLength({ min: 1, max: 200 }).withMessage('Название должно быть от 1 до 200 символов'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Описание не может превышать 1000 символов'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Категория не может превышать 100 символов'),
  body('priority')
    .optional()
    .trim()
    .isIn(['🔥 Очень хочу', '⭐ Было бы здорово', '💭 Просто мечта'])
    .withMessage('Некорректный приоритет'),
  body('link')
    .optional()
    .trim()
    .isURL({ allow_underscores: true }).withMessage('Некорректная ссылка')
    .isLength({ max: 500 }).withMessage('Ссылка не может превышать 500 символов'),
  body('image_url')
    .optional()
    .trim()
    .isURL({ allow_underscores: true }).withMessage('Некорректная ссылка на изображение')
    .isLength({ max: 500 }).withMessage('Ссылка не может превышать 500 символов'),
  body('price')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Цена не может превышать 50 символов'),
  checkValidation
];

const validateGiftId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Некорректный ID подарка'),
  checkValidation
];

const validateReserve = [
  param('id')
    .isInt({ min: 1 }).withMessage('Некорректный ID подарка'),
  body('secret_code')
    .trim()
    .notEmpty().withMessage('Секретный код обязателен')
    .isLength({ min: 3, max: 100 }).withMessage('Секретный код должен быть от 3 до 100 символов'),
  body('reserved_by')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Имя не может превышать 100 символов'),
  checkValidation
];

const validateUnreserve = [
  param('id')
    .isInt({ min: 1 }).withMessage('Некорректный ID подарка'),
  body('secret_code')
    .trim()
    .notEmpty().withMessage('Секретный код обязателен')
    .isLength({ min: 3, max: 100 }).withMessage('Секретный код должен быть от 3 до 100 символов'),
  checkValidation
];

const validatePurchased = [
  param('id')
    .isInt({ min: 1 }).withMessage('Некорректный ID подарка'),
  body('secret_code')
    .trim()
    .notEmpty().withMessage('Секретный код обязателен')
    .isLength({ min: 3, max: 100 }).withMessage('Секретный код должен быть от 3 до 100 символов'),
  checkValidation
];

module.exports = {
  validateGiftCreate,
  validateGiftUpdate,
  validateGiftId,
  validateReserve,
  validateUnreserve,
  validatePurchased,
  checkValidation
};
