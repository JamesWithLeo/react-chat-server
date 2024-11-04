import * as dotenv from "dotenv";
dotenv.configDotenv({ debug: true });
dotenv.config();

const port = process.env.PORT ?? 5000;
import express, { json, Request, Response } from "express";
import cors from "cors";
import initiateDbPool from "./database/database";
import { createServer } from "http";

import { corsOptions } from "./config/app.config";
import { createSocket } from "./sockets";

// routes
import searchRouter from "./router/searchRoute";
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
export const pool = initiateDbPool();

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

app.use("/search", searchRouter);

app.use("/peer", peerRouter);

app.use("/chat", chatRouter);

app.use("/convo", convoRouter);

app.use("/messages", messagesRouter);

app.use("/auth", authRouter);

httpServer.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
