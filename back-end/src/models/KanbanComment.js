// src/models/KanbanComment.js
import mongoose from "mongoose";

const KanbanCommentSchema = new mongoose.Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KanbanCard",
      required: true,
      index: true,
    },
    cid: { type: String, index: true }, // id ngắn (nếu muốn set từ FE)
    author: { type: String, default: "You" }, // tên hiển thị
    uid: { type: String, index: true }, // 👈 ID user ổn định để so sánh quyền
    text: { type: String, required: true },
    ts: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

KanbanCommentSchema.index({ cardId: 1, ts: -1 });

export default mongoose.model("KanbanComment", KanbanCommentSchema);
