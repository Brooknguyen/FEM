// models/Record.js
import mongoose from "mongoose";

const RecordSchema = new mongoose.Schema(
  {
    task: { type: String, required: true, trim: true },
    equipment: { type: String, required: true, trim: true },
    plannedDate: { type: Date, required: true },
    actualDate: { type: Date, default: null },
    note: { type: String, default: "" },

    // các trường phục vụ lọc nhanh
    monthKey: { type: String, index: true }, // "YYYY-MM" theo plannedDate (UTC)
    year: { type: Number, index: true },
    month: { type: Number, index: true }, // 1..12
  },
  { timestamps: true }
);

// Tạo monthKey / year / month theo plannedDate (UTC)
function computeMonthFields(doc) {
  const d = new Date(doc.plannedDate);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  doc.year = y;
  doc.month = m;
  doc.monthKey = `${y}-${String(m).padStart(2, "0")}`;
}

// trước validate: luôn đồng bộ monthKey
RecordSchema.pre("validate", function (next) {
  if (this.plannedDate) computeMonthFields(this);
  next();
});

// khi update bằng findOneAndUpdate cần set lại
RecordSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  if (update.plannedDate) {
    const d = new Date(update.plannedDate);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    update.year = y;
    update.month = m;
    update.monthKey = `${y}-${String(m).padStart(2, "0")}`;
    this.setUpdate(update);
  }
  next();
});

export default mongoose.model("Record", RecordSchema);
