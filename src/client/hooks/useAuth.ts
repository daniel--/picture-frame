import { useEffect } from "react";
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

/**
 * Hook for managing authentication state
 */
export function useAuth(): UseAuthReturn {
  const [token, setToken] = useLocalStorage<string | null>("token", null);
  const [user, setUser] = useLocalStorage<User | null>("user", null);
  const navigate = useNavigate();

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const logoutAndRedirect = () => {
    logout();
    navigate("/login");
  };

  const setAuth = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  // Validate token with server whenever it changes
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!cancelled && res.status === 401) {
          logoutAndRedirect();
        }
      })
      .catch(() => {
        // Network error — don't log out, could be a temporary connectivity issue
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return {
    user,
    isAuthenticated: !!token,
    token,
    setAuth,
    logout,
    logoutAndRedirect,
  };
}
