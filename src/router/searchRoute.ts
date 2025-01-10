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
      case "people":
        const peopleScope = await QueryUsers(
          db,
          searchTerms,
          [userId],
          limit,
          offset,
        );

        res
          .status(200)
          .json({ ok: 1, users: peopleScope ?? [], chats: [], groups: [] });
        return;

      case "chats":
        const chatScope = await QueryConversation(db, userId, "all");

        res
          .status(200)
          .json({ ok: 1, users: [], chats: chatScope ?? [], groups: [] });
        return;

      case "groups":
        const groupScope = await QueryConversation(db, userId, "group");
        res
          .status(200)
          .json({ ok: 1, users: [], chats: [], group: groupScope });
        return;
      default: // all
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
            : await QueryConversation(db, userId, "all");
        const GroupAllScope = [];
        res.status(200).json({
          ok: 1,
          users: PeopleAllScope ?? [],
          chats: ChatAllScope ?? [],
          groups: [],
        });
        return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

export default router;
