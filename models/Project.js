/*********************************************************************
 *  MODELO: Project
 *  -> Información básica de un proyecto y su relación con cliente / creador
 *********************************************************************/
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");
const Schema = mongoose.Schema;

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true }, // Nombre comercial
    projectCode: { type: String, required: true }, // Código interno
    email: { type: String, required: true }, // Email de contacto
    code: { type: String, default: "" }, // Código externo

    // Dirección donde se ejecuta el proyecto
    address: {
      street: { type: String, default: "" },
      number: { type: Number, default: null },
      postal: { type: Number, default: null },
      city: { type: String, default: "" },
      province: { type: String, default: "" },
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client", // Referencia al cliente propietario
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Usuario que creó el proyecto
      required: true,
    },
    companyCif: { type: String, default: null }, // CIF de la empresa ejecutora
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

// Soft‑delete con marca de tiempo
ProjectSchema.plugin(mongooseDelete, {
  overrideMethods: "all",
  deletedAt: true,
});

module.exports = mongoose.model("Project", ProjectSchema);
