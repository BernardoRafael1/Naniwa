import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase/supabaseClient";
import type {
  AuthResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
} from "./authTypes";

function mapSupabaseUser(user: User): AuthUser {
  const metadata = user.user_metadata ?? {};

  const metadataName =
    typeof metadata.name === "string" && metadata.name.trim().length > 0
      ? metadata.name
      : null;

  const fallbackName = user.email ? user.email.split("@")[0] : "Usuário";

  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  return {
    id: user.id,
    email: user.email ?? "",
    name: metadataName ?? fallbackName,
    avatarUrl,
  };
}

function mapSession(session: Session): AuthResponse {
  return {
    token: session.access_token,
    user: mapSupabaseUser(session.user),
  };
}

export async function registerAuthUser(
  input: RegisterInput
): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        name: input.name,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error(
      "Conta criada. Confirme seu email para ativar o acesso antes de entrar."
    );
  }

  return mapSession(data.session);
}

export async function loginAuthUser(input: LoginInput): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapSession(data.session);
}

export async function getCurrentAuthSession(): Promise<AuthResponse | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    return null;
  }

  return mapSession(data.session);
}

export async function signOutAuthUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export function onAuthSessionChange(
  callback: (session: AuthResponse | null) => void
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ? mapSession(session) : null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
