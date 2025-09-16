import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers as Record<string, string>),
    });

    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = session.user;
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
      };
    }
  }
}
