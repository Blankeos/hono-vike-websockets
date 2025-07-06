import { serveStatic } from "@hono/node-server/serve-static";

const isProduction = process.env.NODE_ENV === "production";

import { HttpBindings, serve } from "@hono/node-server";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { renderPage } from "vike/server";
import { ViteDevServer } from "vite";
import { attachWebsocketHandler } from "./server/websocket";

startServer();

console.log("Bun is running?", typeof Bun !== "undefined");

async function startServer() {
  const app = new Hono<{ Bindings: HttpBindings }>();

  if (isProduction) {
    // In prod, serve static files.
    app.use(
      "/*",
      serveStatic({
        root: `./dist/client/`,
      }),
    );
  } else {
    // Instantiate Vite's development server and integrate its middleware to our server.
    // ⚠️ We should instantiate it *only* in development. (It isn't needed in production
    // and would unnecessarily bloat our server in production.)
    let vite: ViteDevServer;
    const { createServer } = await import("vite");
    vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
      base: "/",
    });

    app.use(async (c, next) => {
      const viteDevMiddleware = () =>
        new Promise<void>((resolve) => {
          vite.middlewares(c.env.incoming, c.env.outgoing, () => resolve());
        });
      await viteDevMiddleware();
      await next();
    });
  }

  /**
   * Vike route
   *
   * @link {@see https://vike.dev}
   **/
  app.get(
    "*",
    // No Streaming
    async (c, next) => {
      const pageContextInit = {
        urlOriginal: c.req.url,
        request: c.req,
        response: c.res,
      };

      const pageContext = await renderPage(pageContextInit);
      const { httpResponse } = pageContext;

      if (!httpResponse) {
        return next();
      } else {
        const { headers, statusCode } = httpResponse;
        headers.forEach(([name, value]) => c.header(name, value));
        c.status(statusCode);

        const readable = httpResponse.getReadableWebStream();

        // SECTION Without Streaming
        // httpResponse.pipe() works with Node.js Streams as well as Web Streams (BUT not sure how to integrate that with Hono.)
        // return c.body(readable);
        // END SECTION Without Streaming

        // SECTION With Streaming
        return stream(c, async (stream) => {
          stream.pipe(readable);
        });
        // END SECTION Without Streaming
      }
    },
  );

  const server = serve(
    {
      fetch: app.fetch,
      port: 3000,
    },
    (info) => {
      console.log("Server running at", info.port);
    },
  );

  attachWebsocketHandler(server);
}
