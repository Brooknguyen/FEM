import mongoose from "mongoose";

const KanbanHistorySchema = new mongoose.Schema(
  {
    boardId: { type: String, index: true, default: "default" },
    title: { type: String, required: true, trim: true },
    label: { type: String, default: "" },
    due: { type: Date, default: null },
    desc: { type: String, default: "" },
    completedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, versionKey: false }
);

KanbanHistorySchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

export default mongoose.model("KanbanHistory", KanbanHistorySchema);
