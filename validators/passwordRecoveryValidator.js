const { check } = require("express-validator");
const validatorResults = require("../utils/handleValidator");

exports.validateRecoveryRequest = [
  check("email", "El email es obligatorio").notEmpty(),
  check("email", "El email debe ser válido").isEmail(),
  validatorResults,
];

exports.validatePasswordReset = [
  check("code", "El código es obligatorio").notEmpty(),
  check("code", "El código debe ser de 6 dígitos").matches(/^\d{6}$/),
  check("newPassword", "La nueva contraseña es obligatoria").notEmpty(),
  check(
    "newPassword",
    "La nueva contraseña debe tener al menos 8 caracteres"
  ).isLength({ min: 8 }),
  validatorResults,
];
