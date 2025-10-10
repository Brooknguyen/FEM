// models/KanbanCard.js
import mongoose from "mongoose";

const KanbanCardSchema = new mongoose.Schema(
  {
    boardId: { type: String, index: true, default: "default" },
    list: {
      type: String,
      enum: ["todo", "doing", "done"],
      default: "todo",
      index: true,
    },
    order: { type: Number, default: 0, index: true },
    title: { type: String, required: true, trim: true },
    label: { type: String, default: "" },
    due: { type: Date, default: null },
    desc: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

KanbanCardSchema.index({ boardId: 1, list: 1, order: 1 });

// ✅ chuẩn hóa JSON trả về
KanbanCardSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

export default mongoose.model("KanbanCard", KanbanCardSchema);
