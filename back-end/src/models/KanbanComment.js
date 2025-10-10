import mongoose from "mongoose";

const KanbanCommentSchema = new mongoose.Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KanbanCard",
      required: true,
      index: true,
    },
    // chỉ những gì cần cho 1 comment
    cid: { type: String, index: true }, // id ngắn phía FE tạo (uid)
    author: { type: String, default: "You" },
    text: { type: String, required: true },
    ts: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

KanbanCommentSchema.index({ cardId: 1, ts: -1 });

export default mongoose.model("KanbanComment", KanbanCommentSchema);
