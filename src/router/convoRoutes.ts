import { Request, Response, Router } from "express";
import { pool } from "..";
import { QueryConversation } from "../database/database";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  const userId = req.params.id;
  let db;
  try {
    db = await pool.connect();
    const conversation = await QueryConversation(db, userId);
    res.status(200).json({ ok: 1, conversation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

export default router;
