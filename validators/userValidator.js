const { check } = require("express-validator");
const validatorResults = require("../utils/handleValidator");

exports.validateUser = [
  check("email", "El email es obligatorio").not().isEmpty(),
  check("email", "El email debe ser válido").isEmail(),
  check("password", "La contraseña es obligatoria").not().isEmpty(),
  check("password", "La contraseña debe tener al menos 8 caracteres").isLength({
    min: 8,
  }),

  // Validación de autonomo con check en lugar de body
  check("autonomo", "El campo autonomo debe ser booleano")
    .optional()
    .isBoolean()
    .toBoolean(),

  validatorResults,
];
