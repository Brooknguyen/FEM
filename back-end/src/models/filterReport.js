// src/models/filterReport.js
import mongoose from "mongoose";

const ReportFilterSchema = new mongoose.Schema(
  {
    // Dùng composite key làm _id: "<type>|<date>|<no>"
    _id: { type: String }, // ví dụ: "filterAHU|2025-10-01|1"

    type: { type: String, required: true }, // filterAHU, dailywork, ...
    date: { type: String, required: true }, // YYYY-MM-DD
    no: { type: Number, required: true }, // STT theo ngày

    machineName: { type: String },
    room: { type: String },
    content: { type: String },
    result: { type: String, enum: ["OK", "NG"], default: "OK" },
    personInCharge: { type: String },

    pictureBeforeUrl: { type: String, default: "" },
    pictureAfterUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

// Không cần unique index khác vì _id đã duy nhất
// Nếu trước đây có index cũ, hãy drop chúng trong DB (xem phần dưới)

export default mongoose.model("ReportFilter", ReportFilterSchema);
