import { Router, Request, Response, NextFunction } from "express";
import { ThreadService } from "../services/ThreadService";

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

export default router;
