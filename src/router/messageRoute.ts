import { Request, Response, Router } from "express";
import { pool } from "..";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  const conversation_id = req.params.id;

  let db;
  try {
    db = await pool.connect();
    const convoQuery = `
    SELECT message_id, sender_id, content, created_at, message_type, conversation_id FROM messages
    WHERE conversation_id = $1
    `;
    const response = await db.query(convoQuery, [conversation_id]);
    if (!response || !response.rows) {
      throw new Error("No message response");
    }
    res.status(200).json({ ok: 1, messages: response.rows });
    return;
  } catch (error) {
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

export default router;
