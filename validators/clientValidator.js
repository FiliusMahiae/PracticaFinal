const { check, body } = require("express-validator");
const validatorResults = require("../utils/handleValidator");

exports.validateClient = [
  check("name", "El nombre es obligatorio").notEmpty(),
  check("email", "El email es obligatorio").notEmpty(),
  check("email", "Debe ser un email válido").isEmail(),

  body("address.street").optional().isString(),
  body("address.number").optional().isInt().toInt(),
  body("address.postal").optional().isInt().toInt(),
  body("address.city").optional().isString(),
  body("address.province").optional().isString(),

  validatorResults,
];

// Validador para actualización
exports.validateClientUpdate = [
  check("name").optional().isString(),
  check("email").optional().isEmail().withMessage("Debe ser un email válido"),

  body("address.street").optional().isString(),
  body("address.number").optional().isInt().toInt(),
  body("address.postal").optional().isInt().toInt(),
  body("address.city").optional().isString(),
  body("address.province").optional().isString(),

  validatorResults,
];
