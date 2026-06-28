import type {
  AuthResponse,
  LoginInput,
  MeResponse,
  RegisterInput,
} from "./authTypes";

const AUTH_API_BASE_URL =
  import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:3333";

type AuthRequestOptions = RequestInit & {
  token?: string;
};

async function authRequest<T>(
  endpoint: string,
  options: AuthRequestOptions = {}
): Promise<T> {
  const { token, ...requestOptions } = options;

  const headers = new Headers(requestOptions.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${AUTH_API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data.message === "string"
        ? data.message
        : "Erro na requisição de autenticação.";

    throw new Error(message);
  }

  return data as T;
}

export async function registerAuthUser(
  input: RegisterInput
): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loginAuthUser(input: LoginInput): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getCurrentAuthUser(token: string): Promise<MeResponse> {
  return authRequest<MeResponse>("/auth/me", {
    method: "GET",
    token,
  });
}