import * as dotenv from "dotenv";
dotenv.configDotenv({ debug: true });
dotenv.config();

const port = process.env.PORT ?? 5000;
import express, { json, Request, Response } from "express";
import cors from "cors";
import initiatePool, { QueryUsers } from "./database/database";
import { isValidForSignin, IsValidForSignup } from "./validation";
import { createServer } from "http";

import { corsOptions } from "./config/app.config";
import { createSocket } from "./sockets";

// routes
import peerRouter from "./router/peerRoutes";
import chatRouter from "./router/chatRoutes";
import convoRouter from "./router/convoRoutes";
import messagesRouter from "./router/messageRoute";
import authRouter from "./router/authRoutes";

const app = express();
const httpServer = createServer(app);
const io = createSocket(httpServer);

io.engine.on("connection_error", (err) => {
  console.log(err.req); // the request object
  console.log(err.code); // the error code, for example 1
  console.log(err.message); // the error message, for example "Session ID unknown"
  console.log(err.context); // some additional error context
});

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);
  // Handle an event sent by the client
  socket.on("hello", () => {
    console.log(`Message from ${socket.id}`);

    // Broadcast message to all connected clients
  });
  // Handle disconnect event
  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

app.use(json());
app.use(cors(corsOptions));
export const pool = initiatePool();

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

app.get("/search/:id", async (req: Request, res: Response) => {
  const query = (req.query.query as string) ?? " ";
  const scope = (req.query.scope as string) ?? "all";
  const user_id = req.params.id;
  const searchTerms = query.split(" ").filter((name) => name);
  console.log(`$ ${user_id} is...`);
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
        if (!PeopleAllScope || !PeopleAllScope.rowCount) {
          res.status(200).json({ ok: 1, users: null, chats: null });
          return;
        }
        res
          .status(200)
          .json({ ok: 1, users: PeopleAllScope.rows, chats: null });
        return;

      case "people":
        const peopleScope = await QueryUsers(
          db,
          searchTerms,
          [user_id],
          limit,
          offset,
        );
        if (!peopleScope || !peopleScope.rowCount) {
          res.status(200).json({ ok: 1, user: null, chats: null });
          return;
        }
        res.status(200).json({ ok: 1, users: peopleScope.rows, chats: null });
        return;

      case "chats":
        // const people = await queryUsers(
        //   db,
        //   searchTerms,
        //   [user_id],
        //   limit,
        //   offset,
        // );
        // if (!people || !people.rowCount) {
        //   res.status(401).send("Cannot find recommendation.");
        //   return;
        // }
        res.status(200).json({ ok: 1, users: null, chats: null });
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

app.use("/peer", peerRouter);

app.use("/chat", chatRouter);

app.use("/convo", convoRouter);

app.use("/messages", messagesRouter);

app.use("/auth", authRouter);

httpServer.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
