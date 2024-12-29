import { Request, Response, Router } from "express";
import { pool } from "../index";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  const conversationId = req.query.convoId as string;
  const userId = req.params.id;

  let db;
  try {
    db = await pool.connect();

    const query = `
SELECT 
    users.id, 
    users.first_name AS "firstName", 
    users.last_name AS "lastName", 
    users.photo_url AS "photoUrl",
    false AS "isOnline",   
    false AS "isTyping",
   jsonb_build_object(
        'messageId', last_seen.message_id,
        'seenAt', last_seen.seen_at
    ) AS "lastSeen"
FROM 
    conversation_participants
JOIN 
    users 
    ON conversation_participants.user_id = users.id
LEFT JOIN 
    last_seen 
    ON last_seen.user_id = users.id AND last_seen.conversation_id = $1 -- Join with condition
WHERE 
    conversation_participants.conversation_id = $1
    AND users.id != $2;
    ;`;

    const queryResponse = await db.query(query, [conversationId, userId]);
    if (!queryResponse || !queryResponse.rows.length) {
      res.status(200).json({ ok: 0, peer: null });
      return;
    }

    res.status(200).json({ ok: 1, peers: queryResponse.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

export default router;
