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

app.post("/signin", async (req: Request, res: Response) => {
  let client;
  try {
    const { uid } = req.body;
    const isValid = isValidForSignin({ uid });

    if (!isValid) {
      res.status(400).send("contains invalid data.");
      return;
    }
    client = await pool.connect();
    const queryResponse = await client.query(
      "SELECT * FROM users WHERE uid = $1",
      [uid],
    );
    if (!queryResponse.rowCount) {
      res.status(401).send("Account doesnt't exist.");
      return;
    }
    const user = queryResponse.rows[0];
    res.status(200).json({ ok: 1, user });
  } catch (error) {
    console.error("Error during query:", error);
    res.status(500).json();
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.post("/signup", async (req: Request, res: Response) => {
  let client;
  let { email, uid, phoneNumber, photoUrl, firstName, lastName } = req.body;

  console.log({ email, uid, phoneNumber, photoUrl, firstName, lastName });

  const isValid = IsValidForSignup({
    email,
    uid,
    phoneNumber,
    photoUrl,
    firstName,
    lastName,
  });

  try {
    client = await pool.connect();
    if (!isValid) {
      res.status(400).send("Contains invalid data.");
      return;
    }

    // double checking,
    // check whether the email and uid already exist .
    // The email and uid in the databse has already UNIQUE constraint.
    //  also keep in mind that the firebase auth in the client side is handling whether credential exist or not.
    const existQuery = await client.query(
      "SELECT * FROM users WHERE uid = $1",
      [uid],
    );
    if (existQuery.rowCount) {
      res.status(409).send("data already exist.");
    }

    const insertQuery = `
    INSERT INTO users (email, uid, phone_number, photo_url, first_name, last_name)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;`;

    const queryResponse = await client.query(insertQuery, [
      email,
      uid,
      phoneNumber,
      photoUrl,
      firstName,
      lastName,
    ]);
    const user = queryResponse.rows[0];
    console.log(user);
    res.status(200).json({ ok: 1, user });
  } catch (error) {
    console.log("Error during process:", error);
    res.status(500).json();
  } finally {
    if (client) client.release();
  }
});

app.post("/setup", async (req: Request, res: Response) => {
  let db;
  const { firstName, lastName, gender, birthDate, uid } = req.body;

  try {
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
    if (!queryResponse || queryResponse.rowCount !== 1) {
      res.status(401).send("Account account cannot find.");
    }
    const user = queryResponse.rows[0];

    console.log(user);
    res.status(200).json({ ok: 1, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: 0, error });
  } finally {
    if (db) db.release();
  }
});

app.get("/search/people/:id", async (req: Request, res: Response) => {
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

httpServer.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
