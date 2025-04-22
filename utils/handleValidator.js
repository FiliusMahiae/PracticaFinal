/**
 * Middleware genérico para centralizar el manejo de resultados de las
 * validaciones definidas con express‑validator.
 *
 * - Si no hay errores en la validación → se llama a `next()` y la petición sigue.
 * - Si existen errores → responde con HTTP 422 Unprocessable Entity y un
 *   array con los mensajes generados por express‑validator.
 *
 */

const { validationResult } = require("express-validator");

// Middleware que revisa el resultado de las validaciones previas
const validatorResults = (req, res, next) => {
  try {
    // Lanza una excepción si alguna regla de validación ha fallado
    validationResult(req).throw();
    return next(); // Sin errores -> continuar con el siguiente middleware/controlador
  } catch (err) {
    // Errores de validación -> responder apropiadamente
    res.status(422); // 422 = Unprocessable Entity
    res.send({ errors: err.array() }); // Devuelve array de errores al cliente
  }
};

module.exports = validatorResults;
