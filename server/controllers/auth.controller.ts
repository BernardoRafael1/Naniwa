import type { Request, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
  AuthError,
  getAuthenticatedUser,
  loginUser,
  registerUser,
} from "../services/auth.service";

function handleControllerError(error: unknown, response: Response): void {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Dados inválidos.",
      issues: error.issues,
    });
    return;
  }

  if (error instanceof AuthError) {
    response.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  console.error(error);

  response.status(500).json({
    message: "Erro interno do servidor.",
  });
}

export async function register(
  request: Request,
  response: Response
): Promise<void> {
  try {
    const result = await registerUser(request.body);

    response.status(201).json(result);
  } catch (error) {
    handleControllerError(error, response);
  }
}

export async function login(
  request: Request,
  response: Response
): Promise<void> {
  try {
    const result = await loginUser(request.body);

    response.json(result);
  } catch (error) {
    handleControllerError(error, response);
  }
}

export async function me(
  request: Request,
  response: Response
): Promise<void> {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;

    const user = await getAuthenticatedUser(authenticatedRequest.user.userId);

    response.json({
      user,
    });
  } catch (error) {
    handleControllerError(error, response);
  }
}