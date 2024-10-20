import { Request, Response, Router } from "express";
import { CheckConversation, CreateConversation } from "../database/database";
import { pool } from "..";

const router = Router();

router.post("/:id", async (req: Request, res: Response) => {
  let db;
  const senderId = req.params.id;
  const message = req.body.message;
  const recipientId = req.body.recipientId;
  try {
    db = await pool.connect();
    const isConvoExist = await CheckConversation(db, senderId, recipientId);

    if (!isConvoExist) {
      const conversation_id = await CreateConversation(
        db,
        senderId,
        recipientId,
        [],
        message,
      );
      res.status(200).json({ conversation_id, ok: 1, isNew: true });
      return;
    } else {
      res.status(200).json({ ok: 1, isNew: false, isConvoExist });
      return;
    }
  } catch (error) {
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

export default router;
