// src/models/inspectionReport.js
import mongoose from "mongoose";

/** Khóa chính gộp theo ngày + STT */
export const makeInspectionId = (date, no) => `inspection|${date}|${no}`;

const InspectionSchema = new mongoose.Schema(
  {
    _id:   { type: String },                 // inspection|YYYY-MM-DD|<no>
    date:  { type: String, required: true }, // YYYY-MM-DD của bảng/ngày báo cáo
    no:    { type: Number, required: true }, // STT trong ngày

    // 5 cột FE
    name:    { type: String, default: "" },  // Tên thiết bị
    checker: { type: String, default: "" },  // Người kiểm tra
    issue:   { type: String, default: "" },  // Vấn đề tìm thấy
    // để tương thích FE (it.date || it.checkDate):
    checkDate: { type: String, default: "" } // alias cho field 'date' từng dòng
  },
  { timestamps: true, versionKey: false, collection: "report_inspection" }
);

// Tự gán _id nếu thiếu
InspectionSchema.pre("validate", function (next) {
  if (!this._id && this.date && (this.no || this.no === 0)) {
    this._id = makeInspectionId(this.date, this.no);
  }
  next();
});

// Lọc nhanh theo date + no
InspectionSchema.index({ date: 1, no: 1 }, { unique: false });

export default mongoose.models.InspectionReport
  || mongoose.model("InspectionReport", InspectionSchema);
