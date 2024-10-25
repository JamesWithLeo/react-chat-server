import { Request, Response, Router } from "express";
import {
  CheckConversation,
  CreateConversation,
  InsertMessage,
} from "../database/database";
import { pool } from "..";

const router = Router();

router.post("/:id", async (req: Request, res: Response) => {
  let db;
  const senderId = req.params.id;
  const message = req.body.message;
  const messageType = req.body.messageType;
  const recipientId = req.body.recipientId;
  try {
    db = await pool.connect();
    console.log("senderId:", senderId);
    console.log("message:", message);
    console.log("recipientId", recipientId);

    const isConvoExist = await CheckConversation(db, senderId, recipientId);
    console.log("is convo exist:", isConvoExist);
    if (!isConvoExist.conversation_id) {
      const conversation_id = await CreateConversation(
        db,
        senderId,
        recipientId,
        [],
        message,
        messageType,
      );
      res.status(200).json({ conversation_id, ok: 1, isNew: true });
      return;
    } else {
      const messageResponse = await InsertMessage(
        db,
        isConvoExist.conversation_id,
        senderId,
        message,
        messageType,
      );
      res.status(200).json({ ok: 1, isNew: false, message: messageResponse });
      return;
    }
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  let db;
  const messageId = req.params.id;
  try {
    db = await pool.connect();
    const deleteMessageQuery = `
    DELETE FROM messages
    WHERE message_id = $1
    RETURNING *;
    `;
    const response = await db.query(deleteMessageQuery, [messageId]);
    if (!response.rows[0]) {
      throw new Error("Cannot delete message.");
    }
    res.status(200).json({ ok: 1, message: response.rows[0] });
  } catch (error) {
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

export default router;
