const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");
const Schema = mongoose.Schema;

const ClientSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    address: {
      street: { type: String, default: "" },
      number: { type: Number, default: null },
      postal: { type: Number, default: null },
      city: { type: String, default: "" },
      province: { type: String, default: "" },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cif: { type: String, required: true },
  },
  {
    timestamps: true, // Crea campos createdAt y updatedAt
  }
);

// Plugin para soft delete con override de métodos y marca de tiempo
ClientSchema.plugin(mongooseDelete, {
  overrideMethods: "all",
  deletedAt: true,
});

module.exports = mongoose.model("Client", ClientSchema);
