import { z } from "zod";
import { prisma } from "../db/prisma";
import { comparePassword, hashPassword } from "../utils/password";
import { generateAuthToken } from "../utils/token";
import type { AuthUser } from "../types/auth";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres."),
  email: z
    .string()
    .trim()
    .email("Email inválido.")
    .transform((email) => email.toLowerCase()),
  password: z.string().min(6, "Senha precisa ter pelo menos 6 caracteres."),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email inválido.")
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1, "Senha é obrigatória."),
});

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function mapUserToAuthUser(user: {
  id: string;
  email: string;
  profile: {
    name: string;
    avatarUrl: string | null;
  } | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.profile?.name ?? "Usuário",
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
}

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);

  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    throw new AuthError("Este email já está cadastrado.", 409);
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      profile: {
        create: {
          name: data.name,
        },
      },
    },
    include: {
      profile: true,
    },
  });

  const token = generateAuthToken({
    userId: user.id,
    email: user.email,
  });

  return {
    token,
    user: mapUserToAuthUser(user),
  };
}

export async function loginUser(input: unknown) {
  const data = loginSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw new AuthError("Email ou senha inválidos.", 401);
  }

  const passwordMatches = await comparePassword(data.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AuthError("Email ou senha inválidos.", 401);
  }

  const token = generateAuthToken({
    userId: user.id,
    email: user.email,
  });

  return {
    token,
    user: mapUserToAuthUser(user),
  };
}

export async function getAuthenticatedUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw new AuthError("Usuário não encontrado.", 404);
  }

  return mapUserToAuthUser(user);
}