const { check, body } = require("express-validator");
const validatorResults = require("../utils/handleValidator");

// Validador para crear proyecto (campos obligatorios)
exports.validateProject = [
  check("name", "El nombre del proyecto es obligatorio").notEmpty(),
  check(
    "projectCode",
    "El identificador del proyecto es obligatorio"
  ).notEmpty(),
  check("email", "El email es obligatorio")
    .notEmpty()
    .isEmail()
    .withMessage("Email inválido"),
  check("clientId", "El ID del cliente es obligatorio").notEmpty(),

  body("address.street").optional().isString(),
  body("address.number").optional().isInt().toInt(),
  body("address.postal").optional().isInt().toInt(),
  body("address.city").optional().isString(),
  body("address.province").optional().isString(),

  validatorResults,
];

// Validador para actualizar proyecto (campos opcionales)
exports.validateProjectUpdate = [
  check("name").optional().isString(),
  check("projectCode").optional().isString(),
  check("email").optional().isEmail().withMessage("Email inválido"),
  check("clientId").optional().isMongoId(),

  body("code").optional().isString(),
  body("address.street").optional().isString(),
  body("address.number").optional().isInt().toInt(),
  body("address.postal").optional().isInt().toInt(),
  body("address.city").optional().isString(),
  body("address.province").optional().isString(),

  validatorResults,
];
