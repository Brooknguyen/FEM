import mongoose from "mongoose";

const MergePointSchema = new mongoose.Schema({
  r: { type: Number, required: true },
  c: { type: Number, required: true },
}, { _id: false });

const MergeSchema = new mongoose.Schema({
  s: { type: MergePointSchema, required: true }, // start
  e: { type: MergePointSchema, required: true }, // end
}, { _id: false });

const TankSheetSchema = new mongoose.Schema({
  sheetName: { type: String, required: true, trim: true },
  // mảng 2 chiều các ô (string/number). Dùng Mixed để linh hoạt kiểu.
  rows:   { type: [[mongoose.Schema.Types.Mixed]], required: true },
  merges: { type: [MergeSchema], default: [] },

  // tuỳ chọn: gắn user tạo/sửa nếu có auth
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

TankSheetSchema.index({ sheetName: 1, createdAt: -1 });

export default mongoose.model("TankSheet", TankSheetSchema);
