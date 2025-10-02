// src/models/mainReport.js
import mongoose from "mongoose";

/** Tạo khóa chính gộp (duy nhất) theo ngày + số thứ tự */
export const makeMainId = (date, no) => `mainreport|${date}|${no}`;

const MainReportSchema = new mongoose.Schema(
  {
    _id:   { type: String },              // mainreport|YYYY-MM-DD|<no>
    date:  { type: String, required: true }, // YYYY-MM-DD của bảng/ngày báo cáo
    no:    { type: Number, required: true }, // STT trong ngày

    // Trường hiển thị trên FE
    content:    { type: String, default: "" }, // Nội dung công việc
    taskDate:   { type: String, default: "" }, // Ngày thực hiện (từng dòng)
    duration:   { type: Number, default: 0 },  // Thời gian (giờ)
    detail:     { type: String, default: "" }, // Nội dung chi tiết
    result:     { type: String, default: "" }, // OK/NG/…
    person:     { type: String, default: "" }, // Người thực hiện
    supervisor: { type: String, default: "" }, // Người giám sát
    note:       { type: String, default: "" }, // Ghi chú
  },
  { timestamps: true, versionKey: false, collection: "report_main" }
);

// Tự gán _id nếu thiếu
MainReportSchema.pre("validate", function (next) {
  if (!this._id && this.date && (this.no || this.no === 0)) {
    this._id = makeMainId(this.date, this.no);
  }
  next();
});

// Chỉ index thường để lọc theo ngày + STT
MainReportSchema.index({ date: 1, no: 1 }, { unique: false });

export default mongoose.models.MainReport ||
  mongoose.model("MainReport", MainReportSchema);
