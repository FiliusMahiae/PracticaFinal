// validators/emailValidator.js
const { check } = require("express-validator");
const validatorResults = require("../utils/handleValidator");

exports.validateEmailCode = [
  check("code", "El código es obligatorio").not().isEmpty(),
  check("code", "El código debe tener 6 dígitos").matches(/^\d{6}$/),
  validatorResults,
];
