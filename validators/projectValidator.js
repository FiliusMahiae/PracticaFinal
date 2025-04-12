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
  // Si 'name' viene en el body, que sea string y no esté vacío
  check("name")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("El nombre del proyecto no puede ser vacío"),

  // Si 'projectCode' viene en el body, que sea string y no esté vacío
  check("projectCode")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("El código del proyecto no puede ser vacío"),

  // Si 'email' viene, que no esté vacío y sea un email válido
  check("email")
    .optional()
    .notEmpty()
    .withMessage("El email no puede ser vacío")
    .isEmail()
    .withMessage("Email inválido"),

  // Si 'clientId' viene, que no esté vacío y sea un ObjectId
  check("clientId")
    .optional()
    .notEmpty()
    .withMessage("El ID del cliente no puede ser vacío")
    .isMongoId()
    .withMessage("Formato de clientId inválido"),

  // El campo 'code' es completamente opcional,
  // y no indicamos 'notEmpty()' porque puede permitirse vacío
  body("code").optional().isString(),

  // Para la dirección, normalmente puede venir vacía,
  // así que sólo exigimos que si viene, sea string o número
  body("address.street").optional().isString(),
  body("address.number").optional().isInt().toInt(),
  body("address.postal").optional().isInt().toInt(),
  body("address.city").optional().isString(),
  body("address.province").optional().isString(),

  // Este middleware maneja la respuesta 422 en caso de error de validación
  validatorResults,
];
