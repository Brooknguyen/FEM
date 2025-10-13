// sockets/comment.js
import mongoose from "mongoose";
import KanbanComment from "../models/KanbanComment.js";

export function initCommentSockets(io) {
  io.on("connection", (socket) => {
    socket.on("join", ({ boardId = "default" } = {}) => {
      socket.join(`board:${boardId}`);
    });

    socket.on("comment:add", async (payload = {}, ack) => {
      try {
        const { boardId = "default", cardId, text } = payload;
        if (!cardId || !text) {
          return ack?.({ ok: false, message: "cardId & text are required" });
        }

        // ✅ cast cardId sang ObjectId đúng với schema
        const cardObjectId = new mongoose.Types.ObjectId(cardId);

        const doc = await KanbanComment.create({
          // boardId, // nếu bạn muốn lưu theo board, mở comment này + thêm field vào schema
          cardId: cardObjectId,
          text: String(text),
          author: "Guest",
          ts: new Date(),
          sid: socket.id,
        });

        const comment = {
          cid: doc.cid || String(doc._id),
          author: doc.author,
          text: doc.text,
          ts: doc.ts,
          sid: doc.sid,
        };

        io.to(`board:${boardId}`).emit("comment:added", {
          boardId,
          cardId, // FE vẫn dùng string id — ok
          comment,
        });
        ack?.({ ok: true, data: comment });
      } catch (e) {
        console.error("[ws comment:add]", e);
        ack?.({ ok: false, message: "Server error" });
      }
    });

    socket.on("comment:remove", async (payload = {}, ack) => {
      try {
        const { boardId = "default", cardId, cid } = payload;
        if (!cardId || !cid) {
          return ack?.({ ok: false, message: "cardId & cid are required" });
        }

        const cardObjectId = new mongoose.Types.ObjectId(cardId);

        // Tìm theo cid hoặc _id
        const found = await KanbanComment.findOne({
          cardId: cardObjectId,
          $or: [{ cid }, { _id: cid }],
        });
        if (!found) return ack?.({ ok: false, message: "Comment not found" });

        // nếu muốn chặn người khác xoá:
        // if (found.sid && found.sid !== socket.id) return ack?.({ ok:false, message:"Not allowed" });

        await KanbanComment.deleteOne({ _id: found._id });

        io.to(`board:${boardId}`).emit("comment:removed", {
          boardId,
          cardId,
          cid,
        });
        ack?.({ ok: true });
      } catch (e) {
        console.error("[ws comment:remove]", e);
        ack?.({ ok: false, message: "Server error" });
      }
    });
  });
}
