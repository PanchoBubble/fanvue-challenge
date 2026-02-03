import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService";
import { AppError } from "../middleware/errorHandler";

const router = Router();
const authService = new AuthService();

/**
 * POST /api/auth/register
 * Body: { username: string, password: string }
 */
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== "string" || username.trim().length < 2) {
        throw new AppError(400, "Username must be at least 2 characters");
      }
      if (!password || typeof password !== "string" || password.length < 4) {
        throw new AppError(400, "Password must be at least 4 characters");
      }

      const result = await authService.register(username.trim(), password);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/login
 * Body: { username: string, password: string }
 */
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        throw new AppError(400, "Username and password are required");
      }

      const result = await authService.login(username, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
