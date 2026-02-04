import { Router, Request, Response, NextFunction } from "express";
import { ThreadService } from "../services/ThreadService";
import { validateThreadBody } from "../middleware/validation";
import { sseService } from "./messages";

const router = Router();
const threadService = new ThreadService();

/**
 * GET /api/threads
 * Returns list of threads, optionally filtered by title search.
 * Query: ?search=<string>
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const threads = await threadService.getAll(search);
    res.json({ threads });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/threads
 * Creates a new thread.
 * Body: { title: string }
 */
router.post(
  "/",
  validateThreadBody,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title } = req.body;
      const thread = await threadService.create(title.trim());

      // Broadcast thread creation via SSE
      await sseService.broadcastThreadCreated(thread);

      res.status(201).json({ thread });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
