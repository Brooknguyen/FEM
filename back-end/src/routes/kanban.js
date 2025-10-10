// routes/kanban.js
import { Router } from "express";
import mongoose from "mongoose"; // ✅ thêm
import KanbanCard from "../models/KanbanCard.js";
import KanbanComment from "../models/KanbanComment.js";

const router = Router();

function pickCard(body = {}) {
  const out = {};
  if (body.boardId) out.boardId = String(body.boardId);
  if (body.list) out.list = String(body.list);
  if (typeof body.order === "number") out.order = body.order;
  if (body.title != null) out.title = String(body.title);
  if (body.label != null) out.label = String(body.label);
  if (body.due != null) out.due = body.due ? new Date(body.due) : null; // nhận "YYYY-MM-DD"
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
      .lean(); // => plain object

    // ✅ bảo đảm có 'id' ngay cả khi schema chưa set toJSON
    const data = cards.map((c) => ({
      ...c,
      id: c._id?.toString(),
      _id: undefined,
    }));
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
    res.status(201).json({ ok: true, data: created.toJSON() }); // ✅ có 'id'
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
      return res.status(400).json({ ok: false, message: "Invalid card id" }); // ✅ chặn sớm
    }
    const dto = pickCard(req.body);
    const updated = await KanbanCard.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });
    if (!updated)
      return res.status(404).json({ ok: false, message: "Card not found" });
    res.json({ ok: true, data: updated.toJSON() }); // ✅ có 'id'
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

export default router;
