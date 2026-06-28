import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getCurrentAuthUser,
  loginAuthUser,
  registerAuthUser,
} from "../services/auth/authApi";
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
} from "../services/auth/authTypes";

const AUTH_TOKEN_STORAGE_KEY = "naniwa_auth_token";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
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

  function saveAuthSession(authToken: string, authUser: AuthUser) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
    setToken(authToken);
    setUser(authUser);
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  async function login(input: LoginInput) {
    const response = await loginAuthUser(input);

    saveAuthSession(response.token, response.user);
  }

  async function register(input: RegisterInput) {
    const response = await registerAuthUser(input);

    saveAuthSession(response.token, response.user);
  }

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    const activeToken = storedToken;

    async function loadStoredSession() {
      try {
        const response = await getCurrentAuthUser(activeToken);

        saveAuthSession(activeToken, response.user);
      } catch (error) {
        console.error(error);
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredSession();
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