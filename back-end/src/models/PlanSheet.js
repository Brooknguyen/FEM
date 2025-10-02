// src/models/PlanSheets.js file kế hoạch bảo dưỡng
import mongoose from "mongoose";

/** Dùng lại point r/c cho cả merge và wrap-cells */
const CellPointSchema = new mongoose.Schema(
  { r: { type: Number, required: true }, c: { type: Number, required: true } },
  { _id: false }
);

const MergeSchema = new mongoose.Schema(
  {
    s: { type: CellPointSchema, required: true }, // start
    e: { type: CellPointSchema, required: true }, // end
  },
  { _id: false }
);

const commonSheetFields = {
  sheetName: { type: String, required: true, trim: true },
  /** Ma trận dữ liệu: mảng 2D, mỗi ô là Mixed (string/number/…) */
  rows: { type: [[mongoose.Schema.Types.Mixed]], required: true },
  /** Danh sách vùng merge */
  merges: { type: [MergeSchema], default: [] },
  /** NEW: danh sách ô có wrap-text trong Excel */
  wrapCells: { type: [CellPointSchema], default: [] },

  /** Người tạo (nên thống nhất tên là createdBy) */
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
};

const modelOpts = { timestamps: true, versionKey: false };

/** Điện (Electric) */
const ElectricSheetSchema = new mongoose.Schema(commonSheetFields, modelOpts);
/** Tối ưu truy vấn "mới nhất theo tên" */
ElectricSheetSchema.index({ sheetName: 1, updatedAt: -1 });

/** Máy/thiết bị (Machine) */
const MachineSheetSchema = new mongoose.Schema(commonSheetFields, modelOpts);
MachineSheetSchema.index({ sheetName: 1, updatedAt: -1 });

/** (Tùy chọn) nếu muốn đảm bảo 1 sheetName chỉ có 1 doc (dạng upsert/overwrite) */
// ElectricSheetSchema.index({ sheetName: 1 }, { unique: true });
// MachineSheetSchema.index({ sheetName: 1 }, { unique: true });

export const ElectricSheet = mongoose.model(
  "ElectricSheet",
  ElectricSheetSchema
);
export const MachineSheet = mongoose.model("MachineSheet", MachineSheetSchema);
