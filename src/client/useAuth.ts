import { useLocalStorage } from "usehooks-ts";

interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

/**
 * Hook for managing authentication state
 */
export function useAuth(): UseAuthReturn {
  const [token, setToken] = useLocalStorage<string | null>("token", null);
  const [user, setUser] = useLocalStorage<User | null>("user", null);

  const setAuth = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return {
    user,
    isAuthenticated: !!token,
    token,
    setAuth,
    logout,
  };
}

