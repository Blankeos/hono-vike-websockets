import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createMiddleware } from "@universal-middleware/express";
import express from "express";
import { createTodoHandler } from "./server/create-todo-handler";
import { vikeHandler } from "./server/vike-handler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";
const root = __dirname;
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const hmrPort = process.env.HMR_PORT
  ? parseInt(process.env.HMR_PORT, 10)
  : 24678;

interface Middleware<
  Context extends Record<string | number | symbol, unknown>,
> {
  (
    request: Request,
    context: Context,
  ): Response | void | Promise<Response> | Promise<void>;
}

export function handlerAdapter<
  Context extends Record<string | number | symbol, unknown>,
>(handler: Middleware<Context>) {
  return createMiddleware(
    async (context) => {
      const rawRequest = context.platform.request as unknown as Record<
        string,
        unknown
      >;
      rawRequest.context ??= {};
      const response = await handler(
        context.request,
        rawRequest.context as Context,
      );

      if (!response) {
        context.passThrough();
        return new Response("", {
          status: 404,
        });
      }

      return response;
    },
    {
      alwaysCallNext: false,
    },
  );
}

startServer();

import expressWs from 'express-ws';

async function startServer() {
  const app = express()
  expressWs(app);

  if (isProduction) {
    app.use(express.static(`${root}/dist/client`));
  } else {
    // Instantiate Vite's development server and integrate its middleware to our server.
    // ⚠️ We should instantiate it *only* in development. (It isn't needed in production
    // and would unnecessarily bloat our server in production.)
    const vite = await import("vite");
    const viteDevMiddleware = (
      await vite.createServer({
        root,
        server: { middlewareMode: true, hmr: { port: hmrPort } },
      })
    ).middlewares;
    app.use(viteDevMiddleware);
  }

  app.post("/api/todo/create", handlerAdapter(createTodoHandler));

  // @ts-ignore express-ws did not do global type overrides.
  app.ws('/ws', function(ws, req) {
    // @ts-ignore express-ws did not do global type overrides.
    ws.on('message', function(msg) {
      ws.send(msg + "- awesome!");
    });
 
    // @ts-ignore
    ws.on('open', function() {
      ws.send("hi carlo");
    });
  });
  
  /**
   * Vike route
   *
   * @link {@see https://vike.dev}
   **/
  app.all("*", handlerAdapter(vikeHandler));

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
