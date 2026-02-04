import express from "express";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import threadRoutes from "./routes/threads";
import messageRoutes from "./routes/messages";
import { requireAuth, requireAuthFlexible } from "./middleware/auth";

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: "16kb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/threads/:id/messages", requireAuthFlexible, messageRoutes);
app.use("/api/threads", requireAuth, threadRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
