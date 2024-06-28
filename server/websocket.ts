// ===========================================================================
// This is basically @hono/node-ws https://github.com/honojs/middleware/tree/main/packages/node-ws
// ===========================================================================

import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";

export function attachWebsocketHandler(server: ReturnType<typeof serve>) {
  const wss = new WebSocketServer({ server: server as any });

  wss.on("connection", (ws) => {
    console.log(`➕➕ Connection (${wss.clients.size})`);
    ws.once("close", () => {
      console.log(`➖➖ Connection (${wss.clients.size})`);
    });
  });
  console.log("✅ WebSocket Server listening on ws://localhost:3000");
  process.on("SIGTERM", () => {
    console.log("SIGTERM");
    wss.close();
  });
}
