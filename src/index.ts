import * as dotenv from "dotenv";
dotenv.configDotenv({ debug: true });
dotenv.config();

const port = process.env.PORT ?? 5000;
import express, { json, Request, Response } from "express";
import cors from "cors";
import initiateDbPool, {
  createConversation,
  getConversationId,
  getUserConversationId,
  InsertMessage,
} from "./database/database";
import { createServer } from "http";

import { corsOptions } from "./config/app.config";
import { createSocket } from "./sockets";

// routes
import searchRouter from "./router/searchRoute";
import peerRouter from "./router/peerRoutes";
import convoRouter from "./router/convoRoutes";
import messagesRouter from "./router/messageRoute";
import authRouter from "./router/authRoutes";

const app = express();
const httpServer = createServer(app);
const io = createSocket(httpServer);
export const pool = initiateDbPool();

io.engine.on("connection_error", (err) => {
  console.log(err.req); // the request object
  console.log(err.code); // the error code, for example 1
  console.log(err.message); // the error message, for example "Session ID unknown"
  console.log(err.context); // some additional error context
});

// connection is established between client and server .
io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);
  // Handle an event sent by the client

  socket.on("joinMessage", async (conversation) => {
    console.log("An user join conversation");
    socket.join(conversation.conversationId);
  });

  socket.on("createMessage", async (messageData) => {
    const { userId, peerId, content, content_type, conversation_type } =
      messageData;
    let db;
    try {
      db = await pool.connect();
      const messages = await createConversation({
        db,
        userId,
        peerId,
        initialContent: content,
        contentType: content_type,
        conversation_type,
      });
      console.log("new message!", messages);
    } finally {
      if (db) db.release();
    }
  });

  socket.on("insertMessage", async (messageData) => {
    const { conversation_id, content, userId, content_type } = messageData;
    let db;
    try {
      db = await pool.connect();
      // contains old conversation
      if (conversation_id) {
        const messageResponse = await InsertMessage(
          db,
          conversation_id,
          userId,
          content,
          content_type,
        );

        // send response to the room
        io.to(conversation_id).emit("toClientMessage", messageResponse);
      }
    } finally {
      if (db) db.release();
    }
  });

  socket.on("handleTyping", async (data) => {
    const { conversation_id, sender_id, isTyping } = data;
    console.log("someone is typing:", sender_id);
    io.to(conversation_id).emit("peerTyping", {
      conversation_id,
      id: sender_id,
      isTyping,
    });
  });

  socket.on("peersStatus", async (data) => {
    let db;
    try {
      db = await pool.connect();
      const { isOnline, sender_id } = data;
      console.log("someone is active!");
      const conversationRooms = await getUserConversationId({
        userId: sender_id,
        db,
      });

      socket
        .to(conversationRooms)
        .emit("peersStatus", { peers: { isOnline, id: sender_id } });
    } finally {
      if (db) db.release();
    }
  });
  // Handle disconnect event
  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

app.use(json());
app.use(cors(corsOptions));

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

app.use("/search", searchRouter);

app.use("/peer", peerRouter);

// chat and messages are combined
// app.use("/chat", chatRouter);

app.use("/convo", convoRouter);

app.use("/messages", messagesRouter);

app.use("/auth", authRouter);

httpServer.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
