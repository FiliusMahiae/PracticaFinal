/*********************************************************************
 *  MODELO: User
 *  -> Representa a los usuarios del sistema (credenciales y datos perfil)
 *********************************************************************/
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");
const Schema = mongoose.Schema;

/* Campos principales de autenticación
 *   email      -> identificador único del usuario (login)
 *   password   -> hash de la contraseña
 *   status     -> estado (0 pendiente de verificación, 1 activo)
 *   role       -> rol de autorización ("user", "admin")
 *   verificationCode / attempts -> gestión del proceso de alta y bloqueo
 */
const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: Number, default: 0 },
  role: { type: String, enum: ["user", "admin", "guest"], default: "user" },
  isAutonomo: { type: Boolean, default: false },
  verificationCode: { type: String },
  attempts: { type: Number, default: 3 },

  // Datos personales
  name: { type: String, default: "" },
  surnames: { type: String, default: "" },
  nif: { type: String, default: "" },

  // Dirección particular
  address: {
    street: { type: String, default: "" },
    number: { type: Number, default: null },
    postal: { type: Number, default: null },
    city: { type: String, default: "" },
    province: { type: String, default: "" },
  },

  // Datos de la compañía (si el usuario pertenece a una empresa)
  company: {
    name: { type: String, default: "" },
    cif: { type: String, default: "" },
    street: { type: String, default: "" },
    number: { type: Number, default: null },
    postal: { type: Number, default: null },
    city: { type: String, default: "" },
    province: { type: String, default: "" },
  },

  companyOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  logo: { type: String, default: "" }, // URL del logo de la empresa/usuario
  passwordRecoveryCode: { type: String, default: "" }, // para reset de contraseña
});

// Soft‑delete -> en lugar de borrar físicamente, marca el documento.
// deletedAt añade la marca de tiempo de borrado.
UserSchema.plugin(mongooseDelete, { overrideMethods: "all", deletedAt: true });

module.exports = mongoose.model("User", UserSchema);
