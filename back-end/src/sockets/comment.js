import KanbanComment from "../models/KanbanComment.js";

/**
 * WebSocket cho comment: chỉ nhận/ghi nội dung comment,
 * không trả về/không lưu toàn bộ card.
 */
export function initCommentSockets(io) {
  io.on("connection", (socket) => {
    // join theo board để broadcast gọn
    socket.on("join", ({ boardId = "default" } = {}) => {
      socket.join(`board:${boardId}`);
    });

    // thêm bình luận
    socket.on("comment:add", async (payload = {}, ack) => {
      try {
        const { boardId = "default", cardId, cid, text, author, ts } = payload;
        if (!cardId || !text) {
          return ack?.({ ok: false, message: "cardId & text are required" });
        }
        const doc = await KanbanComment.create({
          cardId,
          cid: cid || undefined,
          text: String(text),
          author: author || "You",
          ts: ts ? new Date(ts) : new Date(),
        });

        const comment = {
          cid: doc.cid || String(doc._id),
          author: doc.author,
          text: doc.text,
          ts: doc.ts,
        };

        io.to(`board:${boardId}`).emit("comment:added", { cardId, comment });
        ack?.({ ok: true, data: comment });
      } catch (e) {
        console.error("[ws comment:add]", e);
        ack?.({ ok: false, message: "Server error" });
      }
    });

    // xóa bình luận (theo cid hoặc _id)
    socket.on("comment:remove", async (payload = {}, ack) => {
      try {
        const { boardId = "default", cardId, cid } = payload;
        if (!cardId || !cid)
          return ack?.({ ok: false, message: "cardId & cid are required" });

        const removed = await KanbanComment.findOneAndDelete({
          cardId,
          $or: [{ cid }, { _id: cid }],
        });

        if (!removed) return ack?.({ ok: false, message: "Comment not found" });

        io.to(`board:${boardId}`).emit("comment:removed", { cardId, cid });
        ack?.({ ok: true });
      } catch (e) {
        console.error("[ws comment:remove]", e);
        ack?.({ ok: false, message: "Server error" });
      }
    });
  });
}
