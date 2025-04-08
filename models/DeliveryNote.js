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

    description: { type: String, default: "" },

    workEntries: [
      {
        person: { type: String, required: true },
        hours: { type: Number, required: true },
      },
    ],

    materialEntries: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
      },
    ],

    date: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DeliveryNote", DeliveryNoteSchema);
