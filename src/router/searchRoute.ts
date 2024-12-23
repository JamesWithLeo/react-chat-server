import { Request, Response, Router } from "express";
import { pool } from "..";
import {
  QueryConversation,
  QueryMessage,
  QueryUsers,
} from "../database/database";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  const query = (req.query.query as string) ?? " ";
  const scope = (req.query.scope as string) ?? "all";
  const userId = req.params.id;
  const searchTerms = query.split(" ").filter((name) => name);
  console.log(`$ ${userId} is...`);
  console.log("- Searching for:", searchTerms);
  console.log("- With scope of: ", scope);

  let db;
  const limit = "20";
  const offset = "0";
  try {
    db = await pool.connect();

    switch (scope) {
      case "all":
        const PeopleAllScope = await QueryUsers(
          db,
          searchTerms,
          [],
          limit,
          offset,
        );

        const ChatAllScope =
          searchTerms && searchTerms.length
            ? await QueryMessage({
                db,
                userId,
                searchTerms: searchTerms.join(" "),
              })
            : await QueryConversation(db, userId);

        res.status(200).json({
          ok: 1,
          users: PeopleAllScope ?? null,
          chats: ChatAllScope ?? null,
        });
        return;

      case "people":
        const peopleScope = await QueryUsers(
          db,
          searchTerms,
          [userId],
          limit,
          offset,
        );
        if (!peopleScope) {
          res.status(200).json({ ok: 1, user: null, chats: null });
          return;
        }
        res.status(200).json({ ok: 1, users: peopleScope, chats: [] });
        return;

      case "chats":
        const chatScope = await QueryConversation(db, userId);

        if (!chatScope) {
          res.status(401).send("Cannot find recommendation.");
          return;
        }
        res.status(200).json({ ok: 1, users: [], chats: chatScope });
        return;
      default:
        throw new Error(
          `${scope} is invalid scope. select from ("all", "people", "chats") `,
        );
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

export default router;
