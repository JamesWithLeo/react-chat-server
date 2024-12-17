import { Request, Response, Router } from "express";
import { pool } from "..";
import {
  getConversationId,
  createConversation,
  InsertMessage,
} from "../database/database";

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

// upsert
router.post("/:id", async (req: Request, res: Response) => {
  let db;
  const senderId = req.params.id;
  const content = req.body.message;
  const contentType = req.body.messageType;
  const recipientId = req.body.recipientId;
  try {
    db = await pool.connect();
    console.log("senderId:", senderId);
    console.log("message:", content);
    console.log("recipientId", recipientId);

    const conversationId = await getConversationId({
      db,
      senderId,
      recipientId,
    });

    console.log(
      `Sender: ${senderId} and recipient ${recipientId} with conversation id of:`,
      conversationId,
    );

    if (!conversationId) {
      const messageResponse = await createConversation({
        db,
        userId: senderId,
        peerId: [recipientId],
        initialContent: content,
        contentType,
        conversation_type: "direct",
      });
      res.status(200).json({ message: messageResponse, ok: 1, isNew: true });
      return;
    } else {
      const messageResponse = await InsertMessage(
        db,
        conversationId,
        senderId,
        content,
        contentType,
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
