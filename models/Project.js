const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");
const Schema = mongoose.Schema;

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    projectCode: { type: String, required: true },
    email: { type: String, required: true },
    code: { type: String, default: "" },
    address: {
      street: { type: String, default: "" },
      number: { type: Number, default: null },
      postal: { type: Number, default: null },
      city: { type: String, default: "" },
      province: { type: String, default: "" },
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyCif: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.plugin(mongooseDelete, {
  overrideMethods: "all",
  deletedAt: true,
});

module.exports = mongoose.model("Project", ProjectSchema);
