/**
 * Vercel Serverless Entry Point
 *
 * This file exports the Express app as a Vercel serverless handler.
 * It handles all /api/* routes.
 *
 * Note: Static assets (JS/CSS/HTML) are served directly by Vercel CDN
 * from dist/public/ as configured in vercel.json outputDirectory.
 *
 * Prerequisites for Vercel deployment:
 * 1. Run `npm run build` to build the server
 * 2. Set env vars in Vercel dashboard: DATABASE_URL, SESSION_SECRET, OPENAI_API_KEY
 * 3. Deploy with `vercel --prod`
 *
 * Alternative deployment (recommended for full-featured apps):
 * Use Railway, Render, or Fly.io for long-running Express servers
 * with WebSocket support and larger memory limits.
 */

import express, { type Request, Response, NextFunction } from "express";
import { setupAuth } from "../server/auth";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

const app = express();

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

let initialized = false;

async function init() {
  if (initialized) return;
  initialized = true;
  await setupAuth(app);
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });
}

export default async function handler(req: Request, res: Response) {
  await init();
  app(req, res);
}
