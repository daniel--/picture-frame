import { useLocalStorage } from "usehooks-ts";
import { useNavigate } from "react-router-dom";

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
  logoutAndRedirect: () => void;
}

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp !== "number" || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * Hook for managing authentication state
 */
export function useAuth(): UseAuthReturn {
  const [token, setToken] = useLocalStorage<string | null>("token", null);
  const [user, setUser] = useLocalStorage<User | null>("user", null);
  const navigate = useNavigate();

  const setAuth = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const logoutAndRedirect = () => {
    logout();
    navigate("/login");
  };

  return {
    user,
    isAuthenticated: isTokenValid(token),
    token,
    setAuth,
    logout,
    logoutAndRedirect,
  };
}
