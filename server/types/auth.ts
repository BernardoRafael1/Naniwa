export type TokenPayload = {
  userId: string;
  email: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};