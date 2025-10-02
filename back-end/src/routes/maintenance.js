//Kế hoạch bảo dưỡng

import express from "express";
import { ElectricSheet, MachineSheet } from "../models/PlanSheet.js";

const router = express.Router();

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createSheetRouter(model) {
  const r = express.Router();

  // POST upsert
  r.post("/", async (req, res) => {
    try {
      const { sheetName, rows, merges } = req.body;
      if (!sheetName || !Array.isArray(rows)) {
        return res
          .status(400)
          .json({ message: "sheetName and rows are obligatory" });
      }
      const doc = await model.findOneAndUpdate(
        { sheetName },
        { sheetName, rows, merges: merges || [] },
        { upsert: true, new: true }
      );
      res
        .status(200)
        .json({ id: doc._id, message: "Saved (insert/update)", sheet: doc });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error saving data" });
    }
  });

  // GET latest document (any sheet)
  r.get("/latest", async (req, res) => {
    try {
      const doc = await model.findOne({}).sort({ updatedAt: -1 }).lean();
      if (!doc) return res.status(404).json({ message: "Can't find" });
      res.json(doc);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error querying data" });
    }
  });

  // GET latest by sheetName (ignore case + trim)
  r.get("/:sheetName/latest", async (req, res) => {
    try {
      const raw = (req.params.sheetName || "").trim();
      const doc = await model
        .findOne({ sheetName: { $regex: `^${esc(raw)}$`, $options: "i" } })
        .sort({ updatedAt: -1 })
        .lean();

      if (!doc) return res.status(404).json({ message: "Can't find" });
      res.json(doc);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error querying data" });
    }
  });

  return r;
}

router.use("/electric", createSheetRouter(ElectricSheet));
router.use("/machine", createSheetRouter(MachineSheet));

export default router;
