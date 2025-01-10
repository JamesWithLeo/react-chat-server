import { Request, Response, Router } from "express";
import { pool } from "..";
import {
  ArchiveConversation,
  createConversation,
  createConversationWithMessage,
  getConversationId,
  IConversationType,
  PinnedConversation,
  QueryConversation,
} from "../database/database";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  const userId = req.params.id;
  let db;
  try {
    db = await pool.connect();
    const conversation = await QueryConversation(db, userId, "all");
    res.status(200).json({ ok: 1, conversation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});
router.get("/:id/:convo_id", async (req: Request, res: Response) => {
  const userId = req.params.id;
  const convoId = req.params.convo_id;
  let db;
  try {
    db = await pool.connect();
    const convoQuery = `
    SELECT * FROM conversation WHERE conversation_id = $1 
    `;
    const conversation = await db.query(convoQuery, [convoId]);
    res.status(200).json({ ok: 1, info: conversation.rows[0] });
  } finally {
    if (db) db.release();
  }
});
router.post("/:id", async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const peerId = req.body.members as string[];
  const conversationName = req.body.title as string;
  const conversationType = req.body.conversationType as IConversationType;
  let db;

  try {
    db = await pool.connect();
    if (conversationType !== "direct" && conversationType !== "group") {
      // invalid
    }
    const response = await createConversation({
      db,
      userId,
      peerId,
      conversationName,
      conversationType,
    });
    res.status(200).json({ ok: 1, response });
  } finally {
    if (db) db.release();
  }
});
router.post("/:id/getId", async (req: Request, res: Response) => {
  const userId = req.params.id;
  const peerId = req.body.peerId;
  let db;
  try {
    db = await pool.connect();
    const conversationId = await getConversationId({
      db,
      senderId: userId,
      recipientId: peerId,
    });
    res.status(200).json({ ok: 1, conversationId });
  } finally {
    if (db) db.release();
  }
});

router.post("/:id/pin", async (req: Request, res: Response) => {
  const userId = req.params.id;
  const conversationId = req.body.conversationId;
  const isPinned = !!req.body.isPinned;
  let db;
  try {
    db = await pool.connect();
    const response = await PinnedConversation({
      db,
      isPinned,
      userId,
      conversationId,
    });
    res
      .status(200)
      .json({ ok: 1, is_pinned: response, conversation_id: conversationId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

router.post("/:id/archive", async (req: Request, res: Response) => {
  const userId = req.params.id;
  const conversationId = req.body.conversationId;
  const isArchived = req.body.isArchived;

  let db;
  try {
    db = await pool.connect();
    const response = await ArchiveConversation({
      db,
      userId,
      conversationId,
      isArchived,
    });
    res
      .status(200)
      .json({ ok: 1, is_archived: response, conversation_id: conversationId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const userId = req.params.id;
  const conversationId = req.body.conversationId;

  let db;
  try {
    db = await pool.connect();
    res.status(200).json({ ok: 1 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});
export default router;
