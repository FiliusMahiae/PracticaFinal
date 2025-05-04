const { check, validationResult } = require("express-validator");
const User = require("../models/User");

// Validador principal (sólo se ejecuta si el usuario no es autónomo)
exports.validateCompanyData = [
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Si el usuario es autónomo (flag booleano), se salta la validación
      if (user.isAutonomo === true) {
        return next();
      }

      // Para el resto de usuarios, validamos los campos obligatorios:
      await check("companyName", "El nombre de la compañía es obligatorio")
        .notEmpty()
        .run(req);
      await check("cif", "El CIF es obligatorio").notEmpty().run(req);
      await check("street", "La calle es obligatoria").notEmpty().run(req);
      await check("number", "El número es obligatorio")
        .isInt()
        .toInt()
        .run(req);
      await check("postal", "El código postal es obligatorio")
        .isInt()
        .toInt()
        .run(req);
      await check("city", "La ciudad es obligatoria").notEmpty().run(req);
      await check("province", "La provincia es obligatoria")
        .notEmpty()
        .run(req);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      return next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  },
];
