import { Request, Response, Router } from "express";
import { pool } from "../index";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  const peerId = req.query.peerId;
  const userId = req.params.id;

  let db;
  try {
    db = await pool.connect();
    const query = `SELECT id, email, first_name, last_name, photo_url, gender, status, phone_number, birth_date, last_login FROM users WHERE id = $1 
    ;`;

    const queryResponse = await db.query(query, [peerId]);
    if (!queryResponse || !queryResponse.rows.length) {
      res.status(200).json({ ok: 0, peer: null });
      return;
    }

    res.status(200).json({ ok: 1, peer: queryResponse.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

export default router;
