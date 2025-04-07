const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: Number, default: 0 },
  role: { type: String, default: "user" },
  verificationCode: { type: String },
  attempts: { type: Number, default: 3 },

  // Datos personales
  name: { type: String, default: "" },
  surnames: { type: String, default: "" },
  nif: { type: String, default: "" },

  // Dirección
  address: {
    street: { type: String, default: "" },
    number: { type: Number, default: null },
    postal: { type: Number, default: null },
    city: { type: String, default: "" },
    province: { type: String, default: "" },
  },

  // Datos de la compañía
  company: {
    name: { type: String, default: "" },
    cif: { type: String, default: "" },
    street: { type: String, default: "" },
    number: { type: Number, default: null },
    postal: { type: Number, default: null },
    city: { type: String, default: "" },
    province: { type: String, default: "" },
  },

  logo: { type: String, default: "" },
  passwordRecoveryCode: { type: String, default: "" },
});

// Se aplica el plugin para soft delete. Con { overrideMethods: "all" }
// se sobrescriben los métodos find, findOne, etc. para no devolver documentos borrados.
UserSchema.plugin(mongooseDelete, { overrideMethods: "all", deletedAt: true });

module.exports = mongoose.model("User", UserSchema);
