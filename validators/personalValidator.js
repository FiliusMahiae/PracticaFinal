const { check, body } = require("express-validator");
const validatorResults = require("../utils/handleValidator");

exports.validatePersonalData = [
  check("nombre", "El nombre es obligatorio").notEmpty(),
  check("apellidos", "Los apellidos son obligatorios").notEmpty(),
  check("nif", "El NIF es obligatorio").notEmpty(),

  // Validaciones del objeto address
  body("address.street", "La calle es obligatoria").notEmpty(),
  body("address.number", "El número debe ser un entero").isInt().toInt(),
  body("address.postal", "El código postal debe ser un número").isInt().toInt(),
  body("address.city", "La ciudad es obligatoria").notEmpty(),
  body("address.province", "La provincia es obligatoria").notEmpty(),

  validatorResults,
];
