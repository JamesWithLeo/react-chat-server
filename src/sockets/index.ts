import { Server as HttpServerType } from "http";
import { Server } from "socket.io";
import { allowedOrigins } from "../config/app.config";
import { IMessage_type } from "../database/database";

interface ServerToClientEvents {
  toClientMessage: (messageData: any) => void;
}

interface ClientToServerEvents {
  joinMessage: ({ conversationId }: { conversationId: string }) => void;
  newMessage: (messageData: {
    sender_id: string;
    conversation_id: string;
    content: string;
    message_type: IMessage_type;
  }) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}

export function createSocket(httpServer: HttpServerType) {
  return new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
}
