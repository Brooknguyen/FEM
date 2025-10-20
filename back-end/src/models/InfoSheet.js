////InfoSheet.js

import mongoose from "mongoose";

const DeviceSchema = new mongoose.Schema(
  {
    image: String,
    name: String,
    type: String,
    model: String,
    power: String,
    voltage: String,
    capa: String,
    gas: String,
    brand: String,
    year: String,
    location: String,
    note: String,
  },
  { _id: false }
);

const InfoSheetSchema = new mongoose.Schema(
  {
    sheetName: { type: String, required: true, index: true },
    devices: { type: [DeviceSchema], default: [] },
    merged: {
      type: [{ s: { r: Number, c: Number }, e: { r: Number, c: Number } }],
      default: [],
      _id: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("InfoSheet", InfoSheetSchema);
