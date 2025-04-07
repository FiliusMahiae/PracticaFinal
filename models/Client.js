const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ClientSchema = new Schema({
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
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("Client", ClientSchema);
