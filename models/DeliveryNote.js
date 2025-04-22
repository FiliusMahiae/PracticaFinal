/*********************************************************************
 *  MODELO: DeliveryNote
 *  -> Parte de trabajo / albarán asociado a un proyecto
 *********************************************************************/
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DeliveryNoteSchema = new Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    description: { type: String, default: "" }, // Descripción general

    // Registro de horas por persona
    workEntries: [
      {
        person: { type: String, required: true },
        hours: { type: Number, required: true },
      },
    ],

    // Materiales empleados
    materialEntries: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
      },
    ],

    date: { type: Date, default: Date.now }, // Fecha del parte
    signature: { type: String, default: "" }, // URL firma
    pdfUrl: { type: String, default: "" }, // Almacén del PDF generado
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DeliveryNote", DeliveryNoteSchema);
