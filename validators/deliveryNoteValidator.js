const { body } = require("express-validator");
const validatorResults = require("../utils/handleValidator");

exports.validateDeliveryNote = [
  body("projectId", "El ID del proyecto es obligatorio").notEmpty().isMongoId(),

  body("description").optional().isString(),

  body("workEntries").optional().isArray(),
  body("workEntries.*.person", "La persona es obligatoria")
    .optional()
    .notEmpty(),
  body("workEntries.*.hours", "Las horas deben ser un número")
    .optional()
    .isFloat({ min: 0 }),

  body("materialEntries").optional().isArray(),
  body("materialEntries.*.name", "El nombre del material es obligatorio")
    .optional()
    .notEmpty(),
  body("materialEntries.*.quantity", "La cantidad debe ser numérica")
    .optional()
    .isFloat({ min: 0 }),

  validatorResults,
];
