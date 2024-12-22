import { Request, Response, Router } from "express";
import { pool } from "..";
import {
  ArchiveConversation,
  getConversationId,
  PinnedConversation,
  QueryConversation,
} from "../database/database";

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
