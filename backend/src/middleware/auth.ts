import { Request, Response, NextFunction } from "express";
import { AuthService, JwtPayload } from "../services/AuthService";
import { AppError } from "./errorHandler";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const authService = new AuthService();

/**
 * Middleware that requires a valid JWT Bearer token.
 * Attaches decoded user payload to req.user.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "Missing or invalid Authorization header"));
  }

  const token = header.slice(7); // Remove "Bearer "
  const payload = authService.verifyToken(token);
  req.user = payload;
  next();
}
