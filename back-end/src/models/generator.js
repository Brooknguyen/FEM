// src/models/generator.js
import mongoose from "mongoose";

const GeneratorItemSchema = new mongoose.Schema(
  {
    date: { type: String, trim: true }, // YYYY-MM-DD
    time: { type: String, trim: true }, // HH:mm
    person: { type: String, trim: true },
    content: { type: String, trim: true },

    engineSpeed: { type: Number, default: null },
    voltageRS: { type: Number, default: null },
    voltageST: { type: Number, default: null },
    voltageTR: { type: Number, default: null },
    loadKW: { type: Number, default: null },
    loadPercent: { type: Number, default: null },
    frequency: { type: Number, default: null },
    coolantTemp: { type: Number, default: null },
    oilPressure: { type: Number, default: null },
    oilUsage: { type: Number, default: null },

    engineRuntime: { type: String, trim: true }, // "HH:mm:ss"
    note: { type: String, trim: true },
  },
  { _id: true } // cần _id để sửa/xóa từng dòng
);

const GeneratorReportSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
      unique: true,
      trim: true,
    },
    items: { type: [GeneratorItemSchema], default: [] },
  },
  { timestamps: true }
);

const GeneratorReport = mongoose.model(
  "GeneratorReport",
  GeneratorReportSchema
);
export default GeneratorReport;
