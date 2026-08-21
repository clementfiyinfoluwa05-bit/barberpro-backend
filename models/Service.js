const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  serviceName: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  duration: { type: Number, required: true, min: 1 },
  image: { type: String, default: "" },
  priceType: { type: String, enum: ["fixed", "from"], default: "fixed" }
}, { timestamps: true });

module.exports = mongoose.model("Service", serviceSchema);
