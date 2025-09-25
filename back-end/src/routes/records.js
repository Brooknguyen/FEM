// routes/records.js
import express from "express";
import Record from "../models/Record.js";

const router = express.Router();

/* -------- helpers -------- */
function parseMonthQuery(q) {
  // Hỗ trợ ?month=YYYY-MM hoặc ?year=YYYY&month=MM
  if (q.month && /^\d{4}-\d{2}$/.test(q.month)) {
    const [y, m] = q.month.split("-").map(Number);
    return { year: y, month: m };
  }
  if (q.year && q.month) {
    const y = Number(q.year);
    const m = Number(q.month);
    if (Number.isInteger(y) && Number.isInteger(m) && m >= 1 && m <= 12) {
      return { year: y, month: m };
    }
  }
  return null;
}

function monthRangeUtc(year, month) {
  // start: YYYY-MM-01T00:00:00Z ; end: first day of next month
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end };
}

/* --------- GET /api/records?month=YYYY-MM --------- */
router.get("/", async (req, res, next) => {
  try {
    const parsed = parseMonthQuery(req.query);
    let filter = {};
    if (parsed) {
      const { start, end } = monthRangeUtc(parsed.year, parsed.month);
      filter.plannedDate = { $gte: start, $lt: end };
    }
    const rows = await Record.find(filter).sort({ plannedDate: 1, createdAt: 1 }).lean();
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

/* --------- GET /api/records/months/list --------- */
router.get("/months/list", async (_req, res, next) => {
  try {
    const months = await Record.aggregate([
      { $match: { plannedDate: { $type: "date" } } },
      {
        $project: {
          ym: {
            $dateToString: { format: "%Y-%m", date: "$plannedDate", timezone: "UTC" }
          }
        }
      },
      { $group: { _id: "$ym" } },
      { $sort: { _id: -1 } },
      { $limit: 60 } // tối đa 5 năm gần nhất
    ]);
    res.json(months.map((m) => m._id));
  } catch (e) {
    next(e);
  }
});

/* ------------------- POST /api/records ------------------- */
router.post("/", async (req, res, next) => {
  try {
    const { task, equipment, plannedDate, actualDate, note } = req.body || {};
    if (!task || !equipment || !plannedDate) {
      return res.status(400).send("task, equipment, plannedDate là bắt buộc");
    }
    const doc = await Record.create({
      task,
      equipment,
      plannedDate: new Date(plannedDate),
      actualDate: actualDate ? new Date(actualDate) : null,
      note: note || ""
    });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

/* ------------------- PUT /api/records/:id ------------------- */
router.put("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const update = { ...req.body };
    if (update.plannedDate) update.plannedDate = new Date(update.plannedDate);
    if (update.actualDate) update.actualDate = new Date(update.actualDate);

    const doc = await Record.findOneAndUpdate({ _id: id }, update, {
      new: true,
      runValidators: true
    });
    if (!doc) return res.status(404).send("Not found");
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

/* ----------------- DELETE /api/records/:id ----------------- */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const r = await Record.deleteOne({ _id: id });
    if (r.deletedCount === 0) return res.status(404).send("Not found");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
