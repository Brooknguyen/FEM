// routes/kanban.js
import { Router } from "express";
import mongoose from "mongoose";
import KanbanCard from "../models/KanbanCard.js";
import KanbanComment from "../models/KanbanComment.js";
import KanbanHistory from "../models/KanbanHistory.js";

const router = Router();

/** Chỉ pick field hợp lệ để không lưu “toàn card” */
function pickCard(body = {}) {
  const out = {};
  if (body.boardId) out.boardId = String(body.boardId);
  if (body.list) out.list = String(body.list);
  if (typeof body.order === "number") out.order = body.order;
  if (body.title != null) out.title = String(body.title);
  if (body.label != null) out.label = String(body.label);
  if (body.due != null) out.due = body.due ? new Date(body.due) : null; // "YYYY-MM-DD"
  if (body.desc != null) out.desc = String(body.desc);
  return out;
}

/* -------------------- CARDS -------------------- */

// GET /api/kanban/cards?boardId=default
router.get("/cards", async (req, res) => {
  try {
    const boardId = (req.query.boardId || "default").toString();
    const cards = await KanbanCard.find({ boardId })
      .sort({ list: 1, order: 1, createdAt: 1 })
      .select("boardId list order title label due desc createdAt updatedAt")
      .lean();

    const data = cards.map((c) => {
      const { _id, ...rest } = c;
      return { ...rest, id: _id.toString() };
    });

    res.json({ ok: true, data });
  } catch (e) {
    console.error("[cards:list]", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// POST /api/kanban/cards
router.post("/cards", async (req, res) => {
  try {
    const dto = pickCard(req.body);
    if (!dto.title)
      return res.status(400).json({ ok: false, message: "title is required" });
    if (!dto.boardId) dto.boardId = "default";
    if (!dto.list) dto.list = "todo";

    // nếu không truyền order → order lớn nhất + 1
    if (dto.order == null) {
      const last = await KanbanCard.findOne({
        boardId: dto.boardId,
        list: dto.list,
      })
        .sort({ order: -1 })
        .select("order");
      dto.order = last ? last.order + 1 : 0;
    }

    const created = await KanbanCard.create(dto);
    res.status(201).json({ ok: true, data: created.toJSON() });
  } catch (e) {
    console.error("[cards:create]", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// PUT /api/kanban/cards/:id
router.put("/cards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "Invalid card id" });
    }
    const dto = pickCard(req.body);
    const updated = await KanbanCard.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });
    if (!updated)
      return res.status(404).json({ ok: false, message: "Card not found" });
    res.json({ ok: true, data: updated.toJSON() });
  } catch (e) {
    console.error("[cards:update]", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// PATCH /api/kanban/cards/:id/move
router.patch("/cards/:id/move", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "Invalid card id" });
    }
    const { list, order, boardId } = req.body || {};
    const update = {};
    if (list) update.list = String(list);
    if (typeof order === "number") update.order = order;
    if (boardId) update.boardId = String(boardId);

    const moved = await KanbanCard.findByIdAndUpdate(id, update, {
      new: true,
    }).select("boardId list order title");
    if (!moved)
      return res.status(404).json({ ok: false, message: "Card not found" });
    res.json({ ok: true, data: moved.toJSON() });
  } catch (e) {
    console.error("[cards:move]", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// DELETE /api/kanban/cards/:id
router.delete("/cards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "Invalid card id" });
    }
    const deleted = await KanbanCard.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ ok: false, message: "Card not found" });

    await KanbanComment.deleteMany({ cardId: deleted._id });
    res.json({ ok: true });
  } catch (e) {
    console.error("[cards:delete]", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

/* -------------------- HISTORY -------------------- */

// POST /api/kanban/archive-done   (chuyển tất cả thẻ 'done' sang lịch sử)
router.post("/archive-done", async (req, res) => {
  try {
    const boardId = (req.body.boardId || "default").toString();

    const doneCards = await KanbanCard.find({ boardId, list: "done" }).lean();
    if (!doneCards.length) {
      return res.json({ ok: true, moved: 0, history: [] });
    }

    const now = new Date();
    const docs = doneCards.map((c) => ({
      boardId,
      title: c.title || "",
      label: c.label || "",
      due: c.due || null,
      desc: c.desc || "",
      completedAt: now,
    }));

    const created = await KanbanHistory.insertMany(docs);
    const ids = doneCards.map((c) => c._id);
    await KanbanCard.deleteMany({ _id: { $in: ids } });

    res.json({
      ok: true,
      moved: created.length,
      history: created.map((h) => h.toJSON()),
    });
  } catch (e) {
    console.error("[history:create]", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET /api/kanban/history?boardId=default
router.get("/history", async (req, res) => {
  try {
    const boardId = (req.query.boardId || "default").toString();
    const rows = await KanbanHistory.find({ boardId })
      .sort({ completedAt: -1, createdAt: -1 })
      .lean();

    const data = rows.map((r) => {
      const { _id, ...rest } = r;
      return { ...rest, id: _id.toString() };
    });

    res.json({ ok: true, data });
  } catch (e) {
    console.error("[history:list]", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// DELETE /api/kanban/history?boardId=default   (xóa tất cả lịch sử của board)
router.delete("/history", async (req, res) => {
  try {
    const boardId = (req.query.boardId || "default").toString();
    const r = await KanbanHistory.deleteMany({ boardId });
    res.json({ ok: true, deleted: r.deletedCount });
  } catch (e) {
    console.error("[history:deleteAll]", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// DELETE /api/kanban/history/:id   (xóa 1 record lịch sử)
router.delete("/history/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "Invalid history id" });
    }
    const r = await KanbanHistory.findByIdAndDelete(id);
    if (!r) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error("[history:deleteOne]", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

//comments API
// ✅ thay toàn bộ block Comments API hiện tại bằng đoạn này

// GET /api/kanban/comments/:cardId  -> trả về danh sách comment của 1 card
router.get("/comments/:cardId", async (req, res) => {
  try {
    const { cardId } = req.params;

    // Nếu id hợp lệ: query theo ObjectId đúng schema
    // (Tuỳ chọn) nếu bạn từng lỡ lưu cardId dạng string, có thể thêm fallback như comment bên dưới
    let filter;
    if (mongoose.isValidObjectId(cardId)) {
      filter = { cardId: new mongoose.Types.ObjectId(cardId) };
    } else {
      // Fallback (tuỳ chọn) để đọc dữ liệu cũ nếu từng lưu sai kiểu
      // filter = { cardId };
      return res.status(400).json({ ok: false, message: "Invalid card id" });
    }

    const rows = await KanbanComment.find(filter)
      .sort({ ts: -1 })
      .select("cid author text ts sid")
      .lean();

    // Bổ sung cid nếu thiếu
    const data = rows.map((r) => ({ ...r, cid: r.cid || String(r._id) }));

    res.json({ ok: true, data });
  } catch (e) {
    console.error("[comments:list]", e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

export default router;
