import { Request, Response, Router } from "express";
import { pool } from "..";
import { isValidForSignin, IsValidForSignup } from "../validation";
const router = Router();

router.post("/signin", async (req: Request, res: Response) => {
  let db;
  const { uid } = req.body;
  const isValid = isValidForSignin({ uid });

  try {
    if (!isValid) {
      res.status(400).send("contains invalid data.");
      return;
    }
    db = await pool.connect();
    const queryResponse = await db.query("SELECT * FROM users WHERE uid = $1", [
      uid,
    ]);

    if (!queryResponse.rowCount) {
      res.status(401).send("Account doesn't exist.");
      return;
    }
    const user = queryResponse.rows[0];
    res.status(200).json({ ok: 1, user });
  } catch (error) {
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

router.post("/signup", async (req: Request, res: Response) => {
  let db;
  let { email, uid, phoneNumber, photoUrl, firstName, lastName } = req.body;
  const isValid = IsValidForSignup({
    email,
    uid,
    phoneNumber,
    photoUrl,
    firstName,
    lastName,
  });
  try {
    db = await pool.connect();
    if (!isValid) {
      res.status(400).send("Contains invalid data.");
      return;
    }

    // double checking,
    // check whether the email and uid already exist .
    // The email and uid in the databse has already UNIQUE constraint.
    //  also keep in mind that the firebase auth in the client side is handling whether credential exist or not.
    const existQuery = await db.query("SELECT * FROM users WHERE uid = $1", [
      uid,
    ]);
    if (existQuery.rowCount) {
      res.status(409).send("Data already exist.");
    }
    const insertQuery = `
    INSERT INTO users (email, uid, phone_number, photo_url, first_name, last_name)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
    `;
    const queryResponse = await db.query(insertQuery, [
      email,
      uid,
      phoneNumber,
      photoUrl,
      firstName,
      lastName,
    ]);
    if (!queryResponse || !queryResponse.rows[0]) {
      res.status(500).send("Cannot insert account.");
      return;
    }
    const user = queryResponse.rows[0];
    res.status(200).json({ ok: 1, user });
  } catch (error) {
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

router.post("/setup", async (req: Request, res: Response) => {
  let db;
  const { firstName, lastName, gender, birthDate, uid } = req.body;

  try {
    console.log(firstName, lastName, gender, birthDate, uid);
    db = await pool.connect();
    const updateQuery = `
    UPDATE users
    SET first_name = $1, last_name = $2, gender = $3, birth_date = $4
    WHERE uid = $5
    RETURNING *;
    `;
    const queryResponse = await db.query(updateQuery, [
      firstName,
      lastName,
      gender,
      birthDate,
      uid,
    ]);
    console.log(queryResponse);
    if (!queryResponse || !queryResponse.rowCount) {
      res.status(401).send("Failed updating account.");
    }
    const user = queryResponse.rows[0];
    res.status(200).json({ ok: 1, user });
  } catch (error) {
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

export default router;
