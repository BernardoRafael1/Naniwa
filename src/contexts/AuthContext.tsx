import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getCurrentAuthSession,
  loginAuthUser,
  onAuthSessionChange,
  registerAuthUser,
  signOutAuthUser,
} from "../services/auth/authApi";
import type {
  AuthResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
} from "../services/auth/authTypes";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

type AuthProviderProps = {
  children: ReactNode;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(user && token);

  function applySession(session: AuthResponse | null) {
    setToken(session?.token ?? null);
    setUser(session?.user ?? null);
  }

  async function login(input: LoginInput) {
    const response = await loginAuthUser(input);

    applySession(response);
  }

  async function register(input: RegisterInput) {
    const response = await registerAuthUser(input);

    applySession(response);
  }

  async function logout() {
    await signOutAuthUser();

    applySession(null);
  }

  useEffect(() => {
    let isActive = true;

    async function loadInitialSession() {
      try {
        const session = await getCurrentAuthSession();

        if (isActive) {
          applySession(session);
        }
      } catch (error) {
        console.error(error);

        if (isActive) {
          applySession(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadInitialSession();

    const unsubscribe = onAuthSessionChange((session) => {
      if (isActive) {
        applySession(session);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  }

  return context;
}
