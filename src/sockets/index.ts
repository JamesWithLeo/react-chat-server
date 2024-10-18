import { IncomingMessage, Server as HttpServerType, ServerResponse } from "http";
import {Server }from "socket.io"
import { allowedOrigins } from "../config/app.config";

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
}

interface ClientToServerEvents {
  hello: () => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}



export function createSocket(httpServer: HttpServerType) {

  return new Server<ClientToServerEvents, ServerToClientEvents,InterServerEvents, SocketData>(httpServer, 
    { cors: {
    origin:allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }})

}