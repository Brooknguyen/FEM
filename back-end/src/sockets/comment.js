// src/sockets/comment.js
import mongoose from "mongoose";
import KanbanComment from "../models/KanbanComment.js";

export function initCommentSockets(io) {
  io.on("connection", (socket) => {
    socket.on("join", ({ boardId = "default" } = {}) => {
      socket.join(`board:${boardId}`);
    });

    // ADD comment
    socket.on("comment:add", async (payload = {}, ack) => {
      try {
        const { boardId = "default", cardId, text, author, uid } = payload;
        if (!cardId || !text) {
          return ack?.({ ok: false, message: "cardId & text are required" });
        }
        const cardObjectId = new mongoose.Types.ObjectId(cardId);

        const doc = await KanbanComment.create({
          cardId: cardObjectId,
          text: String(text),
          author: author || "Guest",
          uid: uid || null, // 👈 chỉ lưu uid
          ts: new Date(),
        });

        const comment = {
          cid: doc.cid || String(doc._id),
          author: doc.author,
          uid: doc.uid,
          text: doc.text,
          ts: doc.ts,
        };

        io.to(`board:${boardId}`).emit("comment:added", {
          boardId,
          cardId,
          comment,
        });
        ack?.({ ok: true, data: comment });
      } catch (e) {
        console.error("[ws comment:add]", e);
        ack?.({ ok: false, message: "Server error" });
      }
    });

    // REMOVE comment
    // sockets/comment.js
    socket.on("comment:remove", async (payload = {}, ack) => {
      try {
        const { boardId = "default", cardId, cid, uid, isAdmin } = payload; // 👈 nhận thêm isAdmin
        if (!cardId || !cid) {
          return ack?.({ ok: false, message: "cardId & cid are required" });
        }

        const cardObjectId = new mongoose.Types.ObjectId(cardId);
        const found = await KanbanComment.findOne({
          cardId: cardObjectId,
          $or: [{ cid }, { _id: cid }],
        });
        if (!found) return ack?.({ ok: false, message: "Comment not found" });

        // ====== QUY TẮC XOÁ ======
        // - Admin: luôn được xoá
        // - User thường: chỉ xoá được comment của chính họ (uid trùng)
        // - Comment cũ không có uid: chỉ admin xoá
        const canDelete =
          isAdmin === true || (found.uid && uid && found.uid === uid);

        if (!canDelete) {
          return ack?.({ ok: false, message: "Not allowed" });
        }
        // =========================

        await KanbanComment.deleteOne({ _id: found._id });

        io.to(`board:${boardId}`).emit("comment:removed", {
          boardId,
          cardId,
          cid: found.cid || String(found._id),
        });
        ack?.({ ok: true });
      } catch (e) {
        console.error("[ws comment:remove]", e);
        ack?.({ ok: false, message: "Server error" });
      }
    });
  });
}
