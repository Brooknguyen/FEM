import mongoose from "mongoose";

const MergePointSchema = new mongoose.Schema(
  {
    r: { type: Number, required: true },
    c: { type: Number, required: true },
  },
  { _id: false }
);

const MergeSchema = new mongoose.Schema(
  {
    s: { type: MergePointSchema, required: true }, // start
    e: { type: MergePointSchema, required: true }, // end
  },
  { _id: false }
);

const commonSheetFields = {
  sheetName: { type: String, required: true, trim: true },
  rows: { type: [[mongoose.Schema.Types.Mixed]], required: true },
  merges: { type: [MergeSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
};

const TankSheetSchema = new mongoose.Schema(commonSheetFields, {
  timestamps: true,
});
TankSheetSchema.index({ sheetName: 1, createdAt: -1 });

const AirN2SheetSchema = new mongoose.Schema(commonSheetFields, {
  timestamps: true,
});
AirN2SheetSchema.index({ sheetName: 1, createdAt: -1 });

const HighPressureSheetSchema = new mongoose.Schema(commonSheetFields, {
  timestamps: true,
});
HighPressureSheetSchema.index({ sheetName: 1, createdAt: -1 });

const AhuSheetSchema = new mongoose.Schema(commonSheetFields, {
  timestamps: true,
});
AhuSheetSchema.index({ sheetName: 1, createdAt: -1 });

const WaterChillerSheetSchema = new mongoose.Schema(commonSheetFields, {
  timestamps: true,
});
WaterChillerSheetSchema.index({ sheetName: 1, createdAt: -1 });

const ExhaustFanSheetSchema = new mongoose.Schema(commonSheetFields, {
  timestamps: true,
});
ExhaustFanSheetSchema.index({ sheetName: 1, createdAt: -1 });

const ACUSheetSchema = new mongoose.Schema(commonSheetFields, {
  timestamps: true,
});
ACUSheetSchema.index({ sheetName: 1, createdAt: -1 });

// Tạo model và export
const TankSheet = mongoose.model("TankSheet", TankSheetSchema);
const AirN2Sheet = mongoose.model("AirN2Sheet", AirN2SheetSchema);
const HighPressureSheet = mongoose.model(
  "HighPressureSheet",
  HighPressureSheetSchema
);
const AhuSheet = mongoose.model("AhuSheet", AhuSheetSchema);
const WaterChillerSheet = mongoose.model(
  "WaterChillerSheet",
  WaterChillerSheetSchema
);
const ExhaustFanSheet = mongoose.model(
  "ExhaustFanSheet",
  ExhaustFanSheetSchema
);
const ACUSheet = mongoose.model("ACUSheet", ACUSheetSchema);

export {
  TankSheet,
  AirN2Sheet,
  HighPressureSheet,
  AhuSheet,
  WaterChillerSheet,
  ExhaustFanSheet,
  ACUSheet,
};
