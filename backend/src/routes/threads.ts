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

/**
 * PATCH /api/threads/:id
 * Updates a thread's title.
 * Body: { title: string }
 */
router.patch(
  "/:id",
  validateThreadBody,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thread = await threadService.update(req.params.id, req.body.title.trim());
      await sseService.broadcastThreadUpdated(thread);
      res.json({ thread });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/threads/:id
 * Deletes a thread and its messages.
 */
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await threadService.delete(req.params.id);
    await sseService.broadcastThreadDeleted(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
