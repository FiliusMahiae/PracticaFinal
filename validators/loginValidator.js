// validators/loginValidator.js
const { check } = require("express-validator");
const validatorResults = require("../utils/handleValidator");

exports.validateLogin = [
  check("email", "El email es obligatorio").notEmpty(),
  check("email", "El email debe ser válido").isEmail(),
  check("password", "La contraseña es obligatoria").notEmpty(),
  validatorResults,
];
