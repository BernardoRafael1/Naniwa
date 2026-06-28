import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../utils/token";
import type { TokenPayload } from "../types/auth";

export type AuthenticatedRequest = Request & {
  user: TokenPayload;
};

export function authMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    response.status(401).json({
      message: "Token não informado.",
    });
    return;
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    response.status(401).json({
      message: "Token inválido.",
    });
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    (request as AuthenticatedRequest).user = payload;

    next();
  } catch {
    response.status(401).json({
      message: "Sessão inválida ou expirada.",
    });
  }
}